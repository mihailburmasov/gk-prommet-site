<?php
header('Content-Type: application/json; charset=utf-8');

function respond($ok, $message) {
    http_response_code($ok ? 200 : 400);
    echo json_encode(array('ok' => $ok, 'message' => $message), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, 'Метод не поддерживается.');
}

/* Honeypot: настоящие посетители это поле не видят и не заполняют. */
if (!empty($_POST['website'])) {
    respond(true, 'Заявка отправлена.');
}

$clean = function ($s) {
    return trim(preg_replace('/[\r\n\x00-\x08\x0B\x0C\x0E-\x1F]/', ' ', $s));
};

$name       = isset($_POST['name']) ? $clean($_POST['name']) : '';
$phone      = isset($_POST['phone']) ? $clean($_POST['phone']) : '';
$comment    = isset($_POST['comment']) ? $clean($_POST['comment']) : '';
$categories = isset($_POST['categories']) ? $clean($_POST['categories']) : '';
$consent    = isset($_POST['consent']) && $_POST['consent'] === '1';

if ($name === '' || $phone === '') {
    respond(false, 'Укажите имя и телефон.');
}
if (!$consent) {
    respond(false, 'Нужно согласие на обработку персональных данных.');
}

$to = 'gkprommet@mail.ru';
$fromEmail = 'noreply@gkprommet.ru';
$fromName = 'Сайт ГК Проммет';
$subject = 'Заявка с сайта — запрос цены и наличия';

$bodyText = implode("\n", array(
    'Имя: ' . $name,
    'Телефон: ' . $phone,
    'Группы крепежа: ' . ($categories !== '' ? $categories : 'см. комментарий'),
    'Комментарий: ' . ($comment !== '' ? $comment : '—'),
));

$attachment = null;

if (isset($_FILES['file']) && $_FILES['file']['error'] !== UPLOAD_ERR_NO_FILE) {
    if ($_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        respond(false, 'Ошибка загрузки файла.');
    }

    $maxSize = 15 * 1024 * 1024;
    if ($_FILES['file']['size'] > $maxSize) {
        respond(false, 'Файл слишком большой (максимум 15 МБ).');
    }

    $allowedExt = array('pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'dwg', 'dxf', 'zip', 'rar', '7z', 'txt');
    $origName = $_FILES['file']['name'];
    $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
    if (!in_array($ext, $allowedExt, true)) {
        respond(false, 'Недопустимый формат файла.');
    }

    $tmpPath = $_FILES['file']['tmp_name'];
    if (!is_uploaded_file($tmpPath)) {
        respond(false, 'Ошибка загрузки файла.');
    }

    $fileContent = file_get_contents($tmpPath);
    if ($fileContent === false) {
        respond(false, 'Не удалось прочитать файл.');
    }

    $mimeType = 'application/octet-stream';
    if (function_exists('finfo_open')) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        if ($finfo) {
            $detected = finfo_buffer($finfo, $fileContent);
            if ($detected) $mimeType = $detected;
            finfo_close($finfo);
        }
    }

    $safeName = preg_replace('/[^A-Za-z0-9._\- \x{0400}-\x{04FF}]/u', '_', $origName);
    if ($safeName === '' || $safeName === null) $safeName = 'file.' . $ext;

    $attachment = array(
        'name' => $safeName,
        'type' => $mimeType,
        'content' => $fileContent,
    );
}

$boundary = md5(uniqid((string) time(), true));

$encodedFromName = '=?UTF-8?B?' . base64_encode($fromName) . '?=';
$headers = "From: {$encodedFromName} <{$fromEmail}>\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: multipart/mixed; boundary=\"{$boundary}\"\r\n";

$message = "--{$boundary}\r\n";
$message .= "Content-Type: text/plain; charset=UTF-8\r\n";
$message .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
$message .= $bodyText . "\r\n";

if ($attachment !== null) {
    $encoded = chunk_split(base64_encode($attachment['content']));
    $message .= "--{$boundary}\r\n";
    $message .= "Content-Type: {$attachment['type']}; name=\"{$attachment['name']}\"\r\n";
    $message .= "Content-Transfer-Encoding: base64\r\n";
    $message .= "Content-Disposition: attachment; filename=\"{$attachment['name']}\"\r\n\r\n";
    $message .= $encoded . "\r\n";
}

$message .= "--{$boundary}--";

$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

$sent = @mail($to, $encodedSubject, $message, $headers);

if ($sent) {
    respond(true, 'Заявка отправлена.');
} else {
    respond(false, 'Не удалось отправить письмо. Позвоните нам или напишите на ' . $to . '.');
}
