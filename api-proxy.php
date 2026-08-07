<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Cache-Control: public, max-age=180');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$type = $_GET['type'] ?? '';
$id   = $_GET['id']   ?? '';

if (!in_array($type, ['competition', 'contest']) || empty($id)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid params']);
    exit;
}

$url = "https://pk.rgsu.net/{$type}/{$id}";

$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL            => $url,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_ENCODING       => '',
    CURLOPT_HTTPHEADER     => [
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language: ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer: https://pk.rgsu.net/',
    ],
]);

$html = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$errno    = curl_errno($ch);
$err      = curl_error($ch);
curl_close($ch);

if ($errno || !$html) {
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => "Curl error: {$err}"]);
    exit;
}

if ($httpCode !== 200) {
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => "RGSU returned {$httpCode}"]);
    exit;
}

// Parse seats — find card whose caption contains "Количество мест" or starts with "Места"
$seats = 0;
$seatCardRegex = '/<span class="faculty-intro__card-caption">[^<]*(?:Количество мест|Места)[^<]*<\/span>\s*<p class="faculty-intro__card-text">\s*(\d+)/i';
if (preg_match($seatCardRegex, $html, $sm)) {
    $seats = (int)$sm[1];
} else {
    // Fallback: look for any caption containing "мест" and extract number from same card
    if (preg_match('/faculty-intro__card-caption[^>]*>[^<]*мест/i', $html, $m)) {
        $pos = strpos($html, $m[0]);
        $block = substr($html, $pos, 500);
        if (preg_match('/faculty-intro__card-text[^>]*>\s*(\d+)/i', $block, $vm)) {
            $seats = (int)$vm[1];
        }
    }
}

// Parse updatedAt
$updatedAt = null;
if (preg_match('/Сведения\s+обновлены:\s*([^<]+)/i', $html, $um)) {
    $updatedAt = trim($um[1]);
}

// Parse students
$students = [];
$rowRegex = '/<tr\s+data-unique-code="([^"]*)"[^>]*>([\s\S]*?)<\/tr>/i';
preg_match_all($rowRegex, $html, $rows, PREG_SET_ORDER);

if (empty($rows)) {
    $rowRegex = '/<tr[^>]*>([\s\S]*?)<\/tr>/i';
    preg_match_all($rowRegex, $html, $rows, PREG_SET_ORDER);
}

foreach ($rows as $i => $row) {
    $rowHtml = isset($row[2]) ? $row[2] : $row[1];
    
    // Extract cells
    $cells = [];
    $cellRegex = '/<td[^>]*>([\s\S]*?)<\/td>/i';
    preg_match_all($cellRegex, $rowHtml, $cellMatches, PREG_SET_ORDER);
    foreach ($cellMatches as $cm) {
        $cells[] = trim(strip_tags($cm[1]));
    }

    $uniqueCode = '';
    if (isset($row[1]) && !empty($row[1]) && $row[1] !== '-' && !strpos($row[1], 'госуслуг')) {
        $uniqueCode = trim($row[1]);
    }
    if (empty($uniqueCode)) {
        foreach ($cells as $c) {
            $cClean = trim($c);
            if (strlen($cClean) >= 5 && preg_match('/\d/', $cClean) && strpos($cClean, 'госуслуг') === false && strpos($cClean, 'код') === false && strpos($cClean, 'Сумма') === false) {
                $uniqueCode = $cClean;
                break;
            }
        }
    }
    if (empty($uniqueCode) || $uniqueCode === '-') continue;

    if (count($cells) >= 15) {
        if ($type === 'competition') {
            $students[] = [
                'id'                    => "student-{$i}",
                'uniqueCode'            => $uniqueCode,
                'totalPoints'           => (int)($cells[2] ?? 0),
                'examPoints'            => (int)($cells[3] ?? 0),
                'subjects'              => [(int)($cells[4] ?? 0), (int)($cells[5] ?? 0), (int)($cells[6] ?? 0)],
                'achievementPoints'     => (int)($cells[7] ?? 0),
                'hasOriginal'           => isset($cells[8]) && strtolower(trim($cells[8])) === 'да',
                'priority'              => (int)($cells[9] ?? 1),
                'mainHigherPriority'    => $cells[10] ?? '-',
                'higherPassingPriority' => $cells[11] ?? '1',
                'preemptiveRight1'      => $cells[12] ?? 'Нет',
                'preemptiveRight2'      => $cells[13] ?? 'Нет',
                'idAtEquality'          => $cells[14] ?? 'Нет',
                'withoutExams'          => $cells[15] ?? 'Нет',
                'basisBVI'              => $cells[16] ?? '-',
                'status'                => $cells[17] ?? 'Зачислен',
            ];
        } else {
            $students[] = [
                'id'                    => "student-{$i}",
                'uniqueCode'            => $uniqueCode,
                'totalPoints'           => (int)($cells[2] ?? 0),
                'examPoints'            => (int)($cells[3] ?? 0),
                'subjects'              => [(int)($cells[4] ?? 0), (int)($cells[5] ?? 0), (int)($cells[6] ?? 0)],
                'achievementPoints'     => (int)($cells[7] ?? 0),
                'hasOriginal'           => isset($cells[8]) && strtolower(trim($cells[8])) === 'да',
                'semesterPayment'       => $cells[9] ?? 'Нет',
                'priority'              => (int)($cells[10] ?? 1),
                'mainHigherPriority'    => '-',
                'higherPassingPriority' => '1',
                'preemptiveRight1'      => $cells[11] ?? 'Нет',
                'preemptiveRight2'      => $cells[12] ?? 'Нет',
                'idAtEquality'          => $cells[13] ?? 'Нет',
                'withoutExams'          => $cells[14] ?? 'Нет',
                'basisBVI'              => $cells[15] ?? '-',
                'status'                => $cells[16] ?? 'Зачислен',
            ];
        }
    } else if (count($cells) >= 5) {
        $students[] = [
            'id'                    => "student-{$i}",
            'uniqueCode'            => $uniqueCode,
            'totalPoints'           => (int)($cells[2] ?? 0),
            'examPoints'            => (int)($cells[3] ?? 0),
            'subjects'              => [0, 0, 0],
            'achievementPoints'     => (int)($cells[4] ?? 0),
            'hasOriginal'           => true,
            'priority'              => 1,
            'mainHigherPriority'    => '1',
            'higherPassingPriority' => '1',
            'preemptiveRight1'      => 'Нет',
            'preemptiveRight2'      => 'Нет',
            'idAtEquality'          => 'Нет',
            'withoutExams'          => $cells[5] ?? 'Нет',
            'basisBVI'              => $cells[5] ?? '-',
            'status'                => 'Зачислен',
        ];
    }
}

echo json_encode([
    'success'   => true,
    'data'      => $students,
    'updatedAt' => $updatedAt,
    'seats'     => $seats,
], JSON_UNESCAPED_UNICODE);
