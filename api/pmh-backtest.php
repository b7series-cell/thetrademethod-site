<?php
/* =====================================================================
   api/pmh-backtest.php — backtest of the Premarket High Break rules over
   a fixed watchlist, on 2-minute Massive bars with pre-market.

   Runs on the server so the API key never leaves it (same config.php as
   bars.php). Results are saved to api/cache/pmh-backtest.json, which the
   PMH Break page reads.

   Nightly (SiteGround → Devs → Cron Jobs), weekdays after the close:
       php /home/customer/www/<your-site>/public_html/api/pmh-backtest.php
       (builds the 2, 5 and 15-minute runs in turn; --tf=5 builds just one)
   Every request takes &tf=2|5|15 (default 2). Each trade also carries 'v': its result
   under every exit option in 'exits' (target × time limit), so the page can switch instantly.
   From the page (private preview token required):
       GET ?preview=T              → the saved results
       GET ?preview=T&run=1[&fresh=1] → rebuild a few tickers per call;
                                        the page repeats it until complete

   Rules tested (the mechanical part of the page; catalyst, sector and
   "room overhead" need a human):
     market   SPY's prior daily close above its 10- and 20-day SMA
     gate     09:30 open above yesterday's high AND above the prior close
     trigger  a 2-min bar opening 09:30–09:45 whose close crosses up through
              the premarket high (04:00–09:30), closes above PDH, on ≥3×
              time-of-day volume (same slot, last 5 sessions, ≥3 samples)
     candle   green body, upper wick ≤ half the body (else keep looking)
     entry    decided on the trigger bar's close, filled at the next bar's open;
              stop $0.01 under the trigger bar's low (skip if the open is already
              at or under it)
     manage   trim half at the open + 1 ATR(14) (or +1R if already past it);
              exit everything on a close back under the PMH; after the trim,
              exit the runner on the first close under the 9 EMA; stop
              fills at the stop (or the open if it gaps through); flat at 11:00
   One trade per ticker per day. No slippage or commissions.
   ===================================================================== */

declare(strict_types=1);

const BT_WATCHLIST = ['GOOG', 'MU', 'NVDA', 'SPCX', 'TSLA', 'AAPL', 'AMD', 'SNDK', 'QQQ',
                      'DELL', 'INTC', 'META', 'IBM', 'HOOD', 'MSFT', 'SPY'];
const BT_SESSIONS  = 90;    // sessions kept in the results (the page shows 30 / 60 / 90)
const BT_LOOKBACK  = 170;   // calendar days fetched: 90 sessions + warm-up for ATR, SMA20, volume
const BT_CHUNK     = 25;    // calendar days per request (stays under Massive's 50,000 base-minute limit)
const BT_STEP_SECS = 15;    // web runs stop starting new tickers after this many seconds
const BT_TFS     = [2, 5, 15];   // minutes per bar; the first is the page's own and keeps the original file names
const BT_TARGETS = [['p', 'Trim at +1 ATR, runner'], [1, '1R'], [2, '2R'], [3, '3R']];   // exit options: 'p' the page rule, a number = that many R
const BT_TIMES   = [['p', 'Flat at 11:00'], [30, '30 min'], [60, '60 min'], ['c', 'Hold to 4:00']];   // time limit: 'p' the page rule, minutes after entry, 'c' the session's last bar

$CLI = PHP_SAPI === 'cli';

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

$symbols = array_values(array_unique(array_map('strtoupper', (array)($cfg['bt_symbols'] ?? BT_WATCHLIST))));
if (!in_array('SPY', $symbols, true)) $symbols[] = 'SPY';       // the market filter needs it
$symbols = array_values(array_filter($symbols, fn($s) => (bool)preg_match('/^[A-Z][A-Z.]{0,5}$/', $s)));
$API_BASE = rtrim((string)($cfg['api_base'] ?? 'https://api.massive.com'), '/');   // leave unset
$TZ = new DateTimeZone('America/New_York');

/* timeframe: ?tf=5 on the web, --tf=5 on the command line (no --tf builds all of them) */
$tfArg = null;
if ($CLI) { foreach ($argv as $a) if (preg_match('/^--tf=(\d+)$/', $a, $mm)) $tfArg = (int)$mm[1]; }
else $tfArg = (int)($_GET['tf'] ?? BT_TFS[0]);
if ($tfArg !== null && !in_array($tfArg, BT_TFS, true)) out_json(400, ['error' => 'bad_timeframe']);
function tf_paths(string $cacheDir, int $tf): array {
    $sfx = $tf === BT_TFS[0] ? '' : '-' . $tf . 'm';
    return [$cacheDir . '/bt' . $sfx, $cacheDir . '/pmh-backtest' . $sfx . '.json'];
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
foreach ($tfArg === null ? BT_TFS : [$tfArg] as $tf) {
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
    $from = (clone $to)->modify('-' . BT_LOOKBACK . ' days');
    $t0 = microtime(true);
    foreach ($symbols as $sym) {
        $f = read_json($btDir . '/' . $sym . '.json');
        if ($f && ($f['build'] ?? '') === $state['build']) continue;            // done this build
        if (!$CLI && microtime(true) - $t0 > BT_STEP_SECS) break;              // next call continues
        $res = ['build' => $state['build'], 'sym' => $sym, 'error' => null, 'daily' => [], 'outcomes' => [], 'trades' => []];
        try {
            $days = bt_fetch($sym, $API_BASE, (string)$cfg['api_key'], $from, $to, $TZ, $tf);
            $res = array_merge($res, bt_run($sym, $days, $tf));
        } catch (Throwable $e) {
            $res['error'] = $e->getMessage();
            if ($f && !empty($f['daily'])) {          // keep the last good result
                $res = array_merge($f, ['build' => $state['build'], 'error' => $res['error'], 'stale' => true]);
            }
        }
        write_json($btDir . '/' . $sym . '.json', $res);
        if ($CLI) fwrite(STDOUT, sprintf("%-5s %s\n", $sym, $res['error'] ?? (count($res['trades']) . ' trades')));
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

/* 2-minute bars 04:00–16:00 ET, grouped as [date => [minute => [o,h,l,c,v]]] */
function bt_fetch(string $sym, string $base, string $key, DateTime $from, DateTime $to, DateTimeZone $tz, int $mult): array {
    $days = [];
    $offsets = [];
    $cur = clone $from;
    while ($cur <= $to) {
        $end = (clone $cur)->modify('+' . (BT_CHUNK - 1) . ' days');
        if ($end > $to) $end = clone $to;
        $next = sprintf('%s/v2/aggs/ticker/%s/range/%d/minute/%s/%s?adjusted=true&sort=asc&limit=50000&apiKey=%s',
            $base, rawurlencode($sym), $mult, $cur->format('Y-m-d'), $end->format('Y-m-d'), rawurlencode($key));
        $pages = 0;
        while ($next && $pages < 10) {
            [$code, $body] = http_get($next);
            $json = json_decode($body, true);
            if ($code !== 200 || !is_array($json)) throw new RuntimeException('upstream_' . $code);
            foreach (($json['results'] ?? []) as $r) {
                $t = (int)$r['t'];
                $hk = intdiv($t, 3600000);
                if (!isset($offsets[$hk])) $offsets[$hk] = $tz->getOffset(new DateTime('@' . intdiv($t, 1000)));
                $local = intdiv($t, 1000) + $offsets[$hk];
                $min = intdiv($local % 86400, 60);
                if ($min < 240 || $min >= 960) continue;
                $days[gmdate('Y-m-d', $local)][$min] = [(float)$r['o'], (float)$r['h'], (float)$r['l'], (float)$r['c'], (float)($r['v'] ?? 0)];
            }
            $next = !empty($json['next_url']) ? $json['next_url'] . '&apiKey=' . rawurlencode($key) : null;
            $pages++;
        }
        $cur = (clone $end)->modify('+1 day');
        usleep(120000);
    }
    ksort($days);
    foreach ($days as &$d) ksort($d);
    unset($d);
    return $days;
}

/* the rules, day by day */
function bt_run(string $sym, array $days, int $mult = 2): array {
    $dates = array_keys($days);
    $daily = [];                                         // regular-session OHLC per date
    foreach ($dates as $d) {
        $o = $h = $l = $c = null;
        foreach ($days[$d] as $m => $b) {
            if ($m < 570 || $m >= 960) continue;
            if ($o === null) { $o = $b[0]; $h = $b[1]; $l = $b[2]; }
            $h = max($h, $b[1]); $l = min($l, $b[2]); $c = $b[3];
        }
        if ($o !== null) $daily[$d] = [$o, $h, $l, $c];
    }
    $rthDates = array_keys($daily);
    $outcomes = [];
    $trades = [];

    foreach ($rthDates as $p => $d) {
        if ($p < 15) { $outcomes[$d] = 'n'; continue; }                       // warm-up for ATR(14)
        $pd = $daily[$rthDates[$p - 1]];
        $atr = 0.0;
        for ($q = $p - 14; $q < $p; $q++) {
            [, $hh, $ll] = $daily[$rthDates[$q]];
            $pc = $daily[$rthDates[$q - 1]][3];
            $atr += max($hh - $ll, abs($hh - $pc), abs($ll - $pc));
        }
        $atr /= 14;

        $bars = $days[$d];
        $pmH = $pmL = null;
        foreach ($bars as $m => $b) {
            if ($m >= 570) break;
            $pmH = $pmH === null ? $b[1] : max($pmH, $b[1]);
            $pmL = $pmL === null ? $b[2] : min($pmL, $b[2]);
        }
        if ($pmH === null) { $outcomes[$d] = 'n'; continue; }

        $open = $daily[$d][0];
        if (!($open > $pd[1] && $open > $pd[3])) { $outcomes[$d] = 'g'; continue; }

        /* 9 EMA on every 2-minute bar from 04:00 */
        $ema = []; $e = null;
        foreach ($bars as $m => $b) { $e = $e === null ? $b[3] : $e + ($b[3] - $e) * 0.2; $ema[$m] = $e; }

        $mins = array_keys($bars);
        $reason = 't';                                    // t no trigger < v volume < c candle
        $trade = null;
        foreach ($mins as $i => $m) {
            if ($m < 570) continue;
            if ($m >= 585) break;
            if ($i === 0) continue;
            $b = $bars[$m];
            $prevC = $bars[$mins[$i - 1]][3];
            if (!($prevC <= $pmH && $b[3] > $pmH && $b[3] > $pd[1])) continue;

            /* time-of-day volume: same slot, most recent 5 earlier sessions with volume */
            $hist = [];
            for ($k = array_search($d, $dates, true) - 1; $k >= 0 && count($hist) < 5; $k--) {
                $v = $days[$dates[$k]][$m][4] ?? 0;
                if ($v > 0) $hist[] = $v;
            }
            $rvol = count($hist) ? $b[4] / (array_sum($hist) / count($hist)) : 0;
            if (count($hist) < 3 || $rvol < 3) { if ($reason === 't') $reason = 'v'; continue; }

            $body = $b[3] - $b[0];
            if ($body <= 0 || ($b[1] - $b[3]) > 0.5 * $body) { $reason = 'c'; continue; }

            /* the decision is made on the close; the fill comes at the next bar's open */
            if (!isset($mins[$i + 1])) { $reason = 'x'; continue; }
            $em = $mins[$i + 1];
            $E = $bars[$em][0];
            $S = round($b[2] - 0.01, 4);
            $R = $E - $S;
            if ($R <= 0) { $reason = 'x'; continue; }               // next bar opened at or under the stop
            $T = $open + $atr; $tt = 'atr';
            if ($T <= $E) { $T = $E + $R; $tt = '1r'; }

            /* walk the trade under one exit option: $kR 'p' = the page's management (trim at T,
               out on a close under the PMH, runner out on a close under the 9 EMA), a number =
               a plain bracket at that many R; $cap = flat on the close of the first bar that
               ends at or after this minute */
            $walk = function ($kR, int $cap) use ($i, $mins, $bars, $E, $S, $T, $R, $pmH, $ema, $mult) {
                $trim = null; $x = null; $xm = null; $why = null;
                $Tk = $kR === 'p' ? null : $E + $kR * $R;
                for ($j = $i + 1; $j < count($mins); $j++) {
                    $mm = $mins[$j]; $bb = $bars[$mm];
                    if ($bb[0] <= $S) { $x = $bb[0]; $why = 'stop'; }
                    elseif ($bb[2] <= $S) { $x = $S; $why = 'stop'; }
                    elseif ($Tk !== null) {
                        if ($bb[0] >= $Tk) { $x = $bb[0]; $why = 'target'; }
                        elseif ($bb[1] >= $Tk) { $x = $Tk; $why = 'target'; }
                        elseif ($mm + $mult >= $cap) { $x = $bb[3]; $why = 'time'; }
                    } else {
                        if ($trim === null && $bb[1] >= $T) $trim = max($T, $bb[0]);
                        if ($bb[3] < $pmH) { $x = $bb[3]; $why = 'pmh'; }
                        elseif ($trim !== null && $bb[3] < $ema[$mm]) { $x = $bb[3]; $why = 'ema'; }
                        elseif ($mm + $mult >= $cap) { $x = $bb[3]; $why = 'time'; }
                    }
                    if ($why) { $xm = $mm; break; }
                }
                if (!$why) { $lm = end($mins); $x = $bars[$lm][3]; $xm = $lm; $why = 'time'; }
                $r = $trim !== null ? (0.5 * ($trim - $E) + 0.5 * ($x - $E)) / $R : ($x - $E) / $R;
                return [$x, $xm, $why, $trim, $r];
            };
            $caps = array_map(fn($o) => $o[0] === 'p' ? 660 : ($o[0] === 'c' ? 960 : $em + $o[0]), BT_TIMES);
            $v = [];
            foreach (BT_TARGETS as $o) foreach ($caps as $cap) { $w = $walk($o[0], $cap); $v[] = [round($w[4], 3), $w[2], $w[1], round($w[0], 4)]; }
            [$x, $xm, $why, $trim, $r] = $walk('p', $caps[0]);

            $trade = [
                'd' => $d, 'sym' => $sym, 'm' => $m, 'em' => $em, 'tc' => round($b[3], 4),
                'e' => round($E, 4), 's' => round($S, 4), 't' => round($T, 4), 'tt' => $tt,
                'trim' => $trim === null ? null : round($trim, 4),
                'x' => round($x, 4), 'xm' => $xm, 'why' => $why,
                'r' => round($r, 3), 'rp' => round($R / $E * 100, 2), 'rv' => round($rvol, 1),
                'pmh' => round($pmH, 4), 'pdh' => round($pd[1], 4), 'atr' => round($atr, 4),
                'v' => $v,      // [r, why, exit minute, exit price] for each exit option (see 'exits')
            ];
            break;
        }
        if ($trade) { $trades[] = $trade; $outcomes[$d] = 'T'; }
        else $outcomes[$d] = $reason;
    }
    return ['daily' => $daily, 'outcomes' => $outcomes, 'trades' => $trades];
}

function combine(array $symbols, array $state, string $dir, string $outFile, int $tf): void {
    $files = [];
    foreach ($symbols as $s) $files[$s] = read_json($dir . '/' . $s . '.json') ?? ['error' => 'missing', 'daily' => [], 'outcomes' => [], 'trades' => []];

    /* session calendar from SPY (falls back to every date seen) */
    $spy = $files['SPY']['daily'] ?? [];
    $cal = array_keys($spy);
    if (!$cal) { foreach ($files as $f) $cal = array_merge($cal, array_keys($f['daily'] ?? [])); $cal = array_values(array_unique($cal)); sort($cal); }
    $sessions = array_slice($cal, -BT_SESSIONS);

    /* market filter: SPY's prior close vs its 10 / 20-day SMA */
    $mkt = [];
    $spyDates = array_keys($spy);
    foreach ($sessions as $d) {
        $p = array_search($d, $spyDates, true);
        if ($p === false || $p < 20) { $mkt[] = null; continue; }
        $closes = [];
        for ($q = $p - 20; $q < $p; $q++) $closes[] = $spy[$spyDates[$q]][3];
        $c = $closes[19];
        $sma10 = array_sum(array_slice($closes, 10)) / 10;
        $sma20 = array_sum($closes) / 20;
        $mkt[] = $c > $sma10 && $c > $sma20;
    }

    $inWin = array_flip($sessions);
    $outcomes = []; $trades = []; $missing = [];
    foreach ($symbols as $s) {
        $f = $files[$s];
        if (!empty($f['error'])) $missing[] = ['sym' => $s, 'error' => $f['error'], 'stale' => !empty($f['stale'])];
        $row = '';
        foreach ($sessions as $d) $row .= $f['outcomes'][$d] ?? 'n';
        $outcomes[$s] = $row;
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
        'exits'    => ['targets' => BT_TARGETS, 'times' => BT_TIMES],   // v[target * count(times) + time] on each trade: [r, t target · s stop · m time · r replaced · o open · p PMH · e EMA · b breakeven · 2 target 2, exit, price]
        'built'    => time(),
        'build'    => $state['build'],
        'symbols'  => $symbols,
        'sessions' => $sessions,
        'mkt'      => $mkt,
        'outcomes' => $outcomes,     // one character per session: n no data · g gate · t no trigger · v volume · c candle · x opened under stop · T trade
        'trades'   => $trades,
        'missing'  => $missing,
    ]);
}
