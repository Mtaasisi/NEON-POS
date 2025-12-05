<?php
/**
 * WhatsApp Webhook DEBUG VERSION
 * Logs EVERYTHING to help troubleshoot
 */

// Enable all error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

// Set up detailed logging
$logFile = __DIR__ . '/webhook-debug.log';

function debugLog($message) {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message\n";
    file_put_contents($logFile, $logMessage, FILE_APPEND);
    error_log($logMessage);
}

debugLog("=================================");
debugLog("🔍 WEBHOOK DEBUG - REQUEST RECEIVED");
debugLog("=================================");
debugLog("Method: " . $_SERVER['REQUEST_METHOD']);
debugLog("URL: " . $_SERVER['REQUEST_URI']);
debugLog("Remote IP: " . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
debugLog("User Agent: " . ($_SERVER['HTTP_USER_AGENT'] ?? 'unknown'));

// Log all headers
debugLog("\n📋 HEADERS:");
foreach (getallheaders() as $name => $value) {
    debugLog("  $name: $value");
}

// Get raw input
$rawInput = file_get_contents('php://input');
debugLog("\n📥 RAW INPUT:");
debugLog("  Length: " . strlen($rawInput) . " bytes");
debugLog("  Content: " . substr($rawInput, 0, 1000));

// ALWAYS return 200 OK
http_response_code(200);
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    debugLog("\n✅ GET request - health check");
    echo json_encode([
        'status' => 'healthy',
        'debug' => true,
        'timestamp' => date('c'),
        'log_file' => $logFile
    ]);
    debugLog("Response sent: health check OK");
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    debugLog("\n⚠️  Non-POST request, ignoring");
    echo json_encode(['received' => true, 'method' => $_SERVER['REQUEST_METHOD']]);
    exit;
}

// Parse JSON
$webhook = json_decode($rawInput, true);
$jsonError = json_last_error();

debugLog("\n🔍 JSON PARSING:");
debugLog("  Error: " . ($jsonError === JSON_ERROR_NONE ? 'none' : json_last_error_msg()));

if ($jsonError !== JSON_ERROR_NONE) {
    debugLog("❌ JSON parse error: " . json_last_error_msg());
    echo json_encode([
        'received' => true,
        'error' => 'invalid_json',
        'debug' => true
    ]);
    exit;
}

debugLog("\n📨 WEBHOOK DATA:");
debugLog(json_encode($webhook, JSON_PRETTY_PRINT));

$eventType = $webhook['event'] ?? 'unknown';
debugLog("\n🎯 Event Type: $eventType");

// Database connection
$DB_HOST = 'ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech';
$DB_NAME = 'neondb';
$DB_USER = 'neondb_owner';
$DB_PASS = 'npg_vABqUKk73tEW';

debugLog("\n🔌 Attempting database connection...");

try {
    $dsn = "pgsql:host=$DB_HOST;dbname=$DB_NAME;sslmode=require";
    $pdo = new PDO($dsn, $DB_USER, $DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    debugLog("✅ Database connected successfully");
    
    // Process message
    if ($eventType === 'messages.received' || $eventType === 'messages.upsert') {
        debugLog("\n📬 Processing incoming message...");
        
        $message = $webhook['data'] ?? [];
        debugLog("Message data keys: " . implode(', ', array_keys($message)));
        
        if (!isset($message['from']) || !isset($message['id'])) {
            debugLog("❌ Missing required fields (from/id)");
            debugLog("Available keys: " . implode(', ', array_keys($message)));
            echo json_encode(['received' => true, 'error' => 'missing_fields']);
            exit;
        }
        
        // Extract data
        $from = str_replace('@s.whatsapp.net', '', $message['from']);
        $cleanPhone = preg_replace('/[^\d+]/', '', $from);
        $messageText = $message['text'] ?? $message['body'] ?? $message['caption'] ?? '';
        $messageType = $message['type'] ?? 'text';
        $messageId = $message['id'];
        $timestamp = $message['timestamp'] ?? date('c');
        
        debugLog("\n📝 Extracted data:");
        debugLog("  Phone: $cleanPhone");
        debugLog("  Message ID: $messageId");
        debugLog("  Message Text: " . substr($messageText, 0, 100));
        debugLog("  Message Type: $messageType");
        debugLog("  Timestamp: $timestamp");
        
        // Find customer
        debugLog("\n👤 Looking for customer...");
        $stmt = $pdo->prepare("
            SELECT id, name FROM customers 
            WHERE phone = ? OR phone = ? OR whatsapp = ? OR whatsapp = ?
            LIMIT 1
        ");
        $stmt->execute([$cleanPhone, '+' . $cleanPhone, $cleanPhone, '+' . $cleanPhone]);
        $customer = $stmt->fetch();
        
        if ($customer) {
            debugLog("✅ Customer found: " . $customer['name'] . " (ID: " . $customer['id'] . ")");
        } else {
            debugLog("⚠️  No customer found");
        }
        
        // Insert message
        debugLog("\n💾 Inserting into database...");
        $stmt = $pdo->prepare("
            INSERT INTO whatsapp_incoming_messages 
            (message_id, from_phone, customer_id, message_text, message_type, 
             media_url, received_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            ON CONFLICT (message_id) DO UPDATE 
            SET message_text = EXCLUDED.message_text
            RETURNING id
        ");
        
        $stmt->execute([
            $messageId,
            $cleanPhone,
            $customer['id'] ?? null,
            substr($messageText, 0, 5000),
            $messageType,
            $message['image'] ?? $message['video'] ?? $message['document'] ?? $message['audio'] ?? null,
            $timestamp
        ]);
        
        $result = $stmt->fetch();
        
        if ($result) {
            debugLog("✅ Message inserted successfully! ID: " . $result['id']);
        } else {
            debugLog("⚠️  Message might be duplicate (ON CONFLICT)");
        }
        
        // Verify insertion
        $count = $pdo->query("SELECT COUNT(*) as c FROM whatsapp_incoming_messages")->fetch();
        debugLog("📊 Total messages in database now: " . $count['c']);
        
    } else {
        debugLog("ℹ️  Event type '$eventType' - not processing as message");
    }
    
    debugLog("\n✅ Webhook processing complete!");
    
} catch (Exception $e) {
    debugLog("\n❌ ERROR: " . $e->getMessage());
    debugLog("Stack trace: " . $e->getTraceAsString());
}

debugLog("=================================\n");

echo json_encode([
    'received' => true,
    'debug' => true,
    'event' => $eventType,
    'timestamp' => date('c'),
    'log_file' => $logFile
]);
?>
