<?php
/* =====================================================================
   api/notes.php — your own notes on each page: a verdict (untested,
   promising, proven, didn't hold up) and "My take" in your own words.
   Written and read from the pages themselves (js/notes.js).

   Private: reading and saving both need the preview code (the same
   config.php as bars.php; an optional 'gex_token' is accepted too).
       GET  ?preview=T                              → { notes: { slug: { verdict, text, updated } } }
       POST ?preview=T  slug=…&verdict=…&b64=…      → save one page's note
                        (b64 = the text, UTF-8, base64-encoded so no
                        firewall rule trips on it; text=… also works)
   Stored in api/cache/notes/notes.json. Every save also appends the
   previous version to notes-history.jsonl, so nothing you write is lost.
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

$isPost = $_SERVER['REQUEST_METHOD'] === 'POST';
if (empty($cfg['public']) || $isPost) {                 // saving always needs the code
    $tok = trim((string)($_GET['preview'] ?? $_POST['preview'] ?? $_SERVER['HTTP_X_PREVIEW_TOKEN'] ?? ''));
    $ok = false;
    foreach (['preview_token', 'gex_token'] as $k) {
        $want = trim((string)($cfg[$k] ?? ''));
        if ($tok !== '' && $want !== '' && hash_equals($want, $tok)) $ok = true;
    }
    if (!$ok) fail(403, 'private');
}

$dir = __DIR__ . '/cache/notes';
if (!is_dir($dir)) @mkdir($dir, 0755, true);
$file = $dir . '/notes.json';
$VERDICTS = ['untested', 'promising', 'proven', 'failed'];

function load_notes(string $file): array {
    if (!is_file($file)) return [];
    $j = json_decode((string)file_get_contents($file), true);
    return is_array($j) ? $j : [];
}

/* ---------------- read ---------------- */
if (!$isPost) {
    echo json_encode(['notes' => (object)load_notes($file)]);
    exit;
}

/* ---------------- save ---------------- */
if (!is_dir($dir) || !is_writable($dir)) fail(500, 'not_writable');
$slug = (string)($_POST['slug'] ?? '');
if (!preg_match('/^[a-z0-9-]{1,80}$/', $slug)) fail(400, 'bad_slug');
$verdict = (string)($_POST['verdict'] ?? 'untested');
if (!in_array($verdict, $VERDICTS, true)) fail(400, 'bad_verdict');
if (isset($_POST['b64'])) {
    $text = base64_decode(strtr((string)$_POST['b64'], ' ', '+'), true);
    if ($text === false) fail(400, 'bad_text');
} else {
    $text = (string)($_POST['text'] ?? '');
}
$text = str_replace(["\r\n", "\r"], "\n", $text);
if (!mb_check_encoding($text, 'UTF-8')) fail(400, 'bad_text');
$text = trim((string)preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $text));   // keep newlines and tabs
if (mb_strlen($text) > 20000) fail(400, 'too_long');

$lock = fopen($dir . '/lock', 'c');
if (!$lock || !flock($lock, LOCK_EX)) fail(500, 'not_saved');
$notes = load_notes($file);
if (isset($notes[$slug])) {
    @file_put_contents($dir . '/notes-history.jsonl', json_encode(['slug' => $slug] + $notes[$slug]) . "\n", FILE_APPEND);
}
$notes[$slug] = ['verdict' => $verdict, 'text' => $text, 'updated' => time()];
ksort($notes);
$tmp = $file . '.' . getmypid() . '.tmp';
if (@file_put_contents($tmp, json_encode($notes, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)) === false || !@rename($tmp, $file)) {
    flock($lock, LOCK_UN);
    fail(500, 'not_saved');
}
flock($lock, LOCK_UN);
echo json_encode(['saved' => true, 'slug' => $slug, 'note' => $notes[$slug]]);
