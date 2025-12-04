<?php
/**
 * WhatsApp Webhook DIAGNOSTIC VERSION
 * Tests database connection and logs errors
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Enable error logging
error_reporting(E_ALL);
ini_set('display_errors', '1');
ini_set('log_errors', '1');

$logFile = __DIR__ . '/webhook-debug.log';

function debugLog($message) {
    global $logFile;
    file_put_contents($logFile, date('[Y-m-d H:i:s] ') . $message . "\n", FILE_APPEND);
}

debugLog("=== WEBHOOK DEBUG START ===");
debugLog("Method: " . $_SERVER['REQUEST_METHOD']);

// Health check
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    debugLog("GET request - health check");
    
    // Test database connection
    try {
        $dsn = "pgsql:host=ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech;dbname=neondb;sslmode=require";
        $pdo = new PDO($dsn, 'neondb_owner', 'npg_vABqUKk73tEW', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]);
        
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM whatsapp_incoming_messages");
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        debugLog("DB connection SUCCESS. Message count: " . $result['count']);
        
        echo json_encode([
            'status' => 'healthy',
            'database' => 'connected',
            'message_count' => $result['count'],
            'pdo_drivers' => PDO::getAvailableDrivers(),
            'timestamp' => date('c')
        ]);
    } catch (Exception $e) {
        debugLog("DB connection FAILED: " . $e->getMessage());
        
        echo json_encode([
            'status' => 'error',
            'database' => 'failed',
            'error' => $e->getMessage(),
            'pdo_drivers' => PDO::getAvailableDrivers(),
            'timestamp' => date('c')
        ]);
    }
    exit;
}

// POST request - receive webhook
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $input = file_get_contents('php://input');
        debugLog("POST received. Payload length: " . strlen($input));
        
        $webhook = json_decode($input, true);
        
        if (!$webhook) {
            throw new Exception('Invalid JSON');
        }
        
        $eventType = $webhook['event'] ?? 'unknown';
        debugLog("Event type: $eventType");
        
        // Connect to database
        debugLog("Connecting to database...");
        $dsn = "pgsql:host=ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech;dbname=neondb;sslmode=require";
        $pdo = new PDO($dsn, 'neondb_owner', 'npg_vABqUKk73tEW', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]);
        debugLog("Database connected!");
        
        // Process message
        if ($eventType === 'messages.received' || $eventType === 'messages.upsert') {
            $message = $webhook['data'] ?? [];
            
            if (!isset($message['from']) || !isset($message['id'])) {
                throw new Exception('Invalid message data');
            }
            
            $from = str_replace('@s.whatsapp.net', '', $message['from']);
            $cleanPhone = preg_replace('/[^\d]/', '', $from);
            $messageText = $message['text'] ?? $message['caption'] ?? '';
            $messageId = $message['id'];
            
            debugLog("Message from: $cleanPhone, ID: $messageId, Text: $messageText");
            
            // Insert into database
            $stmt = $pdo->prepare("
                INSERT INTO whatsapp_incoming_messages 
                (message_id, from_phone, message_text, message_type, received_at, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
                ON CONFLICT (message_id) DO NOTHING
                RETURNING id
            ");
            
            $stmt->execute([
                $messageId,
                $cleanPhone,
                substr($messageText, 0, 5000),
                $message['type'] ?? 'text',
                $message['timestamp'] ?? date('c')
            ]);
            
            $inserted = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($inserted) {
                debugLog("✅ Message saved! DB ID: " . $inserted['id']);
            } else {
                debugLog("ℹ️ Duplicate message (already exists)");
            }
            
            echo json_encode([
                'received' => true,
                'saved' => !!$inserted,
                'event' => $eventType,
                'timestamp' => date('c')
            ]);
        } else {
            debugLog("Event type not handled: $eventType");
            echo json_encode(['received' => true, 'event' => $eventType]);
        }
        
        debugLog("=== SUCCESS ===\n");
        
    } catch (Exception $e) {
        debugLog("❌ ERROR: " . $e->getMessage());
        debugLog("Stack trace: " . $e->getTraceAsString());
        debugLog("=== FAILED ===\n");
        
        http_response_code(500);
        echo json_encode([
            'received' => false,
            'error' => $e->getMessage(),
            'timestamp' => date('c')
        ]);
    }
    exit;
}

debugLog("Invalid request method\n");
http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
?>

