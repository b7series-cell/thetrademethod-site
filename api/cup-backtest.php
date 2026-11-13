<?php
/* =====================================================================
   api/cup-backtest.php — backtest of the Cup and Handle trade plan over
   a fixed watchlist, on Massive daily bars.

   Runs on the server so the API key never leaves it (same config.php as
   bars.php). Results are saved to api/cache/cup-backtest.json, which the
   Cup and Handle page reads. Daily bars go back five years (the most a
   Massive Stocks Starter plan allows); the first ~10 months of that are
   warm-up for the 200-day SMA and the first cups.

   Nightly (SiteGround → Devs → Cron Jobs), weekdays after the close:
       php /home/customer/www/<your-site>/public_html/api/cup-backtest.php
   Each trade also carries 'v': its result under every exit option in 'exits'
   (target × most days held), so the page can switch instantly.
   From the page (private preview token required):
       GET ?preview=T                  → the saved results
       GET ?preview=T&run=1[&fresh=1]  → rebuild a few tickers per call

   The page teaches the pattern by eye; these are the numbers that make it
   mechanical. Checked on each day's close, for a buy stop the next day:
     cup     left rim: a high that tops the 10 days before it and everything
             between it and the right rim; right rim within 5% of it,
             30–325 days later; depth 12–35%; the low in the middle 60% of
             the cup; at least 15% of its days closing in the bottom third
     handle  4–25 days after the right rim, never above it, holding the upper
             half of the cup, pulling back 2–15%
     filters uptrend (close above the 20/50/200-day SMA, 50-day higher than
             10 days ago); base volume (bottom-third days average less volume
             than the decline into it); handle volume under its 50-day average;
             clean air (no high in the year before the cup between the trigger
             and target 1); market (SPY above its 50 and 200-day SMA)
     entry   buy stop 0.07% above resistance (340 → 340.25); fills at the
             open if the stock gaps over it
     stop    1.5 × ATR(14) below the fill. Inside a day, a green bar is taken
             to trade open → low → high → close and a red bar open → high →
             low → close, so the fill day's low before the breakout isn't
             counted against the stop
     targets half at resistance + ⅓ of the cup depth, stop to breakeven, the
             rest at resistance + ⅔ (the page's 360 / 380 on a 60-point cup);
             60 trading days at most
   One trade at a time per ticker. No slippage or commissions.
   ===================================================================== */

declare(strict_types=1);

const CB_WATCHLIST = ['SPY', 'GOOG', 'MU', 'NVDA', 'SPCX', 'TSLA', 'AAPL', 'AMD', 'SNDK', 'QQQ',
                      'DELL', 'INTC', 'META', 'IBM', 'HOOD', 'MSFT'];
const CB_SESSIONS  = 1260;   // up to five years of results (the page shows 3M / 6M / 1Y / 2Y / 5Y)
const CB_LOOKBACKS = [1825, 1460, 1095];   // calendar days to fetch: five years, falling back if the plan allows less
const CB_STEP_SECS = 15;
const CB_TARGETS = [['p', 'Half at T1, rest at T2'], [1, '1R'], [2, '2R'], [3, '3R']];   // exit options: 'p' the page rule, a number = that many R
const CB_TIMES   = [['p', '60 days'], [10, '10 days'], [20, '20 days'], [120, '120 days']];        // most days held
const CO = [
    'rimLead' => 10, 'cupMin' => 30, 'cupMax' => 325, 'rimTol' => 0.05, 'depthMin' => 0.12, 'depthMax' => 0.35,
    'bottomLo' => 0.20, 'bottomHi' => 0.80, 'bottomShare' => 0.15, 'handleMin' => 4, 'handleMax' => 25,
    'handleDepthMin' => 0.02, 'handleDepthMax' => 0.15, 'trigPct' => 0.0007, 'stopAtr' => 1.5, 'maxHold' => 60,
];

$CLI = PHP_SAPI === 'cli';

/* engine self-test: php cup-backtest.php --engine bars.json [spy.json] */
if ($CLI && ($argv[1] ?? '') === '--engine') {
    $TZ = new DateTimeZone('America/New_York');
    $load = function (string $f) use ($TZ) {
        $j = json_decode((string)file_get_contents($f), true); $B = [];
        foreach ($j['bars'] as $r) $B[] = ['d' => et_date((int)$r[0], $TZ), 'o' => (float)$r[1], 'h' => (float)$r[2], 'l' => (float)$r[3], 'c' => (float)$r[4], 'v' => (float)$r[5]];
        return $B;
    };
    $B = $load($argv[2]);
    $mkt = isset($argv[3]) ? market_map($load($argv[3])) : [];
    echo json_encode(cup_run('TEST', $B, $mkt), JSON_PRETTY_PRINT), PHP_EOL;
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
$btDir    = $cacheDir . '/cup-bt';
$outFile  = $cacheDir . '/cup-backtest.json';
if (!is_dir($btDir)) @mkdir($btDir, 0755, true);

$symbols = array_values(array_unique(array_map('strtoupper', (array)($cfg['cup_bt_symbols'] ?? $cfg['bt_symbols'] ?? CB_WATCHLIST))));
$symbols = array_values(array_diff($symbols, ['SPY']));
array_unshift($symbols, 'SPY');                                   // first: the market filter reads it
$symbols = array_values(array_filter($symbols, fn($s) => (bool)preg_match('/^[A-Z][A-Z.]{0,5}$/', $s)));
$API_BASE = rtrim((string)($cfg['api_base'] ?? 'https://api.massive.com'), '/');   // leave unset
$TZ = new DateTimeZone('America/New_York');

$run = $CLI || !empty($_GET['run']);
if (!$run) {
    if (is_file($outFile)) {
        if (extension_loaded('zlib') && !ini_get('zlib.output_compression')) ob_start('ob_gzhandler');   // a few MB of JSON → a few hundred KB
        readfile($outFile); exit;
    }
    $st = read_json($btDir . '/state.json');
    out_json(404, ['error' => 'not_built', 'progress' => $st ? progress($st, $symbols, $btDir) : null]);
}

$lock = fopen($btDir . '/lock', 'c');
if (!$lock || !flock($lock, LOCK_EX | LOCK_NB)) out_json(409, ['error' => 'busy']);
@set_time_limit($CLI ? 0 : 120);
@ini_set('memory_limit', '256M');

$state = read_json($btDir . '/state.json');
if ($CLI || !empty($_GET['fresh']) || !$state) {
    $state = ['build' => date('Ymd-His') . '-' . bin2hex(random_bytes(3)), 'started' => time(), 'complete' => false];
    write_json($btDir . '/state.json', $state);
}
if (!empty($state['complete'])) out_json(200, ['complete' => true, 'progress' => progress($state, $symbols, $btDir)]);

$to   = new DateTime('now', $TZ);
$t0 = microtime(true);
foreach ($symbols as $sym) {
    $f = read_json($btDir . '/' . $sym . '.json');
    if ($f && ($f['build'] ?? '') === $state['build']) continue;
    if (!$CLI && microtime(true) - $t0 > CB_STEP_SECS) break;
    $res = ['build' => $state['build'], 'sym' => $sym, 'error' => null, 'dates' => [], 'cands' => [], 'trades' => []];
    try {
        $B = null; $err = null;
        foreach (CB_LOOKBACKS as $days) {                     // longest history the plan allows
            try { $B = cb_fetch($sym, $API_BASE, (string)$cfg['api_key'], (clone $to)->modify('-' . $days . ' days'), $to, $TZ); break; }
            catch (RuntimeException $e) { $err = $e; if (!in_array($e->getMessage(), ['upstream_403', 'upstream_401'], true)) throw $e; }
        }
        if ($B === null) throw $err;
        $mkt = [];
        if ($sym === 'SPY') { $mkt = market_map($B); $res['mkt'] = $mkt; }
        else { $spy = read_json($btDir . '/SPY.json'); $mkt = $spy['mkt'] ?? []; }
        $res = array_merge($res, cup_run($sym, $B, $mkt));
    } catch (Throwable $e) {
        $res['error'] = $e->getMessage();
        if ($f && !empty($f['dates'])) $res = array_merge($f, ['build' => $state['build'], 'error' => $res['error'], 'stale' => true]);
    }
    write_json($btDir . '/' . $sym . '.json', $res);
    if ($CLI) fwrite(STDOUT, sprintf("%-5s %s\n", $sym, $res['error'] ?? (count($res['trades']) . ' trades, ' . count($res['cands']) . ' breakouts')));
}

$prog = progress($state, $symbols, $btDir);
if ($prog['done'] >= $prog['total']) {
    combine($symbols, $state, $btDir, $outFile);
    $state['complete'] = true;
    write_json($btDir . '/state.json', $state);
    out_json(200, ['complete' => true, 'progress' => $prog]);
}
out_json(200, ['complete' => false, 'progress' => $prog]);


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
function et_date(int $tms, DateTimeZone $tz): string {
    return (new DateTime('@' . intdiv($tms, 1000)))->setTimezone($tz)->format('Y-m-d');
}
function cb_fetch(string $sym, string $base, string $key, DateTime $from, DateTime $to, DateTimeZone $tz): array {
    $bars = [];
    $next = sprintf('%s/v2/aggs/ticker/%s/range/1/day/%s/%s?adjusted=true&sort=asc&limit=50000&apiKey=%s',
        $base, rawurlencode($sym), $from->format('Y-m-d'), $to->format('Y-m-d'), rawurlencode($key));
    $pages = 0;
    while ($next && $pages < 5) {
        [$code, $body] = http_get($next);
        $json = json_decode($body, true);
        if ($code !== 200 || !is_array($json)) throw new RuntimeException('upstream_' . $code);
        foreach (($json['results'] ?? []) as $r) {
            $d = et_date((int)$r['t'], $tz);
            $bars[$d] = ['d' => $d, 'o' => (float)$r['o'], 'h' => (float)$r['h'], 'l' => (float)$r['l'], 'c' => (float)$r['c'], 'v' => (float)($r['v'] ?? 0)];
        }
        $next = !empty($json['next_url']) ? $json['next_url'] . '&apiKey=' . rawurlencode($key) : null;
        $pages++;
    }
    ksort($bars);
    return array_values($bars);
}
function sma(array $x, int $n): array {
    $out = array_fill(0, count($x), null); $s = 0.0;
    foreach ($x as $i => $v) { $s += $v; if ($i >= $n) $s -= $x[$i - $n]; if ($i >= $n - 1) $out[$i] = $s / $n; }
    return $out;
}
/* SPY: date => true when the close is above its 50 and 200-day SMA */
function market_map(array $B): array {
    $c = array_column($B, 'c'); $s50 = sma($c, 50); $s200 = sma($c, 200); $m = [];
    foreach ($B as $i => $b) if ($s200[$i] !== null) $m[$b['d']] = $b['c'] > $s50[$i] && $b['c'] > $s200[$i];
    return $m;
}

/* =====================================================================
   the pattern and the trade
   ===================================================================== */
function cup_run(string $sym, array $B, array $mkt): array {
    $n = count($B);
    $dates = array_column($B, 'd');
    if ($n < 260) return ['dates' => $dates, 'cands' => [], 'trades' => []];
    $o = array_column($B, 'o'); $h = array_column($B, 'h'); $l = array_column($B, 'l'); $c = array_column($B, 'c'); $v = array_column($B, 'v');
    $s20 = sma($c, 20); $s50 = sma($c, 50); $s200 = sma($c, 200); $av50 = sma($v, 50);
    $atr = array_fill(0, $n, null); $sum = 0.0;
    for ($i = 0; $i < $n; $i++) {
        $tr = $i === 0 ? $h[$i] - $l[$i] : max($h[$i] - $l[$i], abs($h[$i] - $c[$i - 1]), abs($l[$i] - $c[$i - 1]));
        if ($i < 14) { $sum += $tr; if ($i === 13) $atr[$i] = $sum / 14; } else $atr[$i] = ($atr[$i - 1] * 13 + $tr) / 14;
    }
    $avg = function (array $a, int $from, int $to): float { $s = 0.0; $k = 0; for ($i = $from; $i <= $to; $i++) { $s += $a[$i]; $k++; } return $k ? $s / $k : 0.0; };

    $cands = []; $trades = []; $busyUntil = -1;
    for ($s = 200; $s < $n - 1; $s++) {
        if ($s < $busyUntil) continue;
        /* right rim: highest high 4–25 days back, with nothing above it since */
        $r = -1; $rh = -INF;
        for ($k = $s - CO['handleMax']; $k <= $s - CO['handleMin']; $k++) if ($k >= 0 && $h[$k] > $rh) { $rh = $h[$k]; $r = $k; }
        if ($r < 0) continue;
        $after = -INF; for ($k = $r + 1; $k <= $s; $k++) $after = max($after, $h[$k]);
        if ($after >= $h[$r]) continue;
        /* left rim: the closest qualifying high 30–325 days before the right rim */
        $lft = -1; $im = -INF;
        for ($k = $r - 1; $k >= max(CO['rimLead'], $r - CO['cupMax']); $k--) {
            if ($k + 1 <= $r - 1) $im = max($im, $h[$k + 1]);
            if ($r - $k < CO['cupMin']) continue;
            if ($h[$k] < $im) continue;
            if (abs($h[$k] / $h[$r] - 1) > CO['rimTol']) continue;
            $lead = -INF; for ($q = $k - CO['rimLead']; $q < $k; $q++) $lead = max($lead, $h[$q]);
            if ($h[$k] < $lead) continue;
            $lft = $k; break;
        }
        if ($lft < 0) continue;
        $res = max($h[$lft], $h[$r]);
        $cl = INF; $b = -1;
        for ($k = $lft + 1; $k < $r; $k++) if ($l[$k] < $cl) { $cl = $l[$k]; $b = $k; }
        $depthAbs = $res - $cl; $depth = $depthAbs / $res;
        if ($depth < CO['depthMin'] || $depth > CO['depthMax']) continue;
        $span = $r - $lft;
        if ($b < $lft + CO['bottomLo'] * $span || $b > $lft + CO['bottomHi'] * $span) continue;
        $third = $cl + $depthAbs / 3; $inBottom = [];
        for ($k = $lft + 1; $k < $r; $k++) if ($c[$k] <= $third) $inBottom[] = $k;
        if (count($inBottom) < max(5, CO['bottomShare'] * $span)) continue;
        /* handle */
        $hl = INF; for ($k = $r + 1; $k <= $s; $k++) $hl = min($hl, $l[$k]);
        $hDepth = ($h[$r] - $hl) / $h[$r];
        if ($hDepth < CO['handleDepthMin'] || $hDepth > CO['handleDepthMax']) continue;
        if ($hl < $cl + 0.5 * $depthAbs) continue;
        /* the buy stop for tomorrow */
        $trig = round($res + max(0.01, $res * CO['trigPct']), 2);
        $t = $s + 1;
        if ($h[$t] < $trig) continue;

        /* a breakout of the shape: now the page's checks, in order */
        $code = 'T';
        $T1 = $res + $depthAbs / 3; $T2 = $res + 2 * $depthAbs / 3;
        $up = $s200[$s] !== null && $c[$s] > $s20[$s] && $c[$s] > $s50[$s] && $c[$s] > $s200[$s] && $s50[$s] > $s50[$s - 10];
        $declineEnd = max($lft + 1, intdiv($lft + $b, 2));
        $baseVol = $avg($v, $lft, $declineEnd);
        $botVol = 0.0; foreach ($inBottom as $k) $botVol += $v[$k]; $botVol /= count($inBottom);
        $handleVol = $avg($v, $r + 1, $s);
        $prior = -INF; for ($k = max(0, $lft - 252); $k < $lft; $k++) $prior = max($prior, $h[$k]);
        $mktOk = $mkt[$dates[$s]] ?? true;
        if (!$up) $code = 'u';
        elseif (!($botVol < $baseVol)) $code = 'b';
        elseif (!($av50[$s] !== null && $handleVol < $av50[$s])) $code = 'h';
        elseif ($prior > $trig && $prior < $T1) $code = 'a';
        elseif (!$mktOk) $code = 'm';
        $E = max($o[$t], $trig);
        if ($code === 'T' && $E >= $T1) $code = 'g';
        $cands[] = [$dates[$t], $code];
        if ($code !== 'T') continue;

        /* the trade */
        $S = $E - CO['stopAtr'] * $atr[$s]; $R = $E - $S;
        /* walk it: a green day trades open → low → high → close, a red day open → high → low → close.
           $kR 'p' = the page plan (half at T1, stop to breakeven, rest at T2); a number = a plain
           bracket at that many R; $hold = most days held */
        $walk = function ($kR, int $hold) use ($t, $n, $o, $h, $l, $c, $trig, $E, $S, $R, $T1, $T2) {
            $trim = null; $x = null; $why = null; $k = $t;
            $Tk = $kR === 'p' ? null : $E + $kR * $R;
            for (; $k < $n; $k++) {
                $green = $c[$k] >= $o[$k];
                $pts = $green ? [['o', $o[$k]], ['l', $l[$k]], ['h', $h[$k]]] : [['o', $o[$k]], ['h', $h[$k]], ['l', $l[$k]]];
                if ($k === $t) {                                   // the fill day starts where the buy stop filled
                    if ($o[$k] >= $trig) $pts = array_slice($pts, 1);            // gapped over: filled at the open
                    else $pts = $green ? [['h', $h[$k]]] : [['h', $h[$k]], ['l', $l[$k]]];
                }
                foreach ($pts as [$kind, $p]) {
                    if ($Tk !== null) {
                        if ($kind === 'o') { if ($p <= $S) { $x = $p; $why = 'stop'; break; } if ($p >= $Tk) { $x = $p; $why = 'target'; break; } }
                        elseif ($kind === 'l') { if ($p <= $S) { $x = $S; $why = 'stop'; break; } }
                        elseif ($p >= $Tk) { $x = $Tk; $why = 'target'; break; }
                        continue;
                    }
                    if ($kind === 'o') {
                        if ($trim === null && $p <= $S) { $x = $p; $why = 'stop'; break; }
                        if ($trim !== null && $p <= $E) { $x = $p; $why = 'be'; break; }
                        if ($trim === null && $p >= $T1) $trim = $p;
                        if ($trim !== null && $p >= $T2) { $x = $p; $why = 't2'; break; }
                    } elseif ($kind === 'l') {
                        if ($trim === null && $p <= $S) { $x = $S; $why = 'stop'; break; }
                        if ($trim !== null && $p <= $E) { $x = $E; $why = 'be'; break; }
                    } else {
                        if ($trim === null && $p >= $T1) $trim = $T1;
                        if ($trim !== null && $p >= $T2) { $x = $T2; $why = 't2'; break; }
                    }
                }
                if ($why) break;
                if ($k - $t >= $hold) { $x = $c[$k]; $why = 'time'; break; }
            }
            if (!$why) { $k = $n - 1; $x = $c[$k]; $why = 'open'; }
            $r_ = $trim !== null ? (0.5 * ($trim - $E) + 0.5 * ($x - $E)) / $R : ($x - $E) / $R;
            return [$k, $x, $why, $trim, $r_];
        };
        $holds = array_map(fn($q) => $q[0] === 'p' ? CO['maxHold'] : $q[0], CB_TIMES);
        $ev = [];
        foreach (CB_TARGETS as $q) foreach ($holds as $hd) { $w = $walk($q[0], $hd); $ev[] = [round($w[4], 3), $w[2], $dates[$w[0]], round($w[1], 2)]; }
        [$k, $x, $why, $trim, $r_] = $walk('p', CO['maxHold']);
        $busyUntil = $k;
        $trades[] = [
            'd' => $dates[$t], 'sym' => $sym, 'e' => round($E, 2), 's' => round($S, 2), 't1' => round($T1, 2), 't2' => round($T2, 2),
            'res' => round($res, 2), 'cl' => round($cl, 2), 'trig' => $trig, 'atr' => round((float)$atr[$s], 2),
            'ld' => $dates[$lft], 'bd' => $dates[$b], 'rd' => $dates[$r], 'cup' => $span, 'hd' => $s - $r, 'dp' => round($depth * 100, 1),
            'trim' => $trim === null ? null : round($trim, 2), 'x' => round($x, 2), 'xd' => $dates[$k], 'why' => $why,
            'r' => round($r_, 3), 'rp' => round($R / $E * 100, 2), 'vr' => $av50[$s] ? round($v[$t] / $av50[$s], 2) : null, 'days' => $k - $t,
            'v' => $ev,     // [r, why, exit date, exit price] for each exit option (see 'exits')
        ];
    }
    return ['dates' => $dates, 'cands' => $cands, 'trades' => $trades];
}

function combine(array $symbols, array $state, string $dir, string $outFile): void {
    $files = [];
    foreach ($symbols as $s) $files[$s] = read_json($dir . '/' . $s . '.json') ?? ['error' => 'missing', 'dates' => [], 'cands' => [], 'trades' => []];
    $cal = $files['SPY']['dates'] ?? [];
    if (!$cal) { foreach ($files as $f) $cal = array_merge($cal, $f['dates'] ?? []); $cal = array_values(array_unique($cal)); sort($cal); }
    $sessions = array_slice($cal, -CB_SESSIONS);
    $inWin = array_flip($sessions);
    $cover = []; $cands = []; $trades = []; $missing = [];
    foreach ($symbols as $s) {
        $f = $files[$s];
        if (!empty($f['error'])) $missing[] = ['sym' => $s, 'error' => $f['error'], 'stale' => !empty($f['stale'])];
        $have = array_flip($f['dates'] ?? []);
        $row = ''; foreach ($sessions as $d) $row .= isset($have[$d]) ? '1' : '0';
        $cover[$s] = $row;
        foreach ($f['cands'] ?? [] as $g) if (isset($inWin[$g[0]])) $cands[] = [$s, $g[0], $g[1]];
        foreach ($f['trades'] ?? [] as $t) if (isset($inWin[$t['d']])) $trades[] = $t;
    }
    usort($trades, fn($a, $b) => [$a['d'], $a['sym']] <=> [$b['d'], $b['sym']]);
    /* compact the exit options: R to 0.01, prices to the cent, one-letter reasons */
    $code = ['target' => 't', 'stop' => 's', 'time' => 'm', 'replaced' => 'r', 'open' => 'o', 'pmh' => 'p', 'ema' => 'e', 'be' => 'b', 't2' => '2'];
    foreach ($trades as &$tr) foreach ($tr['v'] ?? [] as $q => $vv) $tr['v'][$q] = [round($vv[0], 2), $code[$vv[1]] ?? $vv[1], $vv[2], round($vv[3], 2)];
    unset($tr);
    write_json($outFile, [
        'version' => 2, 'built' => time(), 'build' => $state['build'],
        'exits'   => ['targets' => CB_TARGETS, 'times' => CB_TIMES],   // v[target * count(times) + time] on each trade: [r, t target · s stop · m time · r replaced · o open · p PMH · e EMA · b breakeven · 2 target 2, exit, price]
        'symbols' => $symbols, 'sessions' => $sessions, 'cover' => $cover,
        'cands'   => $cands,     // [sym, date, T trade · u uptrend · b base volume · h handle volume · a no clean air · m market · g gapped past target 1]
        'trades'  => $trades, 'missing' => $missing,
    ]);
}
