<?php
/**
 * WhatsApp Webhook - Proxy to Local Backend
 * This version forwards webhooks to your local backend API
 * which has PostgreSQL access
 */

header('Content-Type: application/json');

// Your local backend URL
$BACKEND_URL = 'http://localhost:8000/api/whatsapp/webhook';

// Log file for debugging
$logFile = __DIR__ . '/webhook-proxy.log';

function logDebug($message) {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

logDebug("=== WEBHOOK RECEIVED ===");
logDebug("Method: " . $_SERVER['REQUEST_METHOD']);

// ALWAYS return 200 OK
http_response_code(200);

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode([
        'status' => 'healthy',
        'service' => 'whatsapp-webhook-proxy',
        'backend' => $BACKEND_URL,
        'timestamp' => date('c')
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['received' => true]);
    exit;
}

// Get webhook payload
$input = file_get_contents('php://input');
logDebug("Payload length: " . strlen($input));

if (empty($input)) {
    logDebug("Empty input");
    echo json_encode(['received' => true, 'warning' => 'empty_input']);
    exit;
}

$webhook = json_decode($input, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    logDebug("JSON error: " . json_last_error_msg());
    echo json_encode(['received' => true, 'error' => 'invalid_json']);
    exit;
}

$eventType = $webhook['event'] ?? 'unknown';
logDebug("Event: $eventType");

// Forward to local backend
try {
    $ch = curl_init($BACKEND_URL);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $input);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Content-Length: ' . strlen($input)
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    logDebug("Backend response: HTTP $httpCode");
    logDebug("Response: " . substr($response, 0, 200));
    
    if ($httpCode === 200) {
        logDebug("✅ Successfully forwarded to backend");
    } else {
        logDebug("⚠️ Backend returned HTTP $httpCode");
    }
    
} catch (Exception $e) {
    logDebug("❌ Error: " . $e->getMessage());
}

echo json_encode([
    'received' => true,
    'event' => $eventType,
    'timestamp' => date('c'),
    'proxied' => true
]);
?>

