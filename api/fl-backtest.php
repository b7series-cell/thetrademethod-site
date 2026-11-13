<?php
/* =====================================================================
   api/fl-backtest.php — backtest of the Fashionably Late setup, using the
   signals of pine/ema-vwap-reversal-cross.pine (EMA/VWAP Reversal Cross
   R1.2) at its default settings, on 2-minute regular-session Massive bars.

   Runs on the server so the API key never leaves it (same config.php as
   bars.php). Results are saved to api/cache/fl-backtest.json.

   Nightly (SiteGround → Devs → Cron Jobs), weekdays after the close:
       php /home/customer/www/<your-site>/public_html/api/fl-backtest.php
       (builds the 2, 5 and 15-minute runs in turn; --tf=5 builds just one)
   Every request takes &tf=2|5|15 (default 2). Each trade also carries 'v': its result
   under every exit option in 'exits' (target × time limit), so the page can switch instantly.
   From the page (private preview token required):
       GET ?preview=T                  → the saved results
       GET ?preview=T&run=1[&fresh=1]  → rebuild a few tickers per call

   The indicator, bar by bar (same code as js/fl-live.js):
     9 EMA of the close; session VWAP of hlc3 from the 9:30 bar
     pivots: 3 bars each side; only a pivot from today arms (cleared each day)
     BUY  = 9 EMA crosses over VWAP, inside window A (9:45–10:45) or B
            (10:46–13:30), with a pivot low armed; the pivot is used up
     SELL = the mirror with a pivot high
     trade: entry the signal bar's close; distance = entry − pivot (long);
            target = entry + 1 × distance, stop = entry − distance ÷ 3
     exits: stop first, then target, checked from the next bar against its
            low/high, fills at the level; exits aren't time-gated and a trade
            can run past the close, as in the indicator. A new signal while a
            trade is open replaces it — the backtest closes the old one at that
            bar's close (the indicator just drops it).
   No slippage or commissions.
   ===================================================================== */

declare(strict_types=1);

const FB_WATCHLIST = ['GOOG', 'MU', 'NVDA', 'SPCX', 'TSLA', 'AAPL', 'AMD', 'SNDK', 'QQQ',
                      'DELL', 'INTC', 'META', 'IBM', 'HOOD', 'MSFT', 'SPY'];
const FB_SESSIONS  = 90;
const FB_LOOKBACK  = 140;    // calendar days: 90 sessions + a few for the EMA
const FB_CHUNK     = 25;
const FB_STEP_SECS = 15;
const FB_TFS     = [2, 5, 15];   // minutes per bar; the first is the page's own and keeps the original file names
const FB_TARGETS = [['p', '1× the distance (3R)'], [1, '1R'], [2, '2R'], [5, '5R']];   // exit options: 'p' the page rule, a number = that many R
const FB_TIMES   = [['p', 'None (holds overnight)'], [30, '30 min'], [60, '60 min'], ['c', 'Flat at 4:00']];   // time limit: 'p' the page rule, minutes after entry, 'c' the session's last bar

const FO = ['ema' => 9, 'pivot' => 3, 'tpMult' => 1.0, 'slDiv' => 3.0, 'winA' => [585, 645], 'winB' => [646, 810]];

$CLI = PHP_SAPI === 'cli';

/* engine self-test: php fl-backtest.php --engine bars.json  → signals as JSON */
if ($CLI && ($argv[1] ?? '') === '--engine') {
    $j = json_decode((string)file_get_contents($argv[2]), true);
    $TZ = new DateTimeZone('America/New_York');
    $B = [];
    foreach ($j['bars'] as $r) {
        [$d, $m] = et_parts((int)$r[0], $TZ);
        if ($m < 570 || $m >= 960) continue;
        $B[] = ['d' => $d, 'm' => $m, 'o' => (float)$r[1], 'h' => (float)$r[2], 'l' => (float)$r[3], 'c' => (float)$r[4], 'v' => (float)$r[5]];
    }
    $res = fl_engine($B);
    echo json_encode(array_map(fn($s) => [$s['t'], $s['side'], round($s['e'], 4), round($s['tp'], 4), round($s['sl'], 4)], $res['signals'])), PHP_EOL;
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

$symbols = array_values(array_unique(array_map('strtoupper', (array)($cfg['fl_bt_symbols'] ?? $cfg['bt_symbols'] ?? FB_WATCHLIST))));
if (!in_array('SPY', $symbols, true)) $symbols[] = 'SPY';       // session calendar
$symbols = array_values(array_filter($symbols, fn($s) => (bool)preg_match('/^[A-Z][A-Z.]{0,5}$/', $s)));
$API_BASE = rtrim((string)($cfg['api_base'] ?? 'https://api.massive.com'), '/');   // leave unset
$TZ = new DateTimeZone('America/New_York');

/* timeframe: ?tf=5 on the web, --tf=5 on the command line (no --tf builds all of them) */
$tfArg = null;
if ($CLI) { foreach ($argv as $a) if (preg_match('/^--tf=(\d+)$/', $a, $mm)) $tfArg = (int)$mm[1]; }
else $tfArg = (int)($_GET['tf'] ?? FB_TFS[0]);
if ($tfArg !== null && !in_array($tfArg, FB_TFS, true)) out_json(400, ['error' => 'bad_timeframe']);
function tf_paths(string $cacheDir, int $tf): array {
    $sfx = $tf === FB_TFS[0] ? '' : '-' . $tf . 'm';
    return [$cacheDir . '/fl-bt' . $sfx, $cacheDir . '/fl-backtest' . $sfx . '.json'];
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
foreach ($tfArg === null ? FB_TFS : [$tfArg] as $tf) {
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
    $from = (clone $to)->modify('-' . FB_LOOKBACK . ' days');
    $t0 = microtime(true);
    foreach ($symbols as $sym) {
        $f = read_json($btDir . '/' . $sym . '.json');
        if ($f && ($f['build'] ?? '') === $state['build']) continue;
        if (!$CLI && microtime(true) - $t0 > FB_STEP_SECS) break;
        $res = ['build' => $state['build'], 'sym' => $sym, 'error' => null, 'dates' => [], 'crosses' => [], 'trades' => []];
        try {
            $B = vb_fetch($sym, $API_BASE, (string)$cfg['api_key'], $from, $to, $TZ, $tf);
            $res = array_merge($res, fl_trades($sym, $B, $tf));
        } catch (Throwable $e) {
            $res['error'] = $e->getMessage();
            if ($f && !empty($f['dates'])) $res = array_merge($f, ['build' => $state['build'], 'error' => $res['error'], 'stale' => true]);
        }
        write_json($btDir . '/' . $sym . '.json', $res);
        if ($CLI) fwrite(STDOUT, sprintf("%-5s %s\n", $sym, $res['error'] ?? (count($res['trades']) . ' trades, ' . count($res['crosses']) . ' crosses')));
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
        $end = (clone $cur)->modify('+' . (FB_CHUNK - 1) . ' days');
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
   the indicator — a line-for-line twin of run() in js/fl-live.js
   ===================================================================== */
function fl_engine(array $B): array {
    $n = count($B); $P = FO['pivot']; $k2 = 2 / (FO['ema'] + 1);
    $ema = []; $vw = []; $cpv = 0.0; $cv = 0.0;
    $armL = false; $armH = false; $revL = null; $revH = null; $revLi = null; $revHi = null;
    $crosses = []; $signals = []; $trades = []; $tr = null;
    for ($t = 0; $t < $n; $t++) {
        $b = $B[$t];
        $newDay = $t === 0 || $b['d'] !== $B[$t - 1]['d'];
        $ema[$t] = $t === 0 ? $b['c'] : $ema[$t - 1] + ($b['c'] - $ema[$t - 1]) * $k2;
        if ($newDay) { $cpv = 0.0; $cv = 0.0; }
        $hlc3 = ($b['h'] + $b['l'] + $b['c']) / 3; $cpv += $hlc3 * $b['v']; $cv += $b['v'];
        $vw[$t] = $cv > 0 ? $cpv / $cv : $hlc3;
        /* reversal tracking: same-day pivots only */
        if ($newDay) { $armL = false; $armH = false; $revL = null; $revH = null; $revLi = null; $revHi = null; }
        $k = $t - $P;
        if ($k - $P >= 0 && $B[$k]['d'] === $b['d']) {
            $isL = true; $isH = true;
            for ($q = $k - $P; $q <= $k + $P; $q++) {
                if ($q === $k) continue;
                if ($B[$q]['l'] <= $B[$k]['l']) $isL = false;
                if ($B[$q]['h'] >= $B[$k]['h']) $isH = false;
            }
            if ($isL) { $armL = true; $revL = $B[$k]['l']; $revLi = $k; }
            if ($isH) { $armH = true; $revH = $B[$k]['h']; $revHi = $k; }
        }
        /* the cross, the windows */
        $up = $t > 0 && $ema[$t] > $vw[$t] && $ema[$t - 1] <= $vw[$t - 1];
        $dn = $t > 0 && $ema[$t] < $vw[$t] && $ema[$t - 1] >= $vw[$t - 1];
        $m = $b['m'];
        $win = ($m >= FO['winA'][0] && $m < FO['winA'][1]) ? 'A' : (($m >= FO['winB'][0] && $m < FO['winB'][1]) ? 'B' : '');
        $buy = $win !== '' && $up && $armL;
        $sell = $win !== '' && $dn && $armH;
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
        /* crosses, for the funnel */
        if ($up || $dn) {
            $side = $up ? 'L' : 'S';
            $code = $win === '' ? 'o' : (($up ? $armL : $armH) ? 'T' : 'p');
            if ($code === 'T') { $dist = $up ? $b['c'] - $revL : $revH - $b['c']; if (!($dist > 0)) $code = 'd'; }
            $crosses[] = ['t' => $t, 'side' => $side, 'win' => $win, 'code' => $code];
        }
        foreach ([[$buy, 'L'], [$sell, 'S']] as [$fire, $side]) {
            if (!$fire) continue;
            $piv = $side === 'L' ? $revL : $revH;
            $dist = $side === 'L' ? $b['c'] - $piv : $piv - $b['c'];
            if ($piv !== null && $dist > 0) {
                if ($tr !== null) { $trades[] = $tr + ['xt' => $t, 'x' => $b['c'], 'why' => 'replaced']; }
                $tp = $side === 'L' ? $b['c'] + $dist * FO['tpMult'] : $b['c'] - $dist * FO['tpMult'];
                $sl = $side === 'L' ? $b['c'] - $dist / FO['slDiv'] : $b['c'] + $dist / FO['slDiv'];
                $tr = ['t' => $t, 'side' => $side, 'win' => $win, 'e' => $b['c'], 'tp' => $tp, 'sl' => $sl, 'piv' => $piv,
                       'pt' => $side === 'L' ? $revLi : $revHi];
                $signals[] = $tr;
            }
            if ($side === 'L') $armL = false; else $armH = false;
        }
    }
    if ($tr !== null) $trades[] = $tr + ['xt' => $n - 1, 'x' => $B[$n - 1]['c'], 'why' => 'open'];
    return ['signals' => $signals, 'trades' => $trades, 'crosses' => $crosses];
}

function fl_trades(string $sym, array $B, int $mult = 2): array {
    $dates = array_values(array_unique(array_column($B, 'd')));
    if (count($B) < 50) return ['dates' => $dates, 'crosses' => [], 'trades' => []];
    $eng = fl_engine($B);
    $crosses = array_map(fn($c) => [$B[$c['t']]['d'], $B[$c['t']]['m'], $c['side'], $c['win'], $c['code']], $eng['crosses']);
    /* every exit option for every signal: the trade set doesn't change (the indicator signals
       whether or not a trade is open); a later signal on the ticker still replaces an open trade */
    $n = count($B); $sig = $eng['signals'];
    $walk = function (array $s, ?int $tn, float $Tx, $cap) use ($B, $n, $mult) {
        $long = $s['side'] === 'L'; $d0 = $B[$s['t']]['d'];
        for ($k = $s['t'] + 1; $k < $n; $k++) {
            $bb = $B[$k];
            if ($long) { if ($bb['l'] <= $s['sl']) return [$k, $s['sl'], 'stop']; if ($bb['h'] >= $Tx) return [$k, $Tx, 'target']; }
            else { if ($bb['h'] >= $s['sl']) return [$k, $s['sl'], 'stop']; if ($bb['l'] <= $Tx) return [$k, $Tx, 'target']; }
            if ($cap === 'c' && ($k + 1 >= $n || $B[$k + 1]['d'] !== $d0)) return [$k, $bb['c'], 'time'];
            if (is_int($cap) && ($bb['d'] !== $d0 || $bb['m'] + $mult >= $cap)) return [$k, $bb['c'], 'time'];
            if ($k === $tn) return [$k, $bb['c'], 'replaced'];
        }
        return [$n - 1, $B[$n - 1]['c'], 'open'];
    };
    $V = [];
    foreach ($sig as $i => $s) {
        $tn = $sig[$i + 1]['t'] ?? null; $long = $s['side'] === 'L';
        $dist = $long ? $s['e'] - $s['piv'] : $s['piv'] - $s['e']; $R = $dist / FO['slDiv'];
        $eEnd = $B[$s['t']]['m'] + $mult;                       // filled on the signal bar's close
        $v = [];
        foreach (FB_TARGETS as $o) {
            $Tx = $o[0] === 'p' ? $s['tp'] : ($long ? $s['e'] + $o[0] * $R : $s['e'] - $o[0] * $R);
            foreach (FB_TIMES as $tm) {
                $cap = $tm[0] === 'p' ? null : ($tm[0] === 'c' ? 'c' : $eEnd + $tm[0]);
                [$k, $x, $why] = $walk($s, $tn, $Tx, $cap);
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
            'd' => $B[$t['t']]['d'], 'sym' => $sym, 'side' => $t['side'], 'win' => $t['win'], 'm' => $B[$t['t']]['m'],
            'e' => round($t['e'], 4), 'sl' => round($t['sl'], 4), 'tp' => round($t['tp'], 4), 'piv' => round($t['piv'], 4),
            'pm' => $B[$t['pt']]['m'], 'x' => round($t['x'], 4), 'xd' => $B[$t['xt']]['d'], 'xm' => $B[$t['xt']]['m'], 'why' => $t['why'],
            'r' => round($r, 3), 'rp' => round($R / $t['e'] * 100, 3), 'on' => $B[$t['xt']]['d'] !== $B[$t['t']]['d'] ? 1 : 0,
            'v' => $V[$t['t']],    // [r, why, exit minute (+1440 per day later), exit price] for each exit option (see 'exits')
        ];
    }
    return ['dates' => $dates, 'crosses' => $crosses, 'trades' => $trades];
}

function combine(array $symbols, array $state, string $dir, string $outFile, int $tf): void {
    $files = [];
    foreach ($symbols as $s) $files[$s] = read_json($dir . '/' . $s . '.json') ?? ['error' => 'missing', 'dates' => [], 'crosses' => [], 'trades' => []];
    $cal = $files['SPY']['dates'] ?? [];
    if (!$cal) { foreach ($files as $f) $cal = array_merge($cal, $f['dates'] ?? []); $cal = array_values(array_unique($cal)); sort($cal); }
    $sessions = array_slice($cal, -FB_SESSIONS);
    $inWin = array_flip($sessions);
    $cover = []; $crosses = []; $trades = []; $missing = [];
    foreach ($symbols as $s) {
        $f = $files[$s];
        if (!empty($f['error'])) $missing[] = ['sym' => $s, 'error' => $f['error'], 'stale' => !empty($f['stale'])];
        $have = array_flip($f['dates'] ?? []);
        $row = '';
        foreach ($sessions as $d) $row .= isset($have[$d]) ? '1' : '0';
        $cover[$s] = $row;
        foreach ($f['crosses'] ?? [] as $g) if (isset($inWin[$g[0]])) $crosses[] = [$s, $g[0], $g[1], $g[2], $g[3], $g[4]];
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
        'exits'    => ['targets' => FB_TARGETS, 'times' => FB_TIMES],   // v[target * count(times) + time] on each trade: [r, t target · s stop · m time · r replaced · o open · p PMH · e EMA · b breakeven · 2 target 2, exit, price]
        'built'    => time(),
        'build'    => $state['build'],
        'symbols'  => $symbols,
        'sessions' => $sessions,
        'cover'    => $cover,      // one character per session: 1 data, 0 none
        'crosses'  => $crosses,    // [sym, date, minute, L|S, A|B|'', T trade · o outside the windows · p no pivot armed · d pivot on the wrong side]
        'trades'   => $trades,
        'missing'  => $missing,
    ]);
}
