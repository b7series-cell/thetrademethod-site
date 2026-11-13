<?php
/* =====================================================================
   api/gex-levels.php — the morning GEX paste string, saved by date, for
   the GEX Levels page. The same text you paste into the TradingView
   indicator, one line per ticker:
       SPY:CW=775;PW=767;GF=770;CONF=HIGH;PWM=2400
       MU:CW=1100;CW2=1150;PW=1000;GF=989.87;CONF=GOOD;CWM=105;PWM=49

   Private preview token required for reading and saving (same config.php
   as bars.php).
       GET  ?preview=T                    → the latest day: { date, text, updated, dates[] }
       GET  ?preview=T&date=YYYY-MM-DD    → that day
       POST ?preview=T  text=…[&date=…]   → save (date defaults to today, New York)
                         (or b64=<base64 of the text>; lines starting with # are dropped)
   From gex_levels.py, after it prints the paste string:
       requests.post(URL + "?preview=" + TOKEN, data={"text": paste})
   Every day is kept (api/cache/gex/YYYY-MM-DD.txt), so the page can replay
   any morning's levels and a level log can be built from the history.
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
if (!is_array($cfg)) fail(503, 'not_configured');
if (empty($cfg['public']) || $_SERVER['REQUEST_METHOD'] === 'POST') {          // saving always needs the token
    /* the code can arrive in the URL, the form body or a header; either the preview code or an
       optional gex_token from config.php is accepted (spaces around either are ignored) */
    $tok = trim((string)($_GET['preview'] ?? $_POST['preview'] ?? $_SERVER['HTTP_X_PREVIEW_TOKEN'] ?? ''));
    $ok = false;
    foreach (['preview_token', 'gex_token'] as $k) {
        $want = trim((string)($cfg[$k] ?? ''));
        if ($tok !== '' && $want !== '' && hash_equals($want, $tok)) $ok = true;
    }
    if (!$ok) fail(403, 'private');
}

$dir = __DIR__ . '/cache/gex';
if (!is_dir($dir)) @mkdir($dir, 0755, true);
if ($_SERVER['REQUEST_METHOD'] === 'POST' && (!is_dir($dir) || !is_writable($dir))) fail(500, 'not_writable');
$tz = new DateTimeZone('America/New_York');
$today = (new DateTime('now', $tz))->format('Y-m-d');

function valid_date(string $d): bool {
    $x = DateTime::createFromFormat('!Y-m-d', $d);
    return $x && $x->format('Y-m-d') === $d;
}
function saved_dates(string $dir): array {
    $out = [];
    foreach (glob($dir . '/????-??-??.txt') ?: [] as $f) $out[] = basename($f, '.txt');
    rsort($out);
    return $out;
}

/* ---------------- save ---------------- */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    /* the page sends the text base64-encoded (b64=…) so nothing in it can trip a web firewall rule;
       scripts can still post it plain (text=…) or as the raw body */
    $text = '';
    if (isset($_POST['b64'])) {
        $text = base64_decode(strtr((string)$_POST['b64'], ' ', '+'), true);
        if ($text === false) fail(400, 'bad_text');
    } else {
        $text = (string)($_POST['text'] ?? '');
        if ($text === '') { $raw = (string)file_get_contents('php://input'); if ($raw !== '' && $raw[0] !== '{') $text = $raw; }
    }
    if (strlen($text) > 100000) fail(400, 'too_long');
    $keep = [];
    foreach (preg_split('/\r\n|\r|\n|\|/', $text) as $ln) {
        $ln = trim($ln);
        if ($ln === '' || $ln[0] === '#') continue;                                // header / comment lines
        $ln = trim((string)preg_replace('/[^A-Za-z0-9.:;=,\-_ ]/', '', $ln));      // tickers, keys, numbers, separators
        if ($ln !== '' && strpbrk($ln, ':=') !== false) $keep[] = $ln;
    }
    $text = implode("\n", $keep);
    if ($text === '' || strlen($text) > 60000) fail(400, 'bad_text');
    $date = (string)($_POST['date'] ?? $_GET['date'] ?? $today);
    if (!valid_date($date)) fail(400, 'bad_date');
    $tmp = $dir . '/' . $date . '.txt.' . getmypid();
    if (@file_put_contents($tmp, $text) === false || !@rename($tmp, $dir . '/' . $date . '.txt')) fail(500, 'not_saved');
    echo json_encode(['saved' => true, 'date' => $date, 'updated' => time(), 'dates' => saved_dates($dir)]);
    exit;
}

/* ---------------- read ---------------- */
$dates = saved_dates($dir);
$date = (string)($_GET['date'] ?? '');
if ($date === '') $date = $dates[0] ?? $today;
if (!valid_date($date)) fail(400, 'bad_date');
$f = $dir . '/' . $date . '.txt';
echo json_encode([
    'date'    => $date,
    'today'   => $today,
    'text'    => is_file($f) ? (string)file_get_contents($f) : '',
    'updated' => is_file($f) ? filemtime($f) : null,
    'dates'   => array_slice($dates, 0, 120),
]);
