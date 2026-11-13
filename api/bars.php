<?php
/* =====================================================================
   api/bars.php — server-side proxy for Massive (formerly Polygon.io)
   intraday bars, used by the live charts on setup pages.

   Why it exists: the browser never sees the Massive API key. The key
   lives in api/config.php on the server (copy config.sample.php), and
   this script fetches, trims, and briefly caches the bars.

   GET /api/bars.php?symbol=QQQ&mult=2[&rth=1][&date=YYYY-MM-DD][&preview=TOKEN]
   (date = replay a past session: the days ending that date; 7 at 1–3 min, 14 at 5–10, 40 at 15)
   → { symbol, mult, delay, updated, stale, bars: [[t_ms, o, h, l, c, v], …] }

   Licensing: Massive's Individual plans cover your own viewing only.
   Keep 'public' => false in config.php (private preview, token required)
   until the account is on a Massive Business subscription.
   ===================================================================== */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function fail(int $code, string $msg): void {
    http_response_code($code);
    echo json_encode(['error' => $msg]);
    exit;
}

$cfgFile = __DIR__ . '/config.php';
if (!is_file($cfgFile)) fail(503, 'not_configured');
$cfg = require $cfgFile;
if (!is_array($cfg) || empty($cfg['api_key']) || str_starts_with((string)$cfg['api_key'], 'PASTE_')) fail(503, 'not_configured');

/* ---- access gate: private preview until the data license allows public display ---- */
if (empty($cfg['public'])) {
    $tok = (string)($_GET['preview'] ?? '');
    $want = (string)($cfg['preview_token'] ?? '');
    if ($tok === '' || $want === '' || !hash_equals($want, $tok)) fail(403, 'private');
}

/* ---- inputs (allow-listed so the key can't be spent on arbitrary symbols) ---- */
$symbol = strtoupper((string)($_GET['symbol'] ?? 'QQQ'));
if (!preg_match('/^[A-Z][A-Z.]{0,5}$/', $symbol)) fail(400, 'bad_symbol');
$allowed = array_map('strtoupper', (array)($cfg['symbols'] ?? ['QQQ']));
if (!in_array('*', $allowed, true) && !in_array($symbol, $allowed, true)) fail(400, 'symbol_not_allowed');
$daily = ($_GET['span'] ?? '') === 'day';      // span=day&from=YYYY-MM-DD&to=YYYY-MM-DD: daily bars for a range
$mult = $daily ? 1 : (int)($_GET['mult'] ?? 2);
if (!in_array($mult, [1, 2, 3, 5, 10, 15], true)) fail(400, 'bad_timeframe');
$rth = !empty($_GET['rth']);                    // 1 = regular session only (09:30–16:00 ET)
$tz = new DateTimeZone('America/New_York');
$date = (string)($_GET['date'] ?? '');          // optional: replay a past session
if ($date !== '') {
    $d = DateTime::createFromFormat('!Y-m-d', $date, $tz);
    $today = new DateTime('today', $tz);
    if (!$d || $d->format('Y-m-d') !== $date || $d > $today || $d < (clone $today)->modify('-2 years')) fail(400, 'bad_date');
    if ($d == $today) $date = '';               // today is just the live chart
}

if ($daily) {
    $dFrom = DateTime::createFromFormat('!Y-m-d', (string)($_GET['from'] ?? ''), $tz);
    $dTo = DateTime::createFromFormat('!Y-m-d', (string)($_GET['to'] ?? ''), $tz);
    $today = new DateTime('today', $tz);
    if (!$dFrom || !$dTo || $dFrom > $dTo || $dTo > (clone $today)->modify('+1 day') || $dFrom < (clone $today)->modify('-6 years')
        || $dFrom->diff($dTo)->days > 1100) fail(400, 'bad_range');
}

/* ---- cache ---- */
$ttl = max(5, (int)($cfg['cache_seconds'] ?? 30));
$cacheDir = __DIR__ . '/cache';
if (!is_dir($cacheDir)) @mkdir($cacheDir, 0755, true);
$cacheFile = $daily
    ? $cacheDir . '/' . $symbol . '-1d-' . $dFrom->format('Y-m-d') . '-' . $dTo->format('Y-m-d') . '.json'
    : $cacheDir . '/' . $symbol . '-' . $mult . 'm' . ($rth ? '-rth' : '') . ($date !== '' ? '-' . $date : '') . '.json';
if ($date !== '') $ttl = 86400;                 // a finished session doesn't change
if ($daily) $ttl = $dTo < $today ? 86400 : 3600;
if (is_file($cacheFile) && (time() - filemtime($cacheFile)) < $ttl) {
    readfile($cacheFile);
    exit;
}

/* ---- fetch: enough calendar days for the indicators to warm up at this timeframe
        (7 days at 1–3 minutes, 14 at 5–10, 40 at 15), always including the previous session ---- */
$to = $date !== '' ? DateTime::createFromFormat('!Y-m-d', $date, $tz) : new DateTime('now', $tz);
$from = (clone $to)->modify('-' . ($mult >= 15 ? 40 : ($mult >= 5 ? 14 : 7)) . ' days');
if ($daily) { $from = $dFrom; $to = $dTo; $rth = false; }
$url = sprintf(
    '%s/v2/aggs/ticker/%s/range/%d/%s/%s/%s?adjusted=true&sort=asc&limit=50000&apiKey=%s',
    rtrim((string)($cfg['api_base'] ?? 'https://api.massive.com'), '/'), rawurlencode($symbol), $mult, $daily ? 'day' : 'minute',
    $from->format('Y-m-d'), $to->format('Y-m-d'), rawurlencode((string)$cfg['api_key'])
);

function http_get(string $url): array {
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 12, CURLOPT_CONNECTTIMEOUT => 6]);
        $body = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return [$code, $body === false ? '' : (string)$body];
    }
    $ctx = stream_context_create(['http' => ['timeout' => 12, 'ignore_errors' => true]]);
    $body = @file_get_contents($url, false, $ctx);
    $code = 0;
    foreach ($http_response_header ?? [] as $h) if (preg_match('#^HTTP/\S+\s+(\d{3})#', $h, $m)) $code = (int)$m[1];
    return [$code, $body === false ? '' : (string)$body];
}

$bars = [];
$next = $url;
$pages = 0;
while ($next && $pages < 5) {
    [$code, $body] = http_get($next);
    $json = json_decode($body, true);
    if ($code !== 200 || !is_array($json)) {
        if (is_file($cacheFile)) {                     // serve the last good copy, marked stale
            $old = json_decode((string)file_get_contents($cacheFile), true);
            if (is_array($old)) { $old['stale'] = true; echo json_encode($old); exit; }
        }
        fail(502, 'upstream_' . $code);
    }
    foreach (($json['results'] ?? []) as $r) {
        if ($rth) {
            $et = (new DateTime('@' . intdiv((int)$r['t'], 1000)))->setTimezone($tz);
            $m = (int)$et->format('G') * 60 + (int)$et->format('i');
            if ($m < 570 || $m >= 960) continue;
        }
        $bars[] = [(int)$r['t'], (float)$r['o'], (float)$r['h'], (float)$r['l'], (float)$r['c'], (float)($r['v'] ?? 0)];
    }
    $next = !empty($json['next_url']) ? $json['next_url'] . '&apiKey=' . rawurlencode((string)$cfg['api_key']) : null;
    $pages++;
}

$out = json_encode([
    'symbol'  => $symbol,
    'mult'    => $mult,
    'delay'   => (string)($cfg['delay_note'] ?? ''),
    'delay_s' => (int)($cfg['delay_seconds'] ?? 900),   // seconds behind real time (0 on a real-time plan)
    'updated' => time(),
    'stale'   => false,
    'date'    => $date !== '' ? $date : null,
    'bars'    => $bars,
]);

$tmp = $cacheFile . '.' . getmypid() . '.tmp';
if (@file_put_contents($tmp, $out) !== false) @rename($tmp, $cacheFile);
if ($date !== '' || $daily) {                   // replays and trade charts: keep the cache folder small
    foreach (glob($cacheDir . '/*-20??-??-??.json') ?: [] as $old) if (time() - filemtime($old) > 7 * 86400) @unlink($old);
}
echo $out;
