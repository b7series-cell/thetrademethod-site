<?php
/* =====================================================================
   api/em-chain.php — one expiration of an options chain from Massive
   (formerly Polygon.io), trimmed to what the Expected Move v3 dashboard
   needs: strike, call/put, ask, bid, mid, last, implied volatility, delta.

   GET /api/em-chain.php?symbol=SPY&exp=YYYY-MM-DD&px=500[&preview=TOKEN]
   → { symbol, exp, under, updated, delay, stale, rows: [[type, strike, ask, bid, mid, last, iv, delta], …] }

   Options snapshots need a Massive Options plan. On a Stocks-only plan
   Massive answers 403 and this script returns { error: "no_options_plan" };
   the page then asks the visitor to type the chain prices in instead.
   Same config.php and private-preview token as bars.php.
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

if (empty($cfg['public'])) {
    $tok = (string)($_GET['preview'] ?? '');
    $want = (string)($cfg['preview_token'] ?? '');
    if ($tok === '' || $want === '' || !hash_equals($want, $tok)) fail(403, 'private');
}

$symbol = strtoupper((string)($_GET['symbol'] ?? 'SPY'));
if (!preg_match('/^[A-Z][A-Z.]{0,5}$/', $symbol)) fail(400, 'bad_symbol');
$allowed = array_map('strtoupper', (array)($cfg['symbols'] ?? ['QQQ']));
if (!in_array('*', $allowed, true) && !in_array($symbol, $allowed, true)) fail(400, 'symbol_not_allowed');

$tz = new DateTimeZone('America/New_York');
$exp = (string)($_GET['exp'] ?? '');
$d = DateTime::createFromFormat('!Y-m-d', $exp, $tz);
$today = new DateTime('today', $tz);
if (!$d || $d->format('Y-m-d') !== $exp || $d < $today || $d > (clone $today)->modify('+400 days')) fail(400, 'bad_exp');
$px = (float)($_GET['px'] ?? 0);
if (!($px > 0 && $px < 1000000)) fail(400, 'bad_price');

/* ---- cache: one file per symbol and expiration; a "no options plan" answer is remembered for a day ---- */
$cacheDir = __DIR__ . '/cache/chain';
if (!is_dir($cacheDir)) @mkdir($cacheDir, 0755, true);
$noPlan = $cacheDir . '/no-options-plan';
if (is_file($noPlan) && time() - filemtime($noPlan) < 86400) fail(402, 'no_options_plan');
$cacheFile = $cacheDir . '/' . $symbol . '-' . $exp . '.json';
$ttl = max(30, (int)($cfg['cache_seconds'] ?? 30) * 2);
if (is_file($cacheFile) && (time() - filemtime($cacheFile)) < $ttl) { readfile($cacheFile); exit; }

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

/* strikes within ±25% of the price: enough for the straddle, the first ITM strangle and both 16 delta strikes */
$key = rawurlencode((string)$cfg['api_key']);
$url = sprintf(
    '%s/v3/snapshot/options/%s?expiration_date=%s&strike_price.gte=%s&strike_price.lte=%s&limit=250&apiKey=%s',
    rtrim((string)($cfg['api_base'] ?? 'https://api.massive.com'), '/'), rawurlencode($symbol), $exp,
    number_format($px * 0.75, 2, '.', ''), number_format($px * 1.25, 2, '.', ''), $key
);

$rows = [];
$under = null;
$next = $url;
$pages = 0;
while ($next && $pages < 6) {
    [$code, $body] = http_get($next);
    if ($code === 401 || $code === 403) { @touch($noPlan); fail(402, 'no_options_plan'); }
    $json = json_decode($body, true);
    if ($code !== 200 || !is_array($json)) {
        if (is_file($cacheFile)) {
            $old = json_decode((string)file_get_contents($cacheFile), true);
            if (is_array($old)) { $old['stale'] = true; echo json_encode($old); exit; }
        }
        fail(502, 'upstream_' . $code);
    }
    foreach (($json['results'] ?? []) as $r) {
        $det = $r['details'] ?? [];
        $type = ($det['contract_type'] ?? '') === 'put' ? 'P' : (($det['contract_type'] ?? '') === 'call' ? 'C' : '');
        if ($type === '' || !isset($det['strike_price'])) continue;
        $q = $r['last_quote'] ?? [];
        $num = function ($v) { return is_numeric($v) ? round((float)$v, 4) : null; };
        $rows[] = [$type, (float)$det['strike_price'], $num($q['ask'] ?? null), $num($q['bid'] ?? null), $num($q['midpoint'] ?? null),
                   $num($r['day']['close'] ?? ($r['last_trade']['price'] ?? null)), $num($r['implied_volatility'] ?? null), $num($r['greeks']['delta'] ?? null)];
        if ($under === null && isset($r['underlying_asset']['price'])) $under = (float)$r['underlying_asset']['price'];
    }
    $next = !empty($json['next_url']) ? $json['next_url'] . '&apiKey=' . $key : null;
    $pages++;
}
if (!$rows) fail(404, 'no_contracts');

$out = json_encode([
    'symbol'  => $symbol,
    'exp'     => $exp,
    'under'   => $under,
    'delay'   => (string)($cfg['delay_note'] ?? ''),
    'updated' => time(),
    'stale'   => false,
    'rows'    => $rows,
]);
$tmp = $cacheFile . '.' . getmypid() . '.tmp';
if (@file_put_contents($tmp, $out) !== false) @rename($tmp, $cacheFile);
foreach (glob($cacheDir . '/*.json') ?: [] as $old) if (time() - filemtime($old) > 3 * 86400) @unlink($old);
echo $out;
