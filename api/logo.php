<?php
/* =====================================================================
   api/logo.php — the company name and logo for a ticker, for the live
   charts. Fetched from Massive's ticker reference data on the server (the
   key never reaches the browser) and cached for 30 days.

   GET /api/logo.php?symbol=NVDA&meta=1&preview=T → { symbol, name, logo: true|false }
   GET /api/logo.php?symbol=NVDA&preview=T        → the logo image (404 when there is none,
                                                     e.g. most ETFs; the chart then shows a monogram)
   ===================================================================== */

declare(strict_types=1);

header('X-Content-Type-Options: nosniff');

function fail(int $code, string $msg): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
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
$symbol = strtoupper((string)($_GET['symbol'] ?? ''));
if (!preg_match('/^[A-Z][A-Z.]{0,5}$/', $symbol)) fail(400, 'bad_symbol');
$allowed = array_map('strtoupper', (array)($cfg['symbols'] ?? ['QQQ']));
if (!in_array('*', $allowed, true) && !in_array($symbol, $allowed, true)) fail(400, 'symbol_not_allowed');

$key  = (string)$cfg['api_key'];
$base = rtrim((string)($cfg['api_base'] ?? 'https://api.massive.com'), '/');   // leave unset
$dir  = __DIR__ . '/cache/logos';
if (!is_dir($dir)) @mkdir($dir, 0755, true);
$metaFile = $dir . '/' . $symbol . '.json';
$imgFile  = $dir . '/' . $symbol . '.img';
$TTL = 30 * 86400;

function http_get(string $url): array {
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_CONNECTTIMEOUT => 6, CURLOPT_FOLLOWLOCATION => true, CURLOPT_MAXREDIRS => 3]);
        $body = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $type = (string)curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        curl_close($ch);
        return [$code, $body === false ? '' : (string)$body, $type];
    }
    $ctx = stream_context_create(['http' => ['timeout' => 10, 'ignore_errors' => true]]);
    $body = @file_get_contents($url, false, $ctx);
    $code = 0; $type = '';
    foreach ($http_response_header ?? [] as $h) {
        if (preg_match('#^HTTP/\S+\s+(\d{3})#', $h, $m)) $code = (int)$m[1];
        if (stripos($h, 'Content-Type:') === 0) $type = trim(substr($h, 13));
    }
    return [$code, $body === false ? '' : (string)$body, $type];
}

/* ---- refresh the cached name + logo when missing or older than 30 days ---- */
$meta = is_file($metaFile) ? json_decode((string)file_get_contents($metaFile), true) : null;
if (!is_array($meta) || time() - (int)($meta['at'] ?? 0) > $TTL) {
    [$code, $body] = http_get($base . '/v3/reference/tickers/' . rawurlencode($symbol) . '?apiKey=' . rawurlencode($key));
    $j = json_decode($body, true);
    if ($code === 200 && is_array($j)) {
        $res = $j['results'] ?? [];
        $meta = ['at' => time(), 'name' => (string)($res['name'] ?? ''), 'type' => ''];
        $src = (string)($res['branding']['icon_url'] ?? $res['branding']['logo_url'] ?? '');
        if ($src !== '' && (str_starts_with($src, 'https://') || str_starts_with($src, $base))) {
            [$c2, $img, $type] = http_get($src . (str_contains($src, '?') ? '&' : '?') . 'apiKey=' . rawurlencode($key));
            $type = strtolower(trim(explode(';', $type)[0]));
            if ($c2 === 200 && $img !== '' && strlen($img) < 400000 && in_array($type, ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/gif'], true)) {
                @file_put_contents($imgFile, $img);
                $meta['type'] = $type;
            }
        }
        @file_put_contents($metaFile, json_encode($meta));
    } elseif (!is_array($meta)) {
        $meta = ['at' => time() - $TTL + 3600, 'name' => '', 'type' => ''];   // try again in an hour
        @file_put_contents($metaFile, json_encode($meta));
    }
}

$hasLogo = !empty($meta['type']) && is_file($imgFile);
if (!empty($_GET['meta'])) {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: private, max-age=3600');
    echo json_encode(['symbol' => $symbol, 'name' => $meta['name'] ?? '', 'logo' => $hasLogo]);
    exit;
}
if (!$hasLogo) fail(404, 'no_logo');
header('Content-Type: ' . $meta['type']);
header('Cache-Control: private, max-age=604800');
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox");
readfile($imgFile);
