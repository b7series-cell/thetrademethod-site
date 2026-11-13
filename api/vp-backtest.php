<?php
/* =====================================================================
   api/vp-backtest.php — backtest of the Volume Profile Trading System over a
   fixed watchlist, using the rules of pine/volume-profile-system.pine at
   its default settings — the same code as js/vp-live.js — on
   regular-session Massive bars (2-minute by default; 5 and 15 too).

   Runs on the server so the API key never leaves it (same config.php as
   bars.php). Results are saved to api/cache/vp-backtest.json.

   Nightly (SiteGround → Devs → Cron Jobs), weekdays after the close:
       php /home/customer/www/<your-site>/public_html/api/vp-backtest.php
       (builds the 2, 5 and 15-minute runs in turn; --tf=5 builds just one)
   From the page (private preview token required):
       GET ?preview=T                  → the saved results
       GET ?preview=T&run=1[&fresh=1]  → rebuild a few tickers per call
   Every request takes &tf=2|5|15 (default 2). Each trade also carries 'v':
   its result under every exit option in 'exits' (target × time limit).

   Each session, from the previous regular session's profile (60 rows,
   70% value area): PC, VAH, VAL. Where the previous session closed decides
   what is in play:
     PC bounce    (closed outside the value area) price touches the PC
                  within 2 ticks from one side and confirms within 3 bars with
                  an engulfing bar, a 50%+ rejection wick or 2 bars in a row,
                  closing on the same side; stop 2 ticks past the PC
     VA reversal  (closed inside) a close outside the value area, then a
                  close back inside; stop 2 ticks past the extreme outside
     VA breakout  (always) a close beyond VAH/VAL that reaches 25% of the
                  value area's width past it, a pullback to within 15%, then a
                  close beyond the breakout's extreme (a close 25% back inside
                  resets it); stop 2 ticks past the pullback
   Entry on the signal bar's close, target 2R, at least 4 ticks of risk; one
   trade at a time, three a session; stop first if a bar touches both, from
   the next bar; flat on the session's last bar. No slippage or commissions.
   ===================================================================== */

declare(strict_types=1);

const VP_WATCHLIST = ['GOOG', 'MU', 'NVDA', 'SPCX', 'TSLA', 'AAPL', 'AMD', 'SNDK', 'QQQ',
                      'DELL', 'INTC', 'META', 'IBM', 'HOOD', 'MSFT', 'SPY'];
const VP_SESSIONS  = 90;
const VP_LOOKBACK  = 135;    // calendar days: 90 sessions + the session before the first
const VP_CHUNK     = 25;
const VP_STEP_SECS = 15;
const VP_TFS     = [2, 5, 15];   // minutes per bar; the first is the page's own and keeps the original file names
const VP_TARGETS = [['p', '2R'], [1, '1R'], [3, '3R'], [4, '4R']];   // exit options: 'p' the page rule, a number = that many R
const VP_TIMES   = [['p', 'Flat at 4:00'], [30, '30 min'], [60, '60 min'], [120, '2 hours']];   // time limit: 'p' the page rule, minutes after entry, 'c' the session's last bar

const VPO = ['rows' => 60, 'vaPct' => 0.70, 'touchTk' => 2, 'confWin' => 3, 'wickMin' => 0.5, 'runLen' => 2, 'brkPct' => 0.25, 'nearPct' => 0.15,
             'deepPct' => 0.25, 'rr' => 2.0, 'bufTk' => 2, 'minRiskTk' => 4, 'maxTrades' => 3, 'tick' => 0.01];

$CLI = PHP_SAPI === 'cli';

/* engine self-test: php vp-backtest.php --engine bars.json  → every session's trades as JSON */
if ($CLI && ($argv[1] ?? '') === '--engine') {
    $j = json_decode((string)file_get_contents($argv[2]), true);
    $TZ = new DateTimeZone('America/New_York');
    $B = [];
    foreach ($j['bars'] as $r) {
        [$d, $m] = et_parts((int)$r[0], $TZ);
        if ($m < 570 || $m >= 960) continue;
        $B[] = ['d' => $d, 'm' => $m, 'o' => (float)$r[1], 'h' => (float)$r[2], 'l' => (float)$r[3], 'c' => (float)$r[4], 'v' => (float)$r[5]];
    }
    $byDay = []; foreach ($B as $b) $byDay[$b['d']][] = $b;
    $ds = array_keys($byDay); $out = [];
    for ($i = 1; $i < count($ds); $i++) {
        $lv = vp_profile($byDay[$ds[$i - 1]]); if (!$lv) continue;
        $e = vp_engine($byDay[$ds[$i - 1]], $byDay[$ds[$i]], $lv);
        foreach ($e['trades'] as $t) $out[] = [$ds[$i], $byDay[$ds[$i]][$t['idx']]['m'], $t['setup'], $t['dir'], round($t['e'], 4), round($t['sl'], 4), round($t['tp'], 4), $byDay[$ds[$i]][$t['xi']]['m'], $t['why']];
    }
    echo json_encode($out), PHP_EOL;
    exit(0);
}

function out_json(int $code, array $data): void {
    global $CLI;
    if ($CLI) { fwrite($code >= 400 ? STDERR : STDOUT, json_encode($data) . PHP_EOL); exit($code >= 400 ? 1 : 0); }
    http_response_code($code);
    echo json_encode($data);
    exit;
}

if (!$CLI) {
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');
}

$cfgFile = __DIR__ . '/config.php';
if (!is_file($cfgFile)) out_json(503, ['error' => 'not_configured']);
$cfg = require $cfgFile;
if (!is_array($cfg) || empty($cfg['api_key']) || str_starts_with((string)$cfg['api_key'], 'PASTE_')) out_json(503, ['error' => 'not_configured']);

if (!$CLI && empty($cfg['public'])) {
    $tok = (string)($_GET['preview'] ?? '');
    $want = (string)($cfg['preview_token'] ?? '');
    if ($tok === '' || $want === '' || !hash_equals($want, $tok)) out_json(403, ['error' => 'private']);
}

$cacheDir = __DIR__ . '/cache';

$symbols = array_values(array_unique(array_map('strtoupper', (array)($cfg['vp_bt_symbols'] ?? $cfg['bt_symbols'] ?? VP_WATCHLIST))));
if (!in_array('SPY', $symbols, true)) $symbols[] = 'SPY';       // session calendar
$symbols = array_values(array_filter($symbols, fn($s) => (bool)preg_match('/^[A-Z][A-Z.]{0,5}$/', $s)));
$API_BASE = rtrim((string)($cfg['api_base'] ?? 'https://api.massive.com'), '/');   // leave unset
$TZ = new DateTimeZone('America/New_York');

/* timeframe: ?tf=5 on the web, --tf=5 on the command line (no --tf builds all of them) */
$tfArg = null;
if ($CLI) { foreach ($argv as $a) if (preg_match('/^--tf=(\d+)$/', $a, $mm)) $tfArg = (int)$mm[1]; }
else $tfArg = (int)($_GET['tf'] ?? VP_TFS[0]);
if ($tfArg !== null && !in_array($tfArg, VP_TFS, true)) out_json(400, ['error' => 'bad_timeframe']);
function tf_paths(string $cacheDir, int $tf): array {
    $sfx = $tf === VP_TFS[0] ? '' : '-' . $tf . 'm';
    return [$cacheDir . '/vp-bt' . $sfx, $cacheDir . '/vp-backtest' . $sfx . '.json'];
}

/* ---------------- read-only request: serve the saved results ---------------- */
$run = $CLI || !empty($_GET['run']);
if (!$run) {
    [$btDir, $outFile] = tf_paths($cacheDir, $tfArg);
    if (is_file($outFile)) {
        if (extension_loaded('zlib') && !ini_get('zlib.output_compression')) ob_start('ob_gzhandler');   // a few MB of JSON → a few hundred KB
        readfile($outFile); exit;
    }
    $st = read_json($btDir . '/state.json');
    out_json(404, ['error' => 'not_built', 'tf' => $tfArg, 'progress' => $st ? progress($st, $symbols, $btDir) : null]);
}

/* ---------------- build ---------------- */
@set_time_limit($CLI ? 0 : 120);
@ini_set('memory_limit', '512M');
$result = ['error' => 'nothing_built'];
foreach ($tfArg === null ? VP_TFS : [$tfArg] as $tf) {
    if ($CLI) fwrite(STDOUT, "== {$tf}-minute bars\n");
    $result = build_tf($tf);
    if ($CLI && isset($result['error'])) fwrite(STDOUT, "   skipped: {$result['error']}\n");
}
out_json(isset($result['error']) ? 409 : 200, $result);

function build_tf(int $tf): array {
    global $CLI, $cfg, $symbols, $API_BASE, $TZ, $cacheDir;
    [$btDir, $outFile] = tf_paths($cacheDir, $tf);
    if (!is_dir($btDir)) @mkdir($btDir, 0755, true);
    $lock = fopen($btDir . '/lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) return ['error' => 'busy'];


    $state = read_json($btDir . '/state.json');
    if ($CLI || !empty($_GET['fresh']) || !$state) {
        $state = ['build' => date('Ymd-His') . '-' . bin2hex(random_bytes(3)), 'started' => time(), 'complete' => false];
        write_json($btDir . '/state.json', $state);
    }
    if (!empty($state['complete'])) return ['complete' => true, 'tf' => $tf, 'progress' => progress($state, $symbols, $btDir)];

    $to   = new DateTime('now', $TZ);
    $from = (clone $to)->modify('-' . VP_LOOKBACK . ' days');
    $t0 = microtime(true);
    foreach ($symbols as $sym) {
        $f = read_json($btDir . '/' . $sym . '.json');
        if ($f && ($f['build'] ?? '') === $state['build']) continue;
        if (!$CLI && microtime(true) - $t0 > VP_STEP_SECS) break;
        $res = ['build' => $state['build'], 'sym' => $sym, 'error' => null, 'dates' => [], 'signals' => [], 'trades' => []];
        try {
            $B = vb_fetch($sym, $API_BASE, (string)$cfg['api_key'], $from, $to, $TZ, $tf);
            $res = array_merge($res, vp_trades($sym, $B, $tf));
        } catch (Throwable $e) {
            $res['error'] = $e->getMessage();
            if ($f && !empty($f['dates'])) $res = array_merge($f, ['build' => $state['build'], 'error' => $res['error'], 'stale' => true]);
        }
        write_json($btDir . '/' . $sym . '.json', $res);
        if ($CLI) fwrite(STDOUT, sprintf("%-5s %s\n", $sym, $res['error'] ?? (count($res['trades']) . ' trades, ' . count($res['signals']) . ' signals')));
    }

    $prog = progress($state, $symbols, $btDir);
    if ($prog['done'] >= $prog['total']) {
        combine($symbols, $state, $btDir, $outFile, $tf);
        $state['complete'] = true;
        write_json($btDir . '/state.json', $state);
        return ['complete' => true, 'tf' => $tf, 'progress' => $prog];
    }
    return ['complete' => false, 'tf' => $tf, 'progress' => $prog];
}


/* =====================================================================
   helpers
   ===================================================================== */

function read_json(string $f): ?array {
    if (!is_file($f)) return null;
    $j = json_decode((string)file_get_contents($f), true);
    return is_array($j) ? $j : null;
}
function write_json(string $f, array $data): void {
    $tmp = $f . '.' . getmypid() . '.tmp';
    if (@file_put_contents($tmp, json_encode($data)) !== false) @rename($tmp, $f);
}
function progress(array $state, array $symbols, string $dir): array {
    $done = 0;
    foreach ($symbols as $s) { $f = read_json($dir . '/' . $s . '.json'); if ($f && ($f['build'] ?? '') === $state['build']) $done++; }
    return ['done' => $done, 'total' => count($symbols), 'build' => $state['build']];
}
function http_get(string $url): array {
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 25, CURLOPT_CONNECTTIMEOUT => 8]);
        $body = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return [$code, $body === false ? '' : (string)$body];
    }
    $ctx = stream_context_create(['http' => ['timeout' => 25, 'ignore_errors' => true]]);
    $body = @file_get_contents($url, false, $ctx);
    $code = 0;
    foreach ($http_response_header ?? [] as $h) if (preg_match('#^HTTP/\S+\s+(\d{3})#', $h, $m)) $code = (int)$m[1];
    return [$code, $body === false ? '' : (string)$body];
}
function et_parts(int $tms, DateTimeZone $tz): array {
    static $off = [];
    $hk = intdiv($tms, 3600000);
    if (!isset($off[$hk])) $off[$hk] = $tz->getOffset(new DateTime('@' . intdiv($tms, 1000)));
    $local = intdiv($tms, 1000) + $off[$hk];
    return [gmdate('Y-m-d', $local), intdiv($local % 86400, 60)];
}

/* 2-minute regular-session bars, oldest first */
function vb_fetch(string $sym, string $base, string $key, DateTime $from, DateTime $to, DateTimeZone $tz, int $mult): array {
    $bars = [];
    $cur = clone $from;
    while ($cur <= $to) {
        $end = (clone $cur)->modify('+' . (VP_CHUNK - 1) . ' days');
        if ($end > $to) $end = clone $to;
        $next = sprintf('%s/v2/aggs/ticker/%s/range/%d/minute/%s/%s?adjusted=true&sort=asc&limit=50000&apiKey=%s',
            $base, rawurlencode($sym), $mult, $cur->format('Y-m-d'), $end->format('Y-m-d'), rawurlencode($key));
        $pages = 0;
        while ($next && $pages < 10) {
            [$code, $body] = http_get($next);
            $json = json_decode($body, true);
            if ($code !== 200 || !is_array($json)) throw new RuntimeException('upstream_' . $code);
            foreach (($json['results'] ?? []) as $r) {
                [$d, $m] = et_parts((int)$r['t'], $tz);
                if ($m < 570 || $m >= 960) continue;
                $bars[$d . sprintf('%04d', $m)] = ['d' => $d, 'm' => $m, 'o' => (float)$r['o'], 'h' => (float)$r['h'], 'l' => (float)$r['l'], 'c' => (float)$r['c'], 'v' => (float)($r['v'] ?? 0)];
            }
            $next = !empty($json['next_url']) ? $json['next_url'] . '&apiKey=' . rawurlencode($key) : null;
            $pages++;
        }
        $cur = (clone $end)->modify('+1 day');
        usleep(120000);
    }
    ksort($bars);
    return array_values($bars);
}

/* =====================================================================
   the rules — a line-for-line twin of buildProfile() / runEngine() in js/vp-live.js
   ===================================================================== */
function vp_profile(array $bars): ?array {
    $n = count($bars); $top = -INF; $bot = INF;
    foreach ($bars as $b) { if ($b['h'] > $top) $top = $b['h']; if ($b['l'] < $bot) $bot = $b['l']; }
    if (!$n || !($top > $bot)) return null;
    $rows = VPO['rows']; $rowH = ($top - $bot) / $rows; $rv = array_fill(0, $rows, 0.0);
    $noVol = true; foreach ($bars as $b) if ($b['v']) { $noVol = false; break; }
    foreach ($bars as $b) {
        $v = $noVol ? 1.0 : $b['v'];
        $r0 = min($rows - 1, max(0, (int)floor(($b['l'] - $bot) / $rowH)));
        $r1 = min($rows - 1, max(0, (int)floor(($b['h'] - $bot) / $rowH)));
        $share = $v / ($r1 - $r0 + 1);
        for ($r = $r0; $r <= $r1; $r++) $rv[$r] += $share;
    }
    $total = 0.0; foreach ($rv as $x) $total += $x;
    $poc = array_search(max($rv), $rv, true); $acc = $rv[$poc]; $up = $poc; $dn = $poc;
    while ($acc < $total * VPO['vaPct'] && ($up < $rows - 1 || $dn > 0)) {
        $vUp = $up < $rows - 1 ? $rv[$up + 1] : -1; $vDn = $dn > 0 ? $rv[$dn - 1] : -1;
        if ($vUp >= $vDn) { $up++; $acc += $vUp; } else { $dn--; $acc += $vDn; }
    }
    return ['pc' => $bot + $rowH * ($poc + 0.5), 'vah' => $bot + $rowH * ($up + 1), 'val' => $bot + $rowH * $dn];
}

function vp_engine(array $prev, array $cur, array $lv): array {
    $tk = VPO['tick']; $tol = VPO['touchTk'] * $tk; $buf = VPO['bufTk'] * $tk; $vaW = $lv['vah'] - $lv['val'];
    $lastPrev = $prev[count($prev) - 1]['c'];
    $prior = $lastPrev > $lv['vah'] ? 1 : ($lastPrev < $lv['val'] ? -1 : 0);
    $all = array_merge($prev, $cur); $off = count($prev);
    $st = ['pcSide' => $lastPrev > $lv['pc'] ? 1 : ($lastPrev < $lv['pc'] ? -1 : 0), 's1Dir' => 0, 's1Bar' => 0, 's1Ext' => 0.0,
           's2Out' => 0, 's2Ext' => 0.0, 'bState' => 0, 'bPeak' => 0.0, 'bPb' => 0.0, 'sState' => 0, 'sTrough' => 0.0, 'sPb' => 0.0];
    $trades = []; $active = null; $signals = [];
    $n = count($cur);
    for ($i = 0; $i < $n; $i++) {
        $b = $cur[$i]; $j = $off + $i; $p = $all[$j - 1];
        $green = $b['c'] > $b['o']; $red = $b['c'] < $b['o']; $rng = $b['h'] - $b['l'];
        $engBull = $green && $p['c'] < $p['o'] && $b['c'] >= $p['o'] && $b['o'] <= $p['c'];
        $engBear = $red && $p['c'] > $p['o'] && $b['c'] <= $p['o'] && $b['o'] >= $p['c'];
        $lowWick = min($b['o'], $b['c']) - $b['l']; $upWick = $b['h'] - max($b['o'], $b['c']);
        $runBull = true; $runBear = true;
        for ($k = 0; $k < VPO['runLen']; $k++) { $q = $all[$j - $k] ?? null; if (!$q || !($q['c'] > $q['o'])) $runBull = false; if (!$q || !($q['c'] < $q['o'])) $runBear = false; }

        /* manage the open trade (same bar: stop assumed first) */
        if ($active !== null && $i > $trades[$active]['idx']) {
            $t = &$trades[$active];
            $hitSL = $t['dir'] === 1 ? $b['l'] <= $t['sl'] : $b['h'] >= $t['sl'];
            $hitTP = $t['dir'] === 1 ? $b['h'] >= $t['tp'] : $b['l'] <= $t['tp'];
            if ($hitSL || $hitTP) { $t['x'] = $hitSL ? $t['sl'] : $t['tp']; $t['xi'] = $i; $t['why'] = $hitSL ? 'stop' : 'target'; $active = null; }
            unset($t);
        }
        $sig = ''; $sDir = 0; $sStop = null;

        /* setup 1 · PC bounce */
        if ($prior !== 0) {
            $touched = $b['l'] <= $lv['pc'] + $tol && $b['h'] >= $lv['pc'] - $tol;
            if ($st['s1Dir'] === 0 && $touched && $st['pcSide'] !== 0) {
                $st['s1Dir'] = $st['pcSide']; $st['s1Bar'] = $i; $st['s1Ext'] = $st['pcSide'] === 1 ? $b['l'] : $b['h'];
            } elseif ($st['s1Dir'] !== 0) {
                $st['s1Ext'] = $st['s1Dir'] === 1 ? min($st['s1Ext'], $b['l']) : max($st['s1Ext'], $b['h']);
            }
            if ($st['s1Dir'] === 1) {
                $confL = $b['c'] > $lv['pc'] && ($engBull || ($rng > 0 && $b['l'] <= $lv['pc'] + $tol && $lowWick >= VPO['wickMin'] * $rng) || $runBull);
                if ($confL) { if (!$sDir) { $sig = 'p'; $sDir = 1; $sStop = $lv['pc'] - $buf; } $st['s1Dir'] = 0; }
                elseif ($b['c'] < $lv['pc'] - $tol || $i - $st['s1Bar'] >= VPO['confWin'] - 1) $st['s1Dir'] = 0;
            } elseif ($st['s1Dir'] === -1) {
                $confS = $b['c'] < $lv['pc'] && ($engBear || ($rng > 0 && $b['h'] >= $lv['pc'] - $tol && $upWick >= VPO['wickMin'] * $rng) || $runBear);
                if ($confS) { if (!$sDir) { $sig = 'p'; $sDir = -1; $sStop = $lv['pc'] + $buf; } $st['s1Dir'] = 0; }
                elseif ($b['c'] > $lv['pc'] + $tol || $i - $st['s1Bar'] >= VPO['confWin'] - 1) $st['s1Dir'] = 0;
            }
        }
        if ($b['c'] > $lv['pc'] + $tol) $st['pcSide'] = 1; elseif ($b['c'] < $lv['pc'] - $tol) $st['pcSide'] = -1;

        /* setup 2 · VA reversal */
        if ($prior === 0) {
            $outUp = $b['c'] > $lv['vah']; $outDn = $b['c'] < $lv['val'];
            if ($st['s2Out'] === 0) {
                if ($outDn) { $st['s2Out'] = -1; $st['s2Ext'] = $b['l']; } elseif ($outUp) { $st['s2Out'] = 1; $st['s2Ext'] = $b['h']; }
            } elseif ($st['s2Out'] === -1) {
                $st['s2Ext'] = min($st['s2Ext'], $b['l']);
                if ($b['c'] > $lv['val'] && $b['c'] < $lv['vah']) { if (!$sDir) { $sig = 'r'; $sDir = 1; $sStop = $st['s2Ext'] - $buf; } $st['s2Out'] = 0; }
                elseif ($b['c'] > $lv['vah']) { $st['s2Out'] = 1; $st['s2Ext'] = $b['h']; }
            } else {
                $st['s2Ext'] = max($st['s2Ext'], $b['h']);
                if ($b['c'] < $lv['vah'] && $b['c'] > $lv['val']) { if (!$sDir) { $sig = 'r'; $sDir = -1; $sStop = $st['s2Ext'] + $buf; } $st['s2Out'] = 0; }
                elseif ($b['c'] < $lv['val']) { $st['s2Out'] = -1; $st['s2Ext'] = $b['l']; }
            }
        }

        /* setup 3 · VA breakout */
        if ($vaW > 0) {
            $brkD = VPO['brkPct'] * $vaW; $nearD = VPO['nearPct'] * $vaW; $deepD = VPO['deepPct'] * $vaW;
            if ($st['bState'] === 0) {
                if ($b['c'] > $lv['vah'] && $b['h'] >= $lv['vah'] + $brkD) { $st['bState'] = 1; $st['bPeak'] = $b['h']; }
            } elseif ($st['bState'] === 1) {
                $st['bPeak'] = max($st['bPeak'], $b['h']);
                if ($b['c'] < $lv['vah'] - $deepD) $st['bState'] = 0;
                elseif ($b['l'] <= $lv['vah'] + $nearD) { $st['bState'] = 2; $st['bPb'] = $b['l']; }
            } else {
                if ($b['c'] < $lv['vah'] - $deepD) $st['bState'] = 0;
                elseif ($b['c'] > $st['bPeak']) { if (!$sDir) { $sig = 'b'; $sDir = 1; $sStop = min($st['bPb'], $b['l']) - $buf; } $st['bState'] = 0; }
                else $st['bPb'] = min($st['bPb'], $b['l']);
            }
            if ($st['sState'] === 0) {
                if ($b['c'] < $lv['val'] && $b['l'] <= $lv['val'] - $brkD) { $st['sState'] = 1; $st['sTrough'] = $b['l']; }
            } elseif ($st['sState'] === 1) {
                $st['sTrough'] = min($st['sTrough'], $b['l']);
                if ($b['c'] > $lv['val'] + $deepD) $st['sState'] = 0;
                elseif ($b['h'] >= $lv['val'] - $nearD) { $st['sState'] = 2; $st['sPb'] = $b['h']; }
            } else {
                if ($b['c'] > $lv['val'] + $deepD) $st['sState'] = 0;
                elseif ($b['c'] < $st['sTrough']) { if (!$sDir) { $sig = 'b'; $sDir = -1; $sStop = max($st['sPb'], $b['h']) + $buf; } $st['sState'] = 0; }
                else $st['sPb'] = max($st['sPb'], $b['h']);
            }
        }

        /* entry: one trade at a time, capped per session */
        if ($sDir) {
            $code = 'T';
            if ($active !== null) $code = 'a';
            elseif (count($trades) >= VPO['maxTrades']) $code = 'm';
            else {
                $e = $b['c']; $risk = abs($e - $sStop);
                $okSide = ($sDir === 1 && $sStop < $e) || ($sDir === -1 && $sStop > $e);
                if ($okSide && $risk >= VPO['minRiskTk'] * $tk) {
                    $trades[] = ['setup' => $sig, 'dir' => $sDir, 'e' => $e, 'sl' => $sStop, 'tp' => $e + $sDir * VPO['rr'] * $risk, 'idx' => $i, 'x' => null, 'xi' => null, 'why' => null];
                    $active = count($trades) - 1;
                } else $code = 'k';
            }
            $signals[] = [$b['m'], $sig, $sDir === 1 ? 'L' : 'S', $code];
        }
    }
    /* the regular session is over: flatten at the last close */
    if ($active !== null) { $trades[$active]['x'] = $cur[$n - 1]['c']; $trades[$active]['xi'] = $n - 1; $trades[$active]['why'] = 'time'; }
    return ['prior' => $prior, 'trades' => $trades, 'signals' => $signals];
}

function vp_trades(string $sym, array $B, int $mult = 2): array {
    $dates = array_values(array_unique(array_column($B, 'd')));
    $byDay = []; foreach ($B as $b) $byDay[$b['d']][] = $b;
    $ds = array_keys($byDay); $signals = []; $trades = []; $days = [];
    for ($di = 1; $di < count($ds); $di++) {
        $prev = $byDay[$ds[$di - 1]]; $cur = $byDay[$ds[$di]]; $d = $ds[$di]; $n = count($cur);
        $lv = vp_profile($prev);
        if (!$lv || $n < 2) continue;
        $eng = vp_engine($prev, $cur, $lv);
        $days[] = [$d, $eng['prior'], round($lv['pc'], 4), round($lv['vah'], 4), round($lv['val'], 4)];
        foreach ($eng['signals'] as $g) $signals[] = [$d, $g[0], $g[1], $g[2], $g[3]];
        foreach ($eng['trades'] as $t) {
            $long = $t['dir'] === 1; $R = abs($t['e'] - $t['sl']);
            $walk = function (float $Tx, ?int $cap) use ($cur, $n, $t, $long, $mult) {
                for ($q = $t['idx'] + 1; $q < $n; $q++) {
                    $b = $cur[$q];
                    if ($long ? $b['l'] <= $t['sl'] : $b['h'] >= $t['sl']) return [$q, $t['sl'], 'stop'];
                    if ($long ? $b['h'] >= $Tx : $b['l'] <= $Tx) return [$q, $Tx, 'target'];
                    if ($cap !== null && $b['m'] + $mult >= $cap) return [$q, $b['c'], 'time'];
                }
                return [$n - 1, $cur[$n - 1]['c'], 'time'];
            };
            $eEnd = $cur[$t['idx']]['m'] + $mult;                  // filled on the signal bar's close
            $v = [];
            foreach (VP_TARGETS as $o) {
                $Tx = $o[0] === 'p' ? $t['tp'] : ($long ? $t['e'] + $o[0] * $R : $t['e'] - $o[0] * $R);
                foreach (VP_TIMES as $tm) {
                    [$q, $x, $why] = $walk($Tx, $tm[0] === 'p' ? null : $eEnd + $tm[0]);
                    $v[] = [round(($long ? $x - $t['e'] : $t['e'] - $x) / $R, 3), $why, $cur[$q]['m'], round($x, 4)];
                }
            }
            $trades[] = [
                'd' => $d, 'sym' => $sym, 'side' => $long ? 'L' : 'S', 'set' => $t['setup'], 'm' => $cur[$t['idx']]['m'],
                'e' => round($t['e'], 4), 'sl' => round($t['sl'], 4), 'tp' => round($t['tp'], 4),
                'pc' => round($lv['pc'], 4), 'vah' => round($lv['vah'], 4), 'val' => round($lv['val'], 4),
                'x' => round($t['x'], 4), 'xm' => $cur[$t['xi']]['m'], 'why' => $t['why'],
                'r' => round(($long ? $t['x'] - $t['e'] : $t['e'] - $t['x']) / $R, 3), 'rp' => round($R / $t['e'] * 100, 3), 'v' => $v,
            ];
        }
    }
    return ['dates' => $dates, 'signals' => $signals, 'trades' => $trades];
}

function combine(array $symbols, array $state, string $dir, string $outFile, int $tf): void {
    $files = [];
    foreach ($symbols as $s) $files[$s] = read_json($dir . '/' . $s . '.json') ?? ['error' => 'missing', 'dates' => [], 'signals' => [], 'trades' => []];
    $cal = $files['SPY']['dates'] ?? [];
    if (!$cal) { foreach ($files as $f) $cal = array_merge($cal, $f['dates'] ?? []); $cal = array_values(array_unique($cal)); sort($cal); }
    $sessions = array_slice($cal, -VP_SESSIONS);
    $inWin = array_flip($sessions);
    $cover = []; $signals = []; $trades = []; $missing = [];
    foreach ($symbols as $s) {
        $f = $files[$s];
        if (!empty($f['error'])) $missing[] = ['sym' => $s, 'error' => $f['error'], 'stale' => !empty($f['stale'])];
        $have = array_flip($f['dates'] ?? []);
        $row = '';
        foreach ($sessions as $d) $row .= isset($have[$d]) ? '1' : '0';
        $cover[$s] = $row;
        foreach ($f['signals'] ?? [] as $g) if (isset($inWin[$g[0]])) $signals[] = [$s, $g[0], $g[1], $g[2], $g[3], $g[4]];
        foreach ($f['trades'] ?? [] as $t) if (isset($inWin[$t['d']])) $trades[] = $t;
    }
    usort($trades, fn($a, $b) => [$a['d'], $a['m'], $a['sym']] <=> [$b['d'], $b['m'], $b['sym']]);
    /* compact the exit options: R to 0.01, prices to the cent, one-letter reasons */
    $code = ['target' => 't', 'stop' => 's', 'time' => 'm', 'replaced' => 'r', 'open' => 'o', 'pmh' => 'p', 'ema' => 'e', 'be' => 'b', 't2' => '2'];
    foreach ($trades as &$tr) foreach ($tr['v'] ?? [] as $q => $vv) $tr['v'][$q] = [round($vv[0], 2), $code[$vv[1]] ?? $vv[1], $vv[2], round($vv[3], 2)];
    unset($tr);
    write_json($outFile, [
        'version'  => 2,
        'tf'       => $tf,
        'exits'    => ['targets' => VP_TARGETS, 'times' => VP_TIMES],   // v[target * count(times) + time] on each trade: [r, t target · s stop · m time · r replaced · o open · p PMH · e EMA · b breakeven · 2 target 2, exit, price]
        'built'    => time(),
        'build'    => $state['build'],
        'symbols'  => $symbols,
        'sessions' => $sessions,
        'cover'    => $cover,      // one character per session: 1 data, 0 none
        'signals'  => $signals,    // [sym, date, minute, p PC bounce · r VA reversal · b VA breakout, L|S, T traded · a in a trade · m three already · k stop on the wrong side or under 4 ticks]
        'trades'   => $trades,
        'missing'  => $missing,
    ]);
}
