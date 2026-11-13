<?php
/* =====================================================================
   api/zl-backtest.php — backtest of the Zero Lag Trend Pullback setup,
   using the rules of pine/zero-lag-pullback.pine at its default settings
   (the same code as js/zl-live.js) on regular-session Massive bars,
   5-minute by default; 2 and 15-minute too.

   Runs on the server so the API key never leaves it (same config.php as
   bars.php). Results are saved to api/cache/zl-backtest.json
   (zl-backtest-2m.json, zl-backtest-15m.json for the other timeframes).

   Nightly (SiteGround → Devs → Cron Jobs), weekdays after the close:
       php /home/customer/www/<your-site>/public_html/api/zl-backtest.php
       (builds the 5, 2 and 15-minute runs in turn; --tf=2 builds just one)
   Every request takes &tf=5|2|15 (default 5). Each trade also carries 'v':
   its result under every exit option in 'exits' (target × time limit).
   From the page (private preview token required):
       GET ?preview=T                  → the saved results
       GET ?preview=T&run=1[&fresh=1]  → rebuild a few tickers per call

   The rules, bar by bar (regular-session bars, lines carried across days):
     white = zero-lag EMA 50, green = zero-lag EMA 100,
             zero-lag EMA = EMA + (EMA − EMA of EMA)
     volume average = 20-bar SMA of volume (the Volume indicator's MA)
     no signals for the first 300 bars (3 × the slow length) while the
             lines warm up
     uptrend = white above green; downtrend = white below green
     LONG pullback: in an uptrend a bar closes between the lines (at or above
             green, below white). A close below green or a trend flip
             cancels it.
     BUY  = pullback armed, then a green candle (close > open) closes above
             white with volume ≥ its average; entry that close
     SHORT / SELL: the mirror (close between the lines in a downtrend, then a
             red candle closes below white on average-or-better volume)
     stop = the green line at the signal bar; target = entry ± 2 × risk
     exits: stop first, then target, from the next bar, filled at the level;
             no time limit (a trade can hold overnight). One trade at a time:
             a signal while a trade is open is counted but not taken.
   No slippage or commissions.
   ===================================================================== */

declare(strict_types=1);

const ZB_WATCHLIST = ['GOOG', 'MU', 'NVDA', 'SPCX', 'TSLA', 'AAPL', 'AMD', 'SNDK', 'QQQ',
                      'DELL', 'INTC', 'META', 'IBM', 'HOOD', 'MSFT', 'SPY'];
const ZB_SESSIONS  = 90;
const ZB_LOOKBACK  = 150;    // calendar days: 90 sessions + the 300-bar warm-up at 15-minute
const ZB_CHUNK     = 25;
const ZB_STEP_SECS = 15;
const ZB_TFS     = [5, 2, 15];   // minutes per bar; the first is the page's own and keeps the original file names
const ZB_TARGETS = [['p', '2R'], [1, '1R'], [3, '3R'], ['e', 'Close back through the white line']];   // 'p' the page rule, a number = that many R, 'e' no target: out on a close through the white line
const ZB_TIMES   = [['p', 'None (holds overnight)'], [60, '60 min'], [120, '2 hours'], ['c', 'Flat at 4:00']];

const ZO = ['fast' => 50, 'slow' => 100, 'vol' => 20, 'rr' => 2.0, 'warm' => 300];

$CLI = PHP_SAPI === 'cli';

/* engine self-test: php zl-backtest.php --engine bars.json  → trades and pullbacks as JSON */
if ($CLI && ($argv[1] ?? '') === '--engine') {
    $j = json_decode((string)file_get_contents($argv[2]), true);
    $TZ = new DateTimeZone('America/New_York');
    $B = [];
    foreach ($j['bars'] as $r) {
        [$d, $m] = et_parts((int)$r[0], $TZ);
        if ($m < 570 || $m >= 960) continue;
        $B[] = ['d' => $d, 'm' => $m, 'o' => (float)$r[1], 'h' => (float)$r[2], 'l' => (float)$r[3], 'c' => (float)$r[4], 'v' => (float)$r[5]];
    }
    $res = zl_engine($B);
    echo json_encode([
        'trades' => array_map(fn($s) => [$s['t'], $s['side'], round($s['e'], 4), round($s['sl'], 4), round($s['tp'], 4), $s['xt'], $s['why']], $res['trades']),
        'pulls'  => array_map(fn($p) => [$p['t'], $p['side'], $p['code']], $res['pulls']),
    ]), PHP_EOL;
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

$symbols = array_values(array_unique(array_map('strtoupper', (array)($cfg['zl_bt_symbols'] ?? $cfg['bt_symbols'] ?? ZB_WATCHLIST))));
if (!in_array('SPY', $symbols, true)) $symbols[] = 'SPY';       // session calendar
$symbols = array_values(array_filter($symbols, fn($s) => (bool)preg_match('/^[A-Z][A-Z.]{0,5}$/', $s)));
$API_BASE = rtrim((string)($cfg['api_base'] ?? 'https://api.massive.com'), '/');   // leave unset
$TZ = new DateTimeZone('America/New_York');

/* timeframe: ?tf=5 on the web, --tf=5 on the command line (no --tf builds all of them) */
$tfArg = null;
if ($CLI) { foreach ($argv as $a) if (preg_match('/^--tf=(\d+)$/', $a, $mm)) $tfArg = (int)$mm[1]; }
else $tfArg = (int)($_GET['tf'] ?? ZB_TFS[0]);
if ($tfArg !== null && !in_array($tfArg, ZB_TFS, true)) out_json(400, ['error' => 'bad_timeframe']);
function tf_paths(string $cacheDir, int $tf): array {
    $sfx = $tf === ZB_TFS[0] ? '' : '-' . $tf . 'm';
    return [$cacheDir . '/zl-bt' . $sfx, $cacheDir . '/zl-backtest' . $sfx . '.json'];
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
foreach ($tfArg === null ? ZB_TFS : [$tfArg] as $tf) {
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
    $from = (clone $to)->modify('-' . ZB_LOOKBACK . ' days');
    $t0 = microtime(true);
    foreach ($symbols as $sym) {
        $f = read_json($btDir . '/' . $sym . '.json');
        if ($f && ($f['build'] ?? '') === $state['build']) continue;
        if (!$CLI && microtime(true) - $t0 > ZB_STEP_SECS) break;
        $res = ['build' => $state['build'], 'sym' => $sym, 'error' => null, 'dates' => [], 'pulls' => [], 'trades' => []];
        try {
            $B = vb_fetch($sym, $API_BASE, (string)$cfg['api_key'], $from, $to, $TZ, $tf);
            $res = array_merge($res, zl_trades($sym, $B, $tf));
        } catch (Throwable $e) {
            $res['error'] = $e->getMessage();
            if ($f && !empty($f['dates'])) $res = array_merge($f, ['build' => $state['build'], 'error' => $res['error'], 'stale' => true]);
        }
        write_json($btDir . '/' . $sym . '.json', $res);
        if ($CLI) fwrite(STDOUT, sprintf("%-5s %s\n", $sym, $res['error'] ?? (count($res['trades']) . ' trades, ' . count($res['pulls']) . ' pullbacks')));
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

/* regular-session bars at the run's timeframe, oldest first */
function vb_fetch(string $sym, string $base, string $key, DateTime $from, DateTime $to, DateTimeZone $tz, int $mult): array {
    $bars = [];
    $cur = clone $from;
    while ($cur <= $to) {
        $end = (clone $cur)->modify('+' . (ZB_CHUNK - 1) . ' days');
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
   the rules — a line-for-line twin of run() in js/zl-live.js
   ===================================================================== */
function zl_lines(array $B): array {
    $n = count($B); $kf = 2 / (ZO['fast'] + 1); $ks = 2 / (ZO['slow'] + 1);
    $f1 = 0.0; $f2 = 0.0; $s1 = 0.0; $s2 = 0.0; $vs = 0.0;
    $fast = []; $slow = []; $vma = [];
    for ($t = 0; $t < $n; $t++) {
        $c = $B[$t]['c'];
        if ($t === 0) { $f1 = $c; $f2 = $c; $s1 = $c; $s2 = $c; }
        else {
            $f1 += ($c - $f1) * $kf; $f2 += ($f1 - $f2) * $kf;
            $s1 += ($c - $s1) * $ks; $s2 += ($s1 - $s2) * $ks;
        }
        $fast[$t] = 2 * $f1 - $f2; $slow[$t] = 2 * $s1 - $s2;
        $vs += $B[$t]['v'];
        if ($t >= ZO['vol']) $vs -= $B[$t - ZO['vol']]['v'];
        $vma[$t] = $t >= ZO['vol'] - 1 ? $vs / ZO['vol'] : null;
    }
    return [$fast, $slow, $vma];
}

function zl_engine(array $B): array {
    $n = count($B);
    [$fast, $slow, $vma] = zl_lines($B);
    $armL = false; $armS = false; $epL = null; $epS = null;
    $pulls = []; $signals = []; $trades = []; $tr = null;
    for ($t = 0; $t < $n; $t++) {
        $b = $B[$t];
        /* exits first (from the bar after entry), stop before target */
        if ($tr !== null && $t > $tr['t']) {
            $x = null; $why = null;
            if ($tr['side'] === 'L') {
                if ($b['l'] <= $tr['sl']) { $x = $tr['sl']; $why = 'stop'; }
                elseif ($b['h'] >= $tr['tp']) { $x = $tr['tp']; $why = 'target'; }
            } else {
                if ($b['h'] >= $tr['sl']) { $x = $tr['sl']; $why = 'stop'; }
                elseif ($b['l'] <= $tr['tp']) { $x = $tr['tp']; $why = 'target'; }
            }
            if ($why) { $trades[] = $tr + ['xt' => $t, 'x' => $x, 'why' => $why]; $tr = null; }
        }
        if ($t < ZO['warm']) continue;
        $F = $fast[$t]; $S = $slow[$t];
        $up = $F > $S; $dn = $F < $S;
        $volOk = $vma[$t] !== null && $b['v'] >= $vma[$t];
        $green = $b['c'] > $b['o']; $red = $b['c'] < $b['o'];
        $longSig  = $up && $armL && $b['c'] > $F && $green && $volOk;
        $shortSig = $dn && $armS && $b['c'] < $F && $red && $volOk;
        /* a reclaim of the white line that didn't qualify, for the funnel */
        if ($armL && $up && $b['c'] > $F && !$longSig) { if ($green) $epL['v'] = true; else $epL['c'] = true; }
        if ($armS && $dn && $b['c'] < $F && !$shortSig) { if ($red) $epS['v'] = true; else $epS['c'] = true; }
        foreach ([[$longSig, 'L'], [$shortSig, 'S']] as [$fire, $side]) {
            if (!$fire) continue;
            $ep = $side === 'L' ? $epL : $epS;
            if ($tr === null) {
                $risk = $side === 'L' ? $b['c'] - $S : $S - $b['c'];
                $tr = ['t' => $t, 'side' => $side, 'e' => $b['c'], 'sl' => $S,
                       'tp' => $side === 'L' ? $b['c'] + ZO['rr'] * $risk : $b['c'] - ZO['rr'] * $risk,
                       'pt' => $ep['t'], 'vr' => $b['v'] / max(1e-9, (float)$vma[$t])];
                $signals[] = $tr;
                $pulls[] = ['t' => $ep['t'], 'side' => $side, 'code' => 'T'];
            } else {
                $pulls[] = ['t' => $ep['t'], 'side' => $side, 'code' => 'i'];
            }
        }
        /* arming: a close between the lines; through the green line or a trend flip cancels */
        if ($longSig) { $armL = false; $epL = null; }
        elseif (!$up || $b['c'] < $S) { if ($armL) $pulls[] = ['t' => $epL['t'], 'side' => 'L', 'code' => $epL['v'] ? 'v' : ($epL['c'] ? 'c' : 'x')]; $armL = false; $epL = null; }
        elseif ($b['c'] < $F) { if (!$armL) $epL = ['t' => $t, 'v' => false, 'c' => false]; $armL = true; }
        if ($shortSig) { $armS = false; $epS = null; }
        elseif (!$dn || $b['c'] > $S) { if ($armS) $pulls[] = ['t' => $epS['t'], 'side' => 'S', 'code' => $epS['v'] ? 'v' : ($epS['c'] ? 'c' : 'x')]; $armS = false; $epS = null; }
        elseif ($b['c'] > $F) { if (!$armS) $epS = ['t' => $t, 'v' => false, 'c' => false]; $armS = true; }
    }
    if ($tr !== null) $trades[] = $tr + ['xt' => $n - 1, 'x' => $B[$n - 1]['c'], 'why' => 'open'];
    if ($armL) $pulls[] = ['t' => $epL['t'], 'side' => 'L', 'code' => 'n'];
    if ($armS) $pulls[] = ['t' => $epS['t'], 'side' => 'S', 'code' => 'n'];
    usort($pulls, fn($a, $b) => $a['t'] <=> $b['t']);
    return ['signals' => $signals, 'trades' => $trades, 'pulls' => $pulls, 'fast' => $fast];
}

function zl_trades(string $sym, array $B, int $mult = 5): array {
    $dates = array_values(array_unique(array_column($B, 'd')));
    if (count($B) < ZO['warm'] + 10) return ['dates' => $dates, 'pulls' => [], 'trades' => []];
    $eng = zl_engine($B); $F = $eng['fast'];
    $pulls = array_map(fn($p) => [$B[$p['t']]['d'], $B[$p['t']]['m'], $p['side'], $p['code']], $eng['pulls']);
    /* every exit option for every trade: the trade set is the page rule's (one at a time);
       under a longer exit, the next trade on the ticker still replaces an open one */
    $n = count($B); $sig = $eng['signals'];
    $walk = function (array $s, ?int $tn, ?float $Tx, bool $ema, $cap) use ($B, $n, $mult, $F) {
        $long = $s['side'] === 'L'; $d0 = $B[$s['t']]['d'];
        for ($k = $s['t'] + 1; $k < $n; $k++) {
            $bb = $B[$k];
            if ($long) { if ($bb['l'] <= $s['sl']) return [$k, $s['sl'], 'stop']; if ($Tx !== null && $bb['h'] >= $Tx) return [$k, $Tx, 'target']; if ($ema && $bb['c'] < $F[$k]) return [$k, $bb['c'], 'ema']; }
            else { if ($bb['h'] >= $s['sl']) return [$k, $s['sl'], 'stop']; if ($Tx !== null && $bb['l'] <= $Tx) return [$k, $Tx, 'target']; if ($ema && $bb['c'] > $F[$k]) return [$k, $bb['c'], 'ema']; }
            if ($cap === 'c' && ($k + 1 >= $n || $B[$k + 1]['d'] !== $d0)) return [$k, $bb['c'], 'time'];
            if (is_int($cap) && ($bb['d'] !== $d0 || $bb['m'] + $mult >= $cap)) return [$k, $bb['c'], 'time'];
            if ($k === $tn) return [$k, $bb['c'], 'replaced'];
        }
        return [$n - 1, $B[$n - 1]['c'], 'open'];
    };
    $V = [];
    foreach ($sig as $i => $s) {
        $tn = $sig[$i + 1]['t'] ?? null; $long = $s['side'] === 'L';
        $R = $long ? $s['e'] - $s['sl'] : $s['sl'] - $s['e'];
        $eEnd = $B[$s['t']]['m'] + $mult;                       // filled on the signal bar's close
        $v = [];
        foreach (ZB_TARGETS as $o) {
            $ema = $o[0] === 'e';
            $Tx = $ema ? null : ($o[0] === 'p' ? $s['tp'] : ($long ? $s['e'] + $o[0] * $R : $s['e'] - $o[0] * $R));
            foreach (ZB_TIMES as $tm) {
                $cap = $tm[0] === 'p' ? null : ($tm[0] === 'c' ? 'c' : $eEnd + $tm[0]);
                [$k, $x, $why] = $walk($s, $tn, $Tx, $ema, $cap);
                $v[] = [round(($long ? $x - $s['e'] : $s['e'] - $x) / $R, 3), $why, $B[$k]['m'] + 1440 * (int)round((strtotime($B[$k]['d']) - strtotime($B[$s['t']]['d'])) / 86400), round($x, 4)];
            }
        }
        $V[$s['t']] = $v;
    }
    $trades = [];
    foreach ($eng['trades'] as $t) {
        $long = $t['side'] === 'L';
        $R = $long ? $t['e'] - $t['sl'] : $t['sl'] - $t['e'];
        $r = ($long ? $t['x'] - $t['e'] : $t['e'] - $t['x']) / $R;
        $trades[] = [
            'd' => $B[$t['t']]['d'], 'sym' => $sym, 'side' => $t['side'], 'm' => $B[$t['t']]['m'],
            'e' => round($t['e'], 4), 'sl' => round($t['sl'], 4), 'tp' => round($t['tp'], 4),
            'pd' => $B[$t['pt']]['d'], 'pm' => $B[$t['pt']]['m'], 'vr' => round($t['vr'], 2),
            'x' => round($t['x'], 4), 'xd' => $B[$t['xt']]['d'], 'xm' => $B[$t['xt']]['m'], 'why' => $t['why'],
            'r' => round($r, 3), 'rp' => round($R / $t['e'] * 100, 3), 'on' => $B[$t['xt']]['d'] !== $B[$t['t']]['d'] ? 1 : 0,
            'v' => $V[$t['t']],    // [r, why, exit minute (+1440 per day later), exit price] for each exit option (see 'exits')
        ];
    }
    return ['dates' => $dates, 'pulls' => $pulls, 'trades' => $trades];
}

function combine(array $symbols, array $state, string $dir, string $outFile, int $tf): void {
    $files = [];
    foreach ($symbols as $s) $files[$s] = read_json($dir . '/' . $s . '.json') ?? ['error' => 'missing', 'dates' => [], 'pulls' => [], 'trades' => []];
    $cal = $files['SPY']['dates'] ?? [];
    if (!$cal) { foreach ($files as $f) $cal = array_merge($cal, $f['dates'] ?? []); $cal = array_values(array_unique($cal)); sort($cal); }
    $sessions = array_slice($cal, -ZB_SESSIONS);
    $inWin = array_flip($sessions);
    $cover = []; $pulls = []; $trades = []; $missing = [];
    foreach ($symbols as $s) {
        $f = $files[$s];
        if (!empty($f['error'])) $missing[] = ['sym' => $s, 'error' => $f['error'], 'stale' => !empty($f['stale'])];
        $have = array_flip($f['dates'] ?? []);
        $row = '';
        foreach ($sessions as $d) $row .= isset($have[$d]) ? '1' : '0';
        $cover[$s] = $row;
        foreach ($f['pulls'] ?? [] as $g) if (isset($inWin[$g[0]])) $pulls[] = [$s, $g[0], $g[1], $g[2], $g[3]];
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
        'exits'    => ['targets' => ZB_TARGETS, 'times' => ZB_TIMES],   // v[target * count(times) + time] on each trade: [r, t target · s stop · m time · r replaced · o open · e white-line close, exit, price]
        'built'    => time(),
        'build'    => $state['build'],
        'symbols'  => $symbols,
        'sessions' => $sessions,
        'cover'    => $cover,      // one character per session: 1 data, 0 none
        'pulls'    => $pulls,      // [sym, date, minute the pullback began, L|S, T trade · i signal while in a trade · v reclaim on low volume · c reclaim on the wrong-colour candle · x cancelled before any reclaim · n still waiting]
        'trades'   => $trades,
        'missing'  => $missing,
    ]);
}
