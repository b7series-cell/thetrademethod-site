<?php
/* =====================================================================
   api/crt-backtest.php — backtest of the Three-Candle CRT model (New York
   AM) over a fixed watchlist, using the rules of pine/three-candle-crt.pine
   at its default settings — the same code as js/crt-live.js — on
   regular-session Massive bars (1-minute by default; 2, 5 and 15 too).

   Runs on the server so the API key never leaves it (same config.php as
   bars.php). Results are saved to api/cache/crt-backtest.json.

   Nightly (SiteGround → Devs → Cron Jobs), weekdays after the close:
       php /home/customer/www/<your-site>/public_html/api/crt-backtest.php
       (builds the 1, 2, 5 and 15-minute runs in turn; --tf=5 builds just one)
   From the page (private preview token required):
       GET ?preview=T                  → the saved results
       GET ?preview=T&run=1[&fresh=1]  → rebuild a few tickers per call
   Every request takes &tf=1|2|5|15 (default 1). Each trade also carries 'v':
   its result under every exit option in 'exits' (target × time limit).

   The model, bar by bar inside each session:
     CRT candles  15m, 30m and 1H, built from the base bars, 9:30-aligned
     setup        C1 opens inside 9:30–12:00 today; C2 sweeps one side of C1
                  and closes back inside without taking the other side;
                  long: level = C2's high, target = C1's high (short mirrors)
     bias         1H: a sweep of the key low (3-bar pivots, last 48 hours)
                  that closes back above it = bullish, two closes below =
                  bearish (mirror for the key high); trades only with the bias
                  once there is one
     entry        Rebreak: the level breaks, a bar closes back inside, the
                  level breaks again → a stop entry at the level (or the open
                  if it gaps through); skipped with no room to the target
     stop         placed for a fixed 1.5R to the target
     manage       one trade a session, inside the window; stop first if a bar
                  touches both, from the bar after entry
   A trade still open at the end of the session is flat on its last bar (the
   live chart only follows one session). The 1H bias here is built from months
   of history; the live chart builds it from the days it loads, so a replay can
   show a different bias on a few days. No slippage or commissions.
   ===================================================================== */

declare(strict_types=1);

const CR_WATCHLIST = ['GOOG', 'MU', 'NVDA', 'SPCX', 'TSLA', 'AAPL', 'AMD', 'SNDK', 'QQQ',
                      'DELL', 'INTC', 'META', 'IBM', 'HOOD', 'MSFT', 'SPY'];
const CR_SESSIONS  = 90;
const CR_LOOKBACK  = 140;    // calendar days: 90 sessions + a few weeks for the 1H bias
const CR_CHUNK     = 25;
const CR_STEP_SECS = 15;
const CR_TFS     = [1, 2, 5, 15];   // minutes per bar; the first is the page's own and keeps the original file names
const CR_TARGETS = [['p', "C1's far side (1.5R)"], [1, '1R'], [2, '2R'], [3, '3R']];   // exit options: 'p' the page rule, a number = that many R
const CR_TIMES   = [['p', 'Flat at 4:00'], [30, '30 min'], [60, '60 min'], [120, '2 hours']];   // time limit: 'p' the page rule, minutes after entry, 'c' the session's last bar

const CRO = ['winStart' => 570, 'winEnd' => 720, 'tfs' => [15, 30, 60], 'maxTrades' => 1, 'rr' => 1.5, 'pbTicks' => 0, 'minTgtTk' => 8,
             'cancelThru' => true, 'pivLen' => 3, 'levelLook' => 48, 'acceptN' => 2, 'tick' => 0.01];

$CLI = PHP_SAPI === 'cli';

/* engine self-test: php crt-backtest.php --engine bars.json  → each session's trades as JSON */
if ($CLI && ($argv[1] ?? '') === '--engine') {
    $j = json_decode((string)file_get_contents($argv[2]), true);
    $TZ = new DateTimeZone('America/New_York');
    $B = [];
    foreach ($j['bars'] as $r) {
        [$d, $m] = et_parts((int)$r[0], $TZ);
        if ($m < 570 || $m >= 960) continue;
        $B[] = ['d' => $d, 'm' => $m, 'o' => (float)$r[1], 'h' => (float)$r[2], 'l' => (float)$r[3], 'c' => (float)$r[4], 'v' => (float)$r[5]];
    }
    $eng = crt_engine($B);
    $out = [];
    foreach ($eng['days'] as $d => $day) foreach ($day['trades'] as $t)
        $out[] = [$d, $B[$t['idx']]['m'], $t['tf'], $t['dir'], round($t['e'], 4), round($t['sl'], 4), round($t['tp'], 4), $t['res']];
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

$symbols = array_values(array_unique(array_map('strtoupper', (array)($cfg['crt_bt_symbols'] ?? $cfg['bt_symbols'] ?? CR_WATCHLIST))));
if (!in_array('SPY', $symbols, true)) $symbols[] = 'SPY';       // session calendar
$symbols = array_values(array_filter($symbols, fn($s) => (bool)preg_match('/^[A-Z][A-Z.]{0,5}$/', $s)));
$API_BASE = rtrim((string)($cfg['api_base'] ?? 'https://api.massive.com'), '/');   // leave unset
$TZ = new DateTimeZone('America/New_York');

/* timeframe: ?tf=5 on the web, --tf=5 on the command line (no --tf builds all of them) */
$tfArg = null;
if ($CLI) { foreach ($argv as $a) if (preg_match('/^--tf=(\d+)$/', $a, $mm)) $tfArg = (int)$mm[1]; }
else $tfArg = (int)($_GET['tf'] ?? CR_TFS[0]);
if ($tfArg !== null && !in_array($tfArg, CR_TFS, true)) out_json(400, ['error' => 'bad_timeframe']);
function tf_paths(string $cacheDir, int $tf): array {
    $sfx = $tf === CR_TFS[0] ? '' : '-' . $tf . 'm';
    return [$cacheDir . '/crt-bt' . $sfx, $cacheDir . '/crt-backtest' . $sfx . '.json'];
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
foreach ($tfArg === null ? CR_TFS : [$tfArg] as $tf) {
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
    $from = (clone $to)->modify('-' . CR_LOOKBACK . ' days');
    $t0 = microtime(true);
    foreach ($symbols as $sym) {
        $f = read_json($btDir . '/' . $sym . '.json');
        if ($f && ($f['build'] ?? '') === $state['build']) continue;
        if (!$CLI && microtime(true) - $t0 > CR_STEP_SECS) break;
        $res = ['build' => $state['build'], 'sym' => $sym, 'error' => null, 'dates' => [], 'setups' => [], 'trades' => []];
        try {
            $B = vb_fetch($sym, $API_BASE, (string)$cfg['api_key'], $from, $to, $TZ, $tf);
            $res = array_merge($res, crt_trades($sym, $B, $tf));
        } catch (Throwable $e) {
            $res['error'] = $e->getMessage();
            if ($f && !empty($f['dates'])) $res = array_merge($f, ['build' => $state['build'], 'error' => $res['error'], 'stale' => true]);
        }
        write_json($btDir . '/' . $sym . '.json', $res);
        if ($CLI) fwrite(STDOUT, sprintf("%-5s %s\n", $sym, $res['error'] ?? (count($res['trades']) . ' trades, ' . count($res['setups']) . ' setups')));
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
        $end = (clone $cur)->modify('+' . (CR_CHUNK - 1) . ' days');
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
   the model — a line-for-line twin of run() in js/crt-live.js
   ===================================================================== */
function crt_aggregate(array $B, int $tf): array {
    $out = []; $idx = []; $cur = -1; $key = null;
    foreach ($B as $i => $b) {
        $start = 570 + intdiv($b['m'] - 570, $tf) * $tf;
        $k = $b['d'] . '|' . $start;
        if ($k !== $key) { $out[] = ['d' => $b['d'], 'start' => $start, 'o' => $b['o'], 'h' => $b['h'], 'l' => $b['l'], 'c' => $b['c']]; $cur = count($out) - 1; $key = $k; }
        else { $out[$cur]['h'] = max($out[$cur]['h'], $b['h']); $out[$cur]['l'] = min($out[$cur]['l'], $b['l']); $out[$cur]['c'] = $b['c']; }
        $idx[$i] = $cur;
    }
    return [$out, $idx];
}
/* 1H bias: key-level sweep → reclaim / acceptance */
function crt_bias(array $h1): array {
    $L = CRO['pivLen']; $pH = []; $pHb = []; $pL = []; $pLb = [];
    $bias = 0; $swL = false; $swH = false; $cntL = 0; $cntH = 0; $lvlL = null; $lvlH = null; $res = [];
    $n = count($h1);
    for ($i = 0; $i < $n; $i++) {
        $c = $i - $L;
        if ($c - $L >= 0) {
            $isH = true; $isL = true;
            for ($k = $c - $L; $k <= $c + $L; $k++) {
                if ($k === $c) continue;
                if (!($h1[$c]['h'] > $h1[$k]['h'])) $isH = false;
                if (!($h1[$c]['l'] < $h1[$k]['l'])) $isL = false;
            }
            if ($isH) { $pH[] = $h1[$c]['h']; $pHb[] = $c; }
            if ($isL) { $pL[] = $h1[$c]['l']; $pLb[] = $c; }
        }
        while ($pH && $i - $pHb[0] > CRO['levelLook']) { array_shift($pH); array_shift($pHb); }
        while ($pL && $i - $pLb[0] > CRO['levelLook']) { array_shift($pL); array_shift($pLb); }
        $keyH = $pH ? max($pH) : null; $keyL = $pL ? min($pL) : null;
        $b = $h1[$i];
        if (!$swL && $keyL !== null && $b['l'] < $keyL) { $swL = true; $lvlL = $keyL; $cntL = 0; $pL = []; $pLb = []; }
        if ($swL) { if ($b['c'] > $lvlL) { $bias = 1; $swL = false; } elseif (++$cntL >= CRO['acceptN']) { $bias = -1; $swL = false; } }
        if (!$swH && $keyH !== null && $b['h'] > $keyH) { $swH = true; $lvlH = $keyH; $cntH = 0; $pH = []; $pHb = []; }
        if ($swH) { if ($b['c'] < $lvlH) { $bias = -1; $swH = false; } elseif (++$cntH >= CRO['acceptN']) { $bias = 1; $swH = false; } }
        $res[] = ['bias' => $bias, 'keyH' => $keyH, 'keyL' => $keyL];
    }
    return $res;
}
/* every session: the setups (and how each ended) and the trade */
function crt_engine(array $B): array {
    $htf = []; $hidx = [];
    foreach (CRO['tfs'] as $tf) [$htf[$tf], $hidx[$tf]] = crt_aggregate($B, $tf);
    $bias = crt_bias($htf[60]);
    $byDay = [];
    foreach ($B as $i => $b) $byDay[$b['d']][] = $i;
    $days = [];
    foreach ($byDay as $today => $cur) {
        $setups = []; $live = []; $active = null; $trades = 0; $log = [];
        $nCur = count($cur);
        for ($q = 0; $q < $nCur; $q++) {
            $i = $cur[$q]; $b = $B[$i];
            $inWin = $b['m'] >= CRO['winStart'] && $b['m'] < CRO['winEnd'];
            $hk = $hidx[60][$i];
            $bz = $hk > 0 ? $bias[$hk - 1] : ['bias' => 0, 'keyH' => null, 'keyL' => null];
            /* 1 · new HTF candle → expire the old armed setup, look for a fresh C1/C2 */
            foreach (CRO['tfs'] as $tf) {
                $k = $hidx[$tf][$i];
                $isNew = $q === 0 || $hidx[$tf][$cur[$q - 1]] !== $k;
                if (!$isNew) continue;
                if (isset($live[$tf]) && $setups[$live[$tf]]['state'] < 3) { $setups[$live[$tf]]['state'] = 4; $setups[$live[$tf]]['why'] = 'e'; }
                unset($live[$tf]);
                if (!$inWin || $trades >= CRO['maxTrades'] || $k < 2) continue;
                $c1 = $htf[$tf][$k - 2]; $c2 = $htf[$tf][$k - 1];
                if ($c1['d'] !== $today || $c1['start'] < CRO['winStart']) continue;
                $d = 0;
                if ($c2['l'] < $c1['l'] && $c2['c'] > $c1['l'] && $c2['c'] < $c1['h'] && $c2['h'] < $c1['h']) $d = 1;
                elseif ($c2['h'] > $c1['h'] && $c2['c'] < $c1['h'] && $c2['c'] > $c1['l'] && $c2['l'] > $c1['l']) $d = -1;
                if (!$d) continue;
                if ($bz['bias'] !== 0 && $bz['bias'] !== $d) continue;
                $lvl = $d === 1 ? $c2['h'] : $c2['l']; $tp = $d === 1 ? $c1['h'] : $c1['l'];
                if (abs($tp - $lvl) < CRO['minTgtTk'] * CRO['tick']) continue;
                $setups[] = ['tf' => $tf, 'dir' => $d, 'state' => 0, 'level' => $lvl, 'tp' => $tp, 'born' => $b['m'], 'why' => '', 'bias' => $bz['bias']];
                $live[$tf] = count($setups) - 1;
            }
            /* 2 · manage the open trade */
            if ($active !== null) {
                $t = &$log[$active];
                $hitSL = $t['dir'] === 1 ? $b['l'] <= $t['sl'] : $b['h'] >= $t['sl'];
                $hitTP = $t['dir'] === 1 ? $b['h'] >= $t['tp'] : $b['l'] <= $t['tp'];
                $res = 0;
                if ($i === $t['idx']) { if ($hitTP && !$hitSL) $res = 1; }
                elseif ($hitSL) $res = -1; elseif ($hitTP) $res = 1;
                if ($res) { $t['res'] = $res; $t['xi'] = $i; $setups[$t['setup']]['state'] = 5; $active = null; }
                unset($t);
            }
            /* 3 · trigger state machines, 15m → 30m → 1H, first to fire wins */
            foreach (CRO['tfs'] as $tf) {
                if (!isset($live[$tf])) continue;
                $si = $live[$tf]; $s = &$setups[$si];
                if ($s['state'] >= 3) { unset($s); continue; }
                $lvl = $s['level']; $provSL = $lvl - ($s['tp'] - $lvl) / CRO['rr']; $pb = CRO['pbTicks'] * CRO['tick'];
                $broke = $s['dir'] === 1 ? $b['h'] > $lvl : $b['l'] < $lvl;
                $pulled = $s['dir'] === 1 ? $b['c'] < $lvl - $pb : $b['c'] > $lvl + $pb;
                $thruSL = $s['dir'] === 1 ? $b['l'] <= $provSL : $b['h'] >= $provSL;
                $ranTP = $s['dir'] === 1 ? $b['h'] >= $s['tp'] : $b['l'] <= $s['tp'];
                $trig = false;
                if (CRO['cancelThru'] && $thruSL) { $s['state'] = 4; $s['why'] = 'c'; }
                elseif ($s['state'] === 0) { if ($broke) $s['state'] = $pulled ? 2 : 1; }
                elseif ($s['state'] === 1) { if ($pulled) $s['state'] = 2; elseif ($ranTP) { $s['state'] = 4; $s['why'] = 'n'; } }
                elseif ($s['state'] === 2) { if ($broke) $trig = true; }
                if ($trig) {
                    $canEnter = $inWin && $active === null && $trades < CRO['maxTrades'];
                    if (!$canEnter) { $s['state'] = 4; $s['why'] = $active !== null ? 'a' : ($trades >= CRO['maxTrades'] ? 'l' : 'w'); unset($s); continue; }
                    $e = $s['dir'] === 1 ? max($lvl, $b['o']) : min($lvl, $b['o']);
                    if (($s['dir'] === 1 && $e >= $s['tp']) || ($s['dir'] === -1 && $e <= $s['tp'])) { $s['state'] = 4; $s['why'] = 'r'; unset($s); continue; }
                    $s['state'] = 3;
                    $log[] = ['setup' => $si, 'dir' => $s['dir'], 'tf' => $tf, 'e' => $e, 'sl' => $e - ($s['tp'] - $e) / CRO['rr'], 'tp' => $s['tp'], 'lvl' => $lvl,
                              'idx' => $i, 'pos' => $q, 'res' => null, 'xi' => null, 'born' => $s['born'], 'bias' => $s['bias']];
                    $active = count($log) - 1; $trades++;
                }
                unset($s);
            }
        }
        $days[$today] = ['cur' => $cur, 'setups' => $setups, 'trades' => $log];
    }
    return ['days' => $days];
}

function crt_trades(string $sym, array $B, int $mult = 1): array {
    $dates = array_values(array_unique(array_column($B, 'd')));
    if (count($B) < 200) return ['dates' => $dates, 'setups' => [], 'trades' => []];
    $eng = crt_engine($B);
    $setups = []; $trades = [];
    foreach ($eng['days'] as $d => $day) {
        $cur = $day['cur']; $n = count($cur);
        foreach ($day['setups'] as $s) $setups[] = [$d, $s['born'], $s['tf'], $s['dir'] === 1 ? 'L' : 'S', $s['state'] >= 3 && $s['state'] !== 4 ? 'T' : ($s['state'] === 4 ? $s['why'] : 'o')];
        foreach ($day['trades'] as $t) {
            $long = $t['dir'] === 1; $R = abs($t['e'] - $t['sl']);
            if (!($R > 0)) continue;
            /* walk it from the bar after entry: stop first, then the target; $cap = flat on the close of the
               first bar ending at or after that minute; flat on the session's last bar if neither */
            $walk = function (float $Tx, ?int $cap) use ($B, $cur, $n, $t, $long, $mult) {
                for ($q = $t['pos'] + 1; $q < $n; $q++) {
                    $b = $B[$cur[$q]];
                    if ($long ? $b['l'] <= $t['sl'] : $b['h'] >= $t['sl']) return [$q, $t['sl'], 'stop'];
                    if ($long ? $b['h'] >= $Tx : $b['l'] <= $Tx) return [$q, $Tx, 'target'];
                    if ($cap !== null && $b['m'] + $mult >= $cap) return [$q, $b['c'], 'time'];
                }
                return [$n - 1, $B[$cur[$n - 1]]['c'], 'time'];
            };
            $em = $B[$t['idx']]['m'];
            $v = [];
            foreach (CR_TARGETS as $o) {
                $Tx = $o[0] === 'p' ? $t['tp'] : ($long ? $t['e'] + $o[0] * $R : $t['e'] - $o[0] * $R);
                foreach (CR_TIMES as $tm) {
                    [$q, $x, $why] = $walk($Tx, $tm[0] === 'p' ? null : $em + $tm[0]);
                    $v[] = [round(($long ? $x - $t['e'] : $t['e'] - $x) / $R, 3), $why, $B[$cur[$q]]['m'], round($x, 4)];
                }
            }
            [$q, $x, $why] = $walk($t['tp'], null);
            $trades[] = [
                'd' => $d, 'sym' => $sym, 'side' => $long ? 'L' : 'S', 'tf' => $t['tf'], 'born' => $t['born'], 'm' => $em,
                'e' => round($t['e'], 4), 'sl' => round($t['sl'], 4), 'tp' => round($t['tp'], 4), 'lvl' => round($t['lvl'], 4), 'bias' => $t['bias'],
                'x' => round($x, 4), 'xm' => $B[$cur[$q]]['m'], 'why' => $why, 'r' => round(($long ? $x - $t['e'] : $t['e'] - $x) / $R, 3),
                'rp' => round($R / $t['e'] * 100, 3), 'v' => $v,
            ];
        }
    }
    return ['dates' => $dates, 'setups' => $setups, 'trades' => $trades];
}

function combine(array $symbols, array $state, string $dir, string $outFile, int $tf): void {
    $files = [];
    foreach ($symbols as $s) $files[$s] = read_json($dir . '/' . $s . '.json') ?? ['error' => 'missing', 'dates' => [], 'setups' => [], 'trades' => []];
    $cal = $files['SPY']['dates'] ?? [];
    if (!$cal) { foreach ($files as $f) $cal = array_merge($cal, $f['dates'] ?? []); $cal = array_values(array_unique($cal)); sort($cal); }
    $sessions = array_slice($cal, -CR_SESSIONS);
    $inWin = array_flip($sessions);
    $cover = []; $setups = []; $trades = []; $missing = [];
    foreach ($symbols as $s) {
        $f = $files[$s];
        if (!empty($f['error'])) $missing[] = ['sym' => $s, 'error' => $f['error'], 'stale' => !empty($f['stale'])];
        $have = array_flip($f['dates'] ?? []);
        $row = '';
        foreach ($sessions as $d) $row .= isset($have[$d]) ? '1' : '0';
        $cover[$s] = $row;
        foreach ($f['setups'] ?? [] as $g) if (isset($inWin[$g[0]])) $setups[] = [$s, $g[0], $g[1], $g[2], $g[3], $g[4]];
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
        'exits'    => ['targets' => CR_TARGETS, 'times' => CR_TIMES],   // v[target * count(times) + time] on each trade: [r, t target · s stop · m time · r replaced · o open · p PMH · e EMA · b breakeven · 2 target 2, exit, price]
        'built'    => time(),
        'build'    => $state['build'],
        'symbols'  => $symbols,
        'sessions' => $sessions,
        'cover'    => $cover,      // one character per session: 1 data, 0 none
        'setups'   => $setups,     // [sym, date, minute armed, 15|30|60, L|S, T traded · e C3 closed first · c stop traded first · n ran to target, no rebreak · a in a trade · l one a session · w outside the window · r no room · o still armed at the close]
        'trades'   => $trades,
        'missing'  => $missing,
    ]);
}
