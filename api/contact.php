<?php
/* =====================================================================
   api/contact.php — the contact form on /contact.html.

   Emails each message to CONTACT_TO below, with Reply-To set to the
   visitor so you can answer straight from your inbox. Every message is
   also kept in api/cache/contact/messages.jsonl (not web readable), so
   nothing is lost if an email goes missing.

   Spam protection:
     - a hidden "website" field people never fill (bots do): dropped
     - forms sent within 3 seconds of the page opening: dropped
     - at most 3 messages per 10 minutes and 10 per day from one visitor
       (IP address, stored only as a salted hash)
     - more than 3 links in a message: dropped
   Dropped spam gets a normal "sent" answer, so bots don't learn anything.

   POST name, email, topic, message (+ website, t, page)
     JSON reply when the request asks for it (the page's JavaScript):
       { sent: true }  or  { error: "missing" | "email" | "too_long" | "rate" | "not_configured" | "not_sent" }
     Otherwise (no JavaScript) redirects to /contact.html?sent=1 or ?error=…
   ===================================================================== */

declare(strict_types=1);

/* ---- settings ------------------------------------------------------ */
const CONTACT_TO   = 'b7series@gmail.com';                             // where messages go, e.g. 'you@example.com'
const CONTACT_FROM = 'no-reply@thetrademethod.com';    // must be on thetrademethod.com so SiteGround's mail is trusted
const SITE_NAME    = 'The Trade Method';
/* -------------------------------------------------------------------- */

header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

$wantsJson = stripos((string)($_SERVER['HTTP_ACCEPT'] ?? ''), 'application/json') !== false;

function reply(bool $ok, string $err = ''): void {
    global $wantsJson;
    if ($wantsJson) {
        header('Content-Type: application/json; charset=utf-8');
        if (!$ok) http_response_code($err === 'rate' ? 429 : ($err === 'not_configured' || $err === 'not_sent' ? 503 : 400));
        echo json_encode($ok ? ['sent' => true] : ['error' => $err]);
    } else {
        header('Location: /contact.html' . ($ok ? '?sent=1' : '?error=' . rawurlencode($err)), true, 303);
    }
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Location: /contact.html', true, 303);
    exit;
}

/* only from this site's own pages */
$origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');
if ($origin !== '' && !preg_match('#^https?://(www\.)?thetrademethod\.com$#i', $origin)
    && !preg_match('#^https?://(localhost|127\.0\.0\.1)(:\d+)?$#', $origin)) {
    reply(false, 'not_sent');
}

/* ---- storage ------------------------------------------------------- */
$dir = __DIR__ . '/cache/contact';
if (!is_dir($dir)) @mkdir($dir, 0755, true);
if (is_dir($dir) && !is_file($dir . '/.htaccess')) {
    @file_put_contents($dir . '/.htaccess', "Require all denied\n");
}

function clean_line(string $s, int $max): string {
    $s = (string)preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $s);   // no newlines: these go in mail headers
    $s = trim((string)preg_replace('/\s+/u', ' ', $s));
    return mb_substr($s, 0, $max);
}

$raw = static fn(string $k): string => is_string($_POST[$k] ?? null) ? (string)$_POST[$k] : '';
foreach (['name', 'email', 'topic', 'message', 'website', 't', 'page'] as $k) {
    if (!mb_check_encoding($raw($k), 'UTF-8')) reply(false, 'not_sent');
}

$name    = clean_line($raw('name'), 100);
$email   = clean_line($raw('email'), 200);
$topic   = $raw('topic');
$page    = clean_line($raw('page'), 200);
$message = str_replace(["\r\n", "\r"], "\n", $raw('message'));
$message = trim((string)preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $message));

$TOPICS = [
    'question'   => 'Question',
    'idea'       => 'Setup or video idea',
    'correction' => 'Correction',
    'other'      => 'Message',
];
if (!isset($TOPICS[$topic])) $topic = 'other';
if ($page !== '' && !preg_match('#^/[\w\-/.]*$#', $page)) $page = '';

/* ---- spam: quietly accept and drop --------------------------------- */
$spam = '';
if (trim($raw('website')) !== '') $spam = 'honeypot';
$t = $raw('t');
if ($spam === '' && $t !== '' && ctype_digit($t)) {
    $age = time() - intdiv((int)$t, 1000);
    if ($age < 3) $spam = 'too_fast';
}
if ($spam === '' && preg_match_all('#https?://|www\.#i', $message) > 3) $spam = 'links';

/* ---- validate ------------------------------------------------------ */
if ($spam === '') {
    if ($name === '' || $email === '' || mb_strlen($message) < 2) reply(false, 'missing');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) reply(false, 'email');
    if (mb_strlen($message) > 5000) reply(false, 'too_long');
}

/* ---- rate limit (per visitor, salted hash of the IP) --------------- */
$saltFile = $dir . '/salt';
$salt = is_file($saltFile) ? (string)file_get_contents($saltFile) : '';
if ($salt === '') { $salt = bin2hex(random_bytes(16)); @file_put_contents($saltFile, $salt); }
$who = hash('sha256', $salt . '|' . (string)($_SERVER['REMOTE_ADDR'] ?? ''));

$lock = @fopen($dir . '/lock', 'c');
if ($lock) flock($lock, LOCK_EX);
$rateFile = $dir . '/rate.json';
$rate = is_file($rateFile) ? json_decode((string)file_get_contents($rateFile), true) : [];
if (!is_array($rate)) $rate = [];
$now = time();
foreach ($rate as $k => $times) {                                // forget anything older than a day
    $rate[$k] = array_values(array_filter((array)$times, static fn($x) => is_int($x) && $x > $now - 86400));
    if (!$rate[$k]) unset($rate[$k]);
}
$mine = $rate[$who] ?? [];
$last10 = count(array_filter($mine, static fn($x) => $x > $now - 600));
$limited = $last10 >= 3 || count($mine) >= 10;
if (!$limited) { $mine[] = $now; $rate[$who] = $mine; }
@file_put_contents($rateFile, json_encode($rate));
if ($lock) { flock($lock, LOCK_UN); fclose($lock); }

if ($limited) reply(false, 'rate');

/* ---- keep a copy --------------------------------------------------- */
$entry = [
    'time'    => gmdate('c'),
    'spam'    => $spam ?: null,
    'topic'   => $topic,
    'name'    => $name,
    'email'   => $email,
    'page'    => $page,
    'message' => mb_substr($message, 0, 5000),
];
@file_put_contents($dir . '/messages.jsonl', json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n", FILE_APPEND | LOCK_EX);

if ($spam !== '') reply(true);                                   // bots see "sent"

/* ---- email --------------------------------------------------------- */
$to = CONTACT_TO;
if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) reply(false, 'not_configured');

$subject = '[' . SITE_NAME . '] ' . $TOPICS[$topic] . ' from ' . $name;
$body = "Name:   {$name}\n"
      . "Email:  {$email}\n"
      . "Topic:  {$TOPICS[$topic]}\n"
      . ($page !== '' ? "Page:   https://thetrademethod.com{$page}\n" : '')
      . 'Sent:   ' . gmdate('D j M Y, H:i') . " UTC\n"
      . "\n" . $message . "\n"
      . "\n-- \nSent from the contact form at https://thetrademethod.com/contact.html\nReply to this email to answer {$name} directly.\n";

$fromName = mb_encode_mimeheader(SITE_NAME . ' contact form', 'UTF-8', 'Q');
$headers = [
    'From: ' . $fromName . ' <' . CONTACT_FROM . '>',
    'Reply-To: ' . mb_encode_mimeheader($name, 'UTF-8', 'Q') . ' <' . $email . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: thetrademethod-contact',
];

$ok = @mail($to, mb_encode_mimeheader($subject, 'UTF-8', 'Q'), $body, implode("\r\n", $headers), '-f' . CONTACT_FROM);
if (!$ok) {
    @file_put_contents($dir . '/messages.jsonl', json_encode(['time' => gmdate('c'), 'mail_failed' => true]) . "\n", FILE_APPEND | LOCK_EX);
    reply(false, 'not_sent');
}
reply(true);
