<?php
/* =====================================================================
   api/vsr-backtest.php — backtest of the Volume S/R Rejection rules over
   a fixed watchlist, on 2-minute regular-session Massive bars.

   Runs on the server so the API key never leaves it (same config.php as
   bars.php). Results are saved to api/cache/vsr-backtest.json, which the
   Volume S/R Rejection page reads.

   Nightly (SiteGround → Devs → Cron Jobs), weekdays after the close:
       php /home/customer/www/<your-site>/public_html/api/vsr-backtest.php
       (builds the 2, 5 and 15-minute runs in turn; --tf=5 builds just one)
   Every request takes &tf=2|5|15 (default 2). Each trade also carries 'v': its result
   under every exit option in 'exits' (target × time limit), so the page can switch instantly.
   From the page (private preview token required):
       GET ?preview=T                  → the saved results
       GET ?preview=T&run=1[&fresh=1]  → rebuild a few tickers per call;
                                         the page repeats it until complete

   Signals: the indicator's rules with its default inputs (same as the live
   chart, js/vsr-live.js) — rolling 600-bar / 72-row profile, 5/5 swings
   judged against the profile, merge 0.16 ATR, keep 20, a close 0.10 ATR
   through removes a level; BUY = support touched within 0.15 ATR, close back
   above, green, buy share ≥ 60% and up ≥ 15 points on the prior 3 bars;
   SELL mirrors it; one signal per touch, 3-bar cooldown. No session reset.

   Trades (the page's own exit rule; the video gives none):
     entry   the next bar's open, same session (skip if it opens through the stop)
     stop    0.15 ATR beyond the level (the 0.10 ATR break line + 0.05 ATR)
     target  0.10 ATR short of the nearest opposing level or the POC, whichever
             comes first; 2R if neither is in the way. Skip if it's under 1R.
     out     stop or target (stop first if a bar touches both), else flat at
             the session's last bar. One trade at a time per ticker.
   No slippage or commissions.
   ===================================================================== */

declare(strict_types=1);

const VB_WATCHLIST = ['GOOG', 'MU', 'NVDA', 'SPCX', 'TSLA', 'AAPL', 'AMD', 'SNDK', 'QQQ',
                      'DELL', 'INTC', 'META', 'IBM', 'HOOD', 'MSFT', 'SPY'];
const VB_SESSIONS  = 90;
const VB_LOOKBACK  = 170;    // calendar days: 90 sessions + the 600-bar warm-up
const VB_CHUNK     = 25;
const VB_STEP_SECS = 15;
const VB_TFS     = [2, 5, 15];   // minutes per bar; the first is the page's own and keeps the original file names
const VB_TARGETS = [['p', 'Next level or POC'], [1, '1R'], [2, '2R'], [3, '3R']];   // exit options: 'p' the page rule, a number = that many R
const VB_TIMES   = [['p', 'Flat at 4:00'], [30, '30 min'], [60, '60 min'], [120, '2 hours']];   // time limit: 'p' the page rule, minutes after entry, 'c' the session's last bar

const VO = [
    'profLb' => 600, 'rows' => 72, 'swing' => 5, 'srchAtr' => 1.20, 'nodeMin' => 0.08, 'evidMin' => 0.22, 'pullMax' => 0.85,
    'scoreMin' => 30.0, 'maxLvl' => 20, 'mergeAtr' => 0.16, 'breakAtr' => 0.10,
    'touchAtr' => 0.15, 'dominance' => 60.0, 'shiftBars' => 3, 'shiftPoints' => 15.0, 'cooldown' => 3,
    'volLen' => 40, 'absRad' => 3, 'pivVolX' => 2.2, 'absBodyMax' => 0.40, 'absVolX' => 1.5, 'tick' => 0.01,
    'stopAtr' => 0.15, 'tgtAtr' => 0.10, 'minR' => 1.0, 'fallbackR' => 2.0,
];

$CLI = PHP_SAPI === 'cli';

/* engine self-test: php vsr-backtest.php --engine bars.json  → signals as JSON */
if ($CLI && ($argv[1] ?? '') === '--engine') {
    $j = json_decode((string)file_get_contents($argv[2]), true);
    $TZ = new DateTimeZone('America/New_York');
    $B = [];
    foreach ($j['bars'] as $r) {
        [$d, $m] = et_parts((int)$r[0], $TZ);
        if ($m < 570 || $m >= 960) continue;
        $B[] = ['d' => $d, 'm' => $m, 'o' => (float)$r[1], 'h' => (float)$r[2], 'l' => (float)$r[3], 'c' => (float)$r[4], 'v' => (float)$r[5]];
    }
    $res = vsr_engine($B);
    echo json_encode(array_map(fn($s) => [$s['t'], $s['side'], round($s['lvl'], 4)], $res['signals'])), PHP_EOL;
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

$symbols = array_values(array_unique(array_map('strtoupper', (array)($cfg['vsr_bt_symbols'] ?? $cfg['bt_symbols'] ?? VB_WATCHLIST))));
if (!in_array('SPY', $symbols, true)) $symbols[] = 'SPY';       // session calendar
$symbols = array_values(array_filter($symbols, fn($s) => (bool)preg_match('/^[A-Z][A-Z.]{0,5}$/', $s)));
$API_BASE = rtrim((string)($cfg['api_base'] ?? 'https://api.massive.com'), '/');   // leave unset
$TZ = new DateTimeZone('America/New_York');

/* timeframe: ?tf=5 on the web, --tf=5 on the command line (no --tf builds all of them) */
$tfArg = null;
if ($CLI) { foreach ($argv as $a) if (preg_match('/^--tf=(\d+)$/', $a, $mm)) $tfArg = (int)$mm[1]; }
else $tfArg = (int)($_GET['tf'] ?? VB_TFS[0]);
if ($tfArg !== null && !in_array($tfArg, VB_TFS, true)) out_json(400, ['error' => 'bad_timeframe']);
function tf_paths(string $cacheDir, int $tf): array {
    $sfx = $tf === VB_TFS[0] ? '' : '-' . $tf . 'm';
    return [$cacheDir . '/vsr-bt' . $sfx, $cacheDir . '/vsr-backtest' . $sfx . '.json'];
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
foreach ($tfArg === null ? VB_TFS : [$tfArg] as $tf) {
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
    $from = (clone $to)->modify('-' . VB_LOOKBACK . ' days');
    $t0 = microtime(true);
    foreach ($symbols as $sym) {
        $f = read_json($btDir . '/' . $sym . '.json');
        if ($f && ($f['build'] ?? '') === $state['build']) continue;
        if (!$CLI && microtime(true) - $t0 > VB_STEP_SECS) break;
        $res = ['build' => $state['build'], 'sym' => $sym, 'error' => null, 'dates' => [], 'signals' => [], 'trades' => []];
        try {
            $B = vb_fetch($sym, $API_BASE, (string)$cfg['api_key'], $from, $to, $TZ, $tf);
            $res = array_merge($res, vsr_trades($sym, $B, $tf));
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
        $end = (clone $cur)->modify('+' . (VB_CHUNK - 1) . ' days');
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
   the indicator — a line-for-line port of run() in js/vsr-live.js
   ===================================================================== */
function vclip(float $x): float { return $x < 0 ? 0.0 : ($x > 1 ? 1.0 : $x); }
function vvol(array $b): float { return max($b['v'], 0.0); }
function vbuy(array $b): float { return $b['h'] > $b['l'] ? vclip(($b['c'] - $b['l']) / ($b['h'] - $b['l'])) : 0.5; }

function vprofile(array $B, int $from, int $to, int $rows): array {
    $lo = INF; $hi = -INF;
    for ($i = $from; $i <= $to; $i++) { $lo = min($lo, $B[$i]['l']); $hi = max($hi, $B[$i]['h']); }
    $span = max($hi - $lo, VO['tick'] * $rows); $bot = $lo - ($span - ($hi - $lo)) * 0.5; $step = $span / $rows;
    $tot = array_fill(0, $rows, 0.0); $buy = array_fill(0, $rows, 0.0);
    for ($i = $from; $i <= $to; $i++) {
        $b = $B[$i]; $r = $b['h'] - $b['l']; $v = vvol($b); $bf = $r > 0 ? vclip(($b['c'] - $b['l']) / $r) : 0.5;
        $r0 = max(0, min($rows - 1, (int)floor(($b['l'] - $bot) / $step)));
        $r1 = max(0, min($rows - 1, (int)floor(($b['h'] - $bot) / $step)));
        for ($j = $r0; $j <= $r1; $j++) {
            $rl = $bot + $j * $step;
            $ov = $r > 0 ? max(0.0, min($b['h'], $rl + $step) - max($b['l'], $rl)) : $step;
            $frac = $r > 0 ? $ov / $r : 1.0;
            if ($frac > 0) { $tot[$j] += $v * $frac; $buy[$j] += $v * $frac * $bf; }
        }
    }
    return ['bot' => $bot, 'step' => $step, 'tot' => $tot, 'buy' => $buy];
}

function vnode(float $raw, bool $supp, float $atrP, array $P): array {
    $mx = max(max($P['tot']), 1e-7); $rad = max($atrP * VO['srchAtr'], $P['step'] * 2);
    $bp = $raw; $be = -1.0; $bs = 0.0; $rows = count($P['tot']);
    for ($r = 0; $r < $rows; $r++) {
        $p = $P['bot'] + ($r + 0.5) * $P['step']; $d = abs($p - $raw);
        if ($d > $rad) continue;
        $rv = $P['tot'][$r]; $str = $rv / $mx;
        $lv = $r > 0 ? $P['tot'][$r - 1] : $rv; $rv2 = $r < $rows - 1 ? $P['tot'][$r + 1] : $rv;
        $nAvg = max(($lv + $rv2) * 0.5, $mx * 0.01);
        $pk = vclip(($rv / $nAvg - 0.85) / 0.65);
        $bSh = $rv > 0 ? vclip($P['buy'][$r] / $rv) : 0.5; $dir = $supp ? $bSh : 1 - $bSh;
        $e = 0.50 * $str + 0.20 * $pk + 0.20 * $dir + 0.10 * (1 - $d / $rad);
        if ($e > $be) { $be = $e; $bp = $p; $bs = $str; }
    }
    return ['node' => $bp, 'evid' => max($be, 0.0), 'nStr' => $bs];
}

function vsr_engine(array $B): array {
    $n = count($B); $L = VO['swing'];
    $atr = array_fill(0, $n, null); $trSum = 0.0;
    for ($i = 0; $i < $n; $i++) {
        $tr = $i === 0 ? $B[$i]['h'] - $B[$i]['l'] : max($B[$i]['h'] - $B[$i]['l'], abs($B[$i]['h'] - $B[$i - 1]['c']), abs($B[$i]['l'] - $B[$i - 1]['c']));
        if ($i < 14) { $trSum += $tr; if ($i === 13) $atr[$i] = $trSum / 14; }
        else $atr[$i] = ($atr[$i - 1] * 13 + $tr) / 14;
    }
    $avgVol = array_fill(0, $n, null); $vs = 0.0;
    for ($i = 0; $i < $n; $i++) {
        $vs += vvol($B[$i]); if ($i >= VO['volLen']) $vs -= vvol($B[$i - VO['volLen']]);
        if ($i >= VO['volLen'] - 1) $avgVol[$i] = $vs / VO['volLen'];
    }
    $nz = fn($x, $d) => $x === null ? $d : $x;
    $isPivot = function (int $k, bool $high) use ($B, $L, $n): bool {
        if ($k - $L < 0 || $k + $L >= $n) return false;
        $v = $high ? $B[$k]['h'] : $B[$k]['l'];
        for ($q = $k - $L; $q <= $k + $L; $q++) {
            if ($q === $k) continue;
            if ($high ? $B[$q]['h'] >= $v : $B[$q]['l'] <= $v) return false;
        }
        return true;
    };
    $levels = []; $signals = []; $lastBuy = null; $lastSell = null;

    for ($t = 0; $t < $n; $t++) {
        $b = $B[$t]; $a = $atr[$t];
        /* 1. breaks */
        $buf = max($nz($a, 0.0) * VO['breakAtr'], 0.0);
        for ($i = count($levels) - 1; $i >= 0; $i--) {
            $lv = $levels[$i];
            if ($lv['supp'] ? $b['c'] < $lv['p'] - $buf : $b['c'] > $lv['p'] + $buf) array_splice($levels, $i, 1);
        }
        /* 2. signals */
        $v = vvol($b); $hasVol = $v > 0; $buyPct = $hasVol ? vbuy($b) * 100 : null;
        $pb = 0.0; $pt = 0.0;
        for ($q = 1; $q <= VO['shiftBars']; $q++) if ($t - $q >= 0) { $pb += vvol($B[$t - $q]) * vbuy($B[$t - $q]); $pt += vvol($B[$t - $q]); }
        $prior = $t >= VO['shiftBars'] && $pt > 0 ? 100 * $pb / $pt : null;
        $buyPress = $hasVol && $buyPct >= VO['dominance'] && $prior !== null && $buyPct - $prior >= VO['shiftPoints'];
        $sellPress = $hasVol && 100 - $buyPct >= VO['dominance'] && $prior !== null && (100 - $buyPct) - (100 - $prior) >= VO['shiftPoints'];
        $tol = max($nz($a, VO['tick']) * VO['touchAtr'], VO['tick']);
        $buyCd = $lastBuy === null || $t - $lastBuy > VO['cooldown'];
        $sellCd = $lastSell === null || $t - $lastSell > VO['cooldown'];
        $bi = -1; $si = -1; $bs = -1.0; $ss = -1.0;
        foreach ($levels as $q2 => &$lv) {
            $touching = $b['l'] <= $lv['p'] + $tol && $b['h'] >= $lv['p'] - $tol;
            if (!$touching) $lv['fired'] = false;
            $eligible = $touching && !$lv['fired'] && $t > $lv['cIdx'] && $t > 0;
            $rejS = $lv['supp'] && $b['c'] > $lv['p'] && $t > 0 && $B[$t - 1]['c'] >= $lv['p'] - $tol && $b['c'] > $b['o'];
            $rejR = !$lv['supp'] && $b['c'] < $lv['p'] && $t > 0 && $B[$t - 1]['c'] <= $lv['p'] + $tol && $b['c'] < $b['o'];
            if ($eligible && $buyCd && $buyPress && $rejS && $lv['sc'] > $bs) { $bi = $q2; $bs = $lv['sc']; }
            if ($eligible && $sellCd && $sellPress && $rejR && $lv['sc'] > $ss) { $si = $q2; $ss = $lv['sc']; }
        }
        unset($lv);
        $buySig = $bi >= 0 && $si < 0; $sellSig = $si >= 0 && $bi < 0;
        if ($buySig || $sellSig) {
            $sl = $levels[$buySig ? $bi : $si];
            if ($buySig) $lastBuy = $t; else $lastSell = $t;
            $signals[] = ['t' => $t, 'side' => $buySig ? 'L' : 'S', 'lvl' => $sl['p'], 'sc' => $sl['sc'], 'atr' => $a,
                          'pct' => $buySig ? $buyPct : 100 - $buyPct, 'shift' => $buySig ? $buyPct - $prior : $prior - $buyPct,
                          'opp' => array_values(array_map(fn($x) => $x['p'], array_filter($levels, fn($x) => $x['supp'] !== $buySig)))];
            foreach ($levels as &$lv) if ($lv['supp'] === $buySig && $b['l'] <= $lv['p'] + $tol && $b['h'] >= $lv['p'] - $tol) $lv['fired'] = true;
            unset($lv);
        }
        /* 3. new levels */
        if ($t >= VO['profLb'] + $L - 1 && $atr[$t - $L] !== null) {
            foreach ([[false, true], [true, false]] as [$high, $supp]) {
                $k = $t - $L;
                if (!$isPivot($k, $high)) continue;
                $raw = $high ? $B[$k]['h'] : $B[$k]['l'];
                $bars = max(1, min(VO['profLb'], $t - $L + 1));
                $P = vprofile($B, $t - $L - $bars + 1, $t - $L, VO['rows']);
                $atrP = max($nz($atr[$k], VO['tick']), VO['tick']);
                $nd = vnode($raw, $supp, $atrP, $P);
                /* pivot features */
                $vb = $nz($avgVol[$k], vvol($B[$k])); $vr = $vb > 0 ? vvol($B[$k]) / $vb : 1.0;
                $vSc = vclip(($vr - 0.8) / (VO['pivVolX'] - 0.8));
                $pr = max($B[$k]['h'] - $B[$k]['l'], VO['tick']);
                $wick = $supp ? min($B[$k]['o'], $B[$k]['c']) - $B[$k]['l'] : $B[$k]['h'] - max($B[$k]['o'], $B[$k]['c']);
                $wSc = vclip(($wick / $pr) / 0.5); $aSc = 0.0;
                for ($m = 0; $m <= VO['absRad'] * 2; $m++) {
                    $o = $t - ($L - VO['absRad'] + $m); $bb = $B[$o];
                    $cr = max($bb['h'] - $bb['l'], VO['tick']); $vv = vvol($bb); $base = $nz($avgVol[$o], $vv);
                    $vRat = $base > 0 ? $vv / $base : 1.0; $bRat = abs($bb['c'] - $bb['o']) / $cr;
                    $small = vclip((VO['absBodyMax'] - $bRat) / VO['absBodyMax']); $av = vclip(($vRat - 1) / (VO['absVolX'] - 1));
                    $aSc = max($aSc, sqrt($small * $av));
                }
                $ok = $nd['nStr'] >= VO['nodeMin'] && $nd['evid'] >= VO['evidMin'];
                $pull = $ok ? VO['pullMax'] * vclip($nd['evid'] / 0.65) : 0.0;
                $p = $raw + ($nd['node'] - $raw) * $pull;
                $sc = 100 * (0.50 * $nd['evid'] + 0.20 * $aSc + 0.15 * $vSc + 0.15 * $wSc);
                $viable = $supp ? $b['c'] >= $p : $b['c'] <= $p;
                if (!($ok && $viable && $sc >= VO['scoreMin'])) continue;
                $new = ['p' => $p, 'sc' => $sc, 'supp' => $supp, 'cIdx' => $t, 'fired' => false];
                $tolM = max($atrP * VO['mergeAtr'], VO['tick']); $id = -1; $best = 1e20;
                foreach ($levels as $q3 => $x) if ($x['supp'] === $supp) { $d = abs($x['p'] - $p); if ($d <= $tolM && $d < $best) { $best = $d; $id = $q3; } }
                if ($id >= 0) { if ($sc > $levels[$id]['sc']) $levels[$id] = $new; }
                else $levels[] = $new;
            }
            while (count($levels) > VO['maxLvl']) {
                $weak = 0;
                for ($i = 1; $i < count($levels); $i++) if ($levels[$i]['sc'] < $levels[$weak]['sc']) $weak = $i;
                array_splice($levels, $weak, 1);
            }
        }
    }
    return ['signals' => $signals, 'atr' => $atr];
}

/* signals → trades, with the page's exit rule */
function vsr_trades(string $sym, array $B, int $mult = 2): array {
    $n = count($B);
    if ($n < 50) return ['dates' => array_values(array_unique(array_column($B, 'd'))), 'signals' => [], 'trades' => []];
    $eng = vsr_engine($B);
    $out = []; $trades = []; $busyUntil = -1;
    foreach ($eng['signals'] as $s) {
        $t = $s['t']; $b = $B[$t]; $long = $s['side'] === 'L'; $a = (float)$s['atr'];
        $rec = [$b['d'], $b['m'], $s['side'], ''];
        if ($t < $busyUntil) { $rec[3] = 'b'; $out[] = $rec; continue; }
        if ($t + 1 >= $n || $B[$t + 1]['d'] !== $b['d']) { $rec[3] = 'l'; $out[] = $rec; continue; }
        $j = $t + 1; $E = $B[$j]['o'];
        $S = $long ? $s['lvl'] - VO['stopAtr'] * $a : $s['lvl'] + VO['stopAtr'] * $a;
        $R = $long ? $E - $S : $S - $E;
        if ($R <= 0) { $rec[3] = 'x'; $out[] = $rec; continue; }
        /* the nearest opposing level or the POC, beyond the entry */
        $bars = min(VO['profLb'], $t + 1);
        $P = vprofile($B, $t - $bars + 1, $t, VO['rows']);
        $mx = max($P['tot']); $poc = $P['bot'] + (array_search($mx, $P['tot'], true) + 0.5) * $P['step'];
        $cands = [];
        foreach (array_merge($s['opp'], [$poc]) as $c) if ($long ? $c > $E : $c < $E) $cands[] = $c;
        $tt = '2r';
        if ($cands) {
            $c = $long ? min($cands) : max($cands);
            $T = $long ? $c - VO['tgtAtr'] * $a : $c + VO['tgtAtr'] * $a;
            $tt = abs($c - $poc) < 1e-9 ? 'poc' : 'lvl';
        } else $T = $long ? $E + VO['fallbackR'] * $R : $E - VO['fallbackR'] * $R;
        $rew = $long ? $T - $E : $E - $T;
        if ($rew < VO['minR'] * $R) { $rec[3] = 'r'; $out[] = $rec; continue; }
        /* walk it: stop first, then the target; an open through either fills at the open.
           $cap = flat on the close of the first bar ending at or after that minute (null: the session's last bar) */
        $walk = function (float $Tx, ?int $cap) use ($B, $n, $j, $b, $long, $S, $mult) {
            $x = null; $why = null; $k = $j;
            for (; $k < $n && $B[$k]['d'] === $b['d']; $k++) {
                $bb = $B[$k];
                if ($long) {
                    if ($bb['o'] <= $S) { $x = $bb['o']; $why = 'stop'; }
                    elseif ($bb['l'] <= $S) { $x = $S; $why = 'stop'; }
                    elseif ($bb['o'] >= $Tx) { $x = $bb['o']; $why = 'target'; }
                    elseif ($bb['h'] >= $Tx) { $x = $Tx; $why = 'target'; }
                } else {
                    if ($bb['o'] >= $S) { $x = $bb['o']; $why = 'stop'; }
                    elseif ($bb['h'] >= $S) { $x = $S; $why = 'stop'; }
                    elseif ($bb['o'] <= $Tx) { $x = $bb['o']; $why = 'target'; }
                    elseif ($bb['l'] <= $Tx) { $x = $Tx; $why = 'target'; }
                }
                if (!$why && $cap !== null && $bb['m'] + $mult >= $cap) { $x = $bb['c']; $why = 'time'; }
                if ($why) break;
            }
            if (!$why) { $k--; $x = $B[$k]['c']; $why = 'time'; }
            return [$k, $x, $why];
        };
        $em = $B[$j]['m'];
        $caps = array_map(fn($o) => $o[0] === 'p' ? null : ($o[0] === 'c' ? 960 : $em + $o[0]), VB_TIMES);
        $v = [];
        foreach (VB_TARGETS as $o) {
            $Tx = $o[0] === 'p' ? $T : ($long ? $E + $o[0] * $R : $E - $o[0] * $R);
            foreach ($caps as $cap) {
                [$k2, $x2, $w2] = $walk($Tx, $cap);
                $v[] = [round(($long ? $x2 - $E : $E - $x2) / $R, 3), $w2, $B[$k2]['m'], round($x2, 4)];
            }
        }
        [$k, $x, $why] = $walk($T, null);
        $busyUntil = $k;
        $r = ($long ? $x - $E : $E - $x) / $R;
        $rec[3] = 'T'; $out[] = $rec;
        $trades[] = [
            'd' => $b['d'], 'sym' => $sym, 'side' => $s['side'], 'm' => $b['m'], 'em' => $B[$j]['m'],
            'e' => round($E, 4), 's' => round($S, 4), 't' => round($T, 4), 'tt' => $tt,
            'x' => round($x, 4), 'xm' => $B[$k]['m'], 'why' => $why, 'r' => round($r, 3), 'rp' => round($R / $E * 100, 2),
            'lvl' => round($s['lvl'], 4), 'sc' => (int)round($s['sc']), 'pct' => (int)round($s['pct']), 'sh' => (int)round($s['shift']),
            'v' => $v,      // [r, why, exit minute, exit price] for each exit option (see 'exits')
        ];
    }
    return ['dates' => array_values(array_unique(array_column($B, 'd'))), 'signals' => $out, 'trades' => $trades];
}

function combine(array $symbols, array $state, string $dir, string $outFile, int $tf): void {
    $files = [];
    foreach ($symbols as $s) $files[$s] = read_json($dir . '/' . $s . '.json') ?? ['error' => 'missing', 'dates' => [], 'signals' => [], 'trades' => []];
    $cal = $files['SPY']['dates'] ?? [];
    if (!$cal) { foreach ($files as $f) $cal = array_merge($cal, $f['dates'] ?? []); $cal = array_values(array_unique($cal)); sort($cal); }
    $sessions = array_slice($cal, -VB_SESSIONS);
    $inWin = array_flip($sessions);
    $cover = []; $signals = []; $trades = []; $missing = [];
    foreach ($symbols as $s) {
        $f = $files[$s];
        if (!empty($f['error'])) $missing[] = ['sym' => $s, 'error' => $f['error'], 'stale' => !empty($f['stale'])];
        $have = array_flip($f['dates'] ?? []);
        $row = '';
        foreach ($sessions as $d) $row .= isset($have[$d]) ? '1' : '0';
        $cover[$s] = $row;
        foreach ($f['signals'] ?? [] as $g) if (isset($inWin[$g[0]])) $signals[] = [$s, $g[0], $g[1], $g[2], $g[3]];
        foreach ($f['trades'] ?? [] as $t) if (isset($inWin[$t['d']])) $trades[] = $t;
    }
    usort($trades, fn($a, $b) => [$a['d'], $a['em'], $a['sym']] <=> [$b['d'], $b['em'], $b['sym']]);
    /* compact the exit options: R to 0.01, prices to the cent, one-letter reasons */
    $code = ['target' => 't', 'stop' => 's', 'time' => 'm', 'replaced' => 'r', 'open' => 'o', 'pmh' => 'p', 'ema' => 'e', 'be' => 'b', 't2' => '2'];
    foreach ($trades as &$tr) foreach ($tr['v'] ?? [] as $q => $vv) $tr['v'][$q] = [round($vv[0], 2), $code[$vv[1]] ?? $vv[1], $vv[2], round($vv[3], 2)];
    unset($tr);
    write_json($outFile, [
        'version'  => 2,
        'tf'       => $tf,
        'exits'    => ['targets' => VB_TARGETS, 'times' => VB_TIMES],   // v[target * count(times) + time] on each trade: [r, t target · s stop · m time · r replaced · o open · p PMH · e EMA · b breakeven · 2 target 2, exit, price]
        'built'    => time(),
        'build'    => $state['build'],
        'symbols'  => $symbols,
        'sessions' => $sessions,
        'cover'    => $cover,      // one character per session: 1 data, 0 none
        'signals'  => $signals,    // [sym, date, minute, L|S, T trade · b already in a trade · l last bar · x opened through stop · r under 1R]
        'trades'   => $trades,
        'missing'  => $missing,
    ]);
}
