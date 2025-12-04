<?php
/**
 * WhatsApp Webhook Handler for Hostinger
 * Receives WhatsApp events from WasenderAPI
 * Stores in Neon PostgreSQL database
 * 
 * URL: https://dukani.site/api/whatsapp/webhook.php
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle OPTIONS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Neon database connection
$DB_HOST = 'ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech';
$DB_NAME = 'neondb';
$DB_USER = 'neondb_owner';
$DB_PASS = 'npg_vABqUKk73tEW';

// Optional webhook secret for security
$WEBHOOK_SECRET = getenv('WHATSAPP_WEBHOOK_SECRET') ?: '';

/**
 * GET request - Health check
 */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode([
        'status' => 'healthy',
        'service' => 'whatsapp-webhook',
        'timestamp' => date('c'),
        'environment' => 'production',
        'message' => 'WhatsApp webhook endpoint is active'
    ]);
    exit;
}

/**
 * POST request - Receive webhook events
 */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // ALWAYS return 200 OK FIRST - This prevents WasenderAPI from seeing errors
    http_response_code(200);
    
    // Debug log - START
    error_log("=== WEBHOOK DEBUG START ===");
    error_log("Time: " . date('Y-m-d H:i:s'));
    error_log("Request Method: " . $_SERVER['REQUEST_METHOD']);
    error_log("Content-Type: " . ($_SERVER['CONTENT_TYPE'] ?? 'not set'));
    error_log("User-Agent: " . ($_SERVER['HTTP_USER_AGENT'] ?? 'not set'));
    
    try {
        // Get webhook payload
        $input = file_get_contents('php://input');
        error_log("📥 Raw input length: " . strlen($input) . " bytes");
        error_log("📥 Raw input (first 1000 chars): " . substr($input, 0, 1000));
        
        if (empty($input)) {
            error_log("⚠️ WARNING: Empty input received");
            echo json_encode([
                'received' => true, 
                'warning' => 'empty_input',
                'debug' => true,
                'timestamp' => date('c')
            ]);
            exit;
        }
        
        $webhook = json_decode($input, true);
        $jsonError = json_last_error();
        
        if ($jsonError !== JSON_ERROR_NONE) {
            error_log("❌ JSON decode error: " . json_last_error_msg());
            error_log("❌ JSON error code: " . $jsonError);
            echo json_encode([
                'received' => true, 
                'error' => 'invalid_json',
                'json_error' => json_last_error_msg(),
                'debug' => true,
                'timestamp' => date('c')
            ]);
            exit;
        }
        
        if (!$webhook) {
            error_log("⚠️ Webhook data is null after JSON decode");
            echo json_encode([
                'received' => true, 
                'error' => 'null_webhook',
                'debug' => true,
                'timestamp' => date('c')
            ]);
            exit;
        }
        
        $eventType = $webhook['event'] ?? 'unknown';
        error_log("📨 Event Type: " . $eventType);
        error_log("📨 Full webhook data: " . json_encode($webhook));
        
        // Process webhook (non-blocking)
        error_log("🔄 Starting webhook processing...");
        try {
            processWebhook($webhook);
            error_log("✅ Webhook processing completed successfully");
        } catch (Exception $processError) {
            error_log("❌ Processing error: " . $processError->getMessage());
            error_log("❌ Error trace: " . $processError->getTraceAsString());
        }
        
        error_log("=== WEBHOOK DEBUG END (SUCCESS) ===");
        
        // Respond with success
        echo json_encode([
            'received' => true,
            'timestamp' => date('c'),
            'event' => $eventType,
            'debug' => true,
            'status' => 'processed'
        ]);
        
    } catch (Exception $e) {
        error_log("❌ CRITICAL ERROR: " . $e->getMessage());
        error_log("❌ Error file: " . $e->getFile());
        error_log("❌ Error line: " . $e->getLine());
        error_log("❌ Error trace: " . $e->getTraceAsString());
        error_log("=== WEBHOOK DEBUG END (ERROR) ===");
        
        echo json_encode([
            'received' => true, 
            'error' => 'exception',
            'message' => $e->getMessage(),
            'debug' => true,
            'timestamp' => date('c')
        ]);
    }
    exit;
}

/**
 * Process webhook events
 */
function processWebhook($data) {
    global $DB_HOST, $DB_NAME, $DB_USER, $DB_PASS;
    
    try {
        error_log("🔌 Attempting database connection...");
        error_log("   Host: " . $DB_HOST);
        error_log("   Database: " . $DB_NAME);
        
        // Connect to Neon database
        $dsn = "pgsql:host=$DB_HOST;dbname=$DB_NAME;sslmode=require";
        $pdo = new PDO($dsn, $DB_USER, $DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);
        
        error_log("✅ Database connected successfully");
        
        $eventType = $data['event'] ?? 'unknown';
        error_log("🎯 Processing event type: " . $eventType);
        
        switch ($eventType) {
            case 'messages.received':
            case 'messages.upsert':
                handleIncomingMessage($pdo, $data);
                break;
                
            case 'messages.update':
                handleMessageStatusUpdate($pdo, $data);
                break;
                
            case 'messages.reaction':
                handleMessageReaction($pdo, $data);
                break;
                
            case 'call.received':
                handleIncomingCall($pdo, $data);
                break;
                
            case 'poll.results':
                handlePollResults($pdo, $data);
                break;
                
            default:
                error_log("ℹ️ Unhandled event: $eventType");
        }
        
    } catch (Exception $e) {
        error_log("❌ Database error: " . $e->getMessage());
        
        // Log failed webhook for retry
        try {
            $stmt = $pdo->prepare("
                INSERT INTO webhook_failures (event_type, payload, error_message, created_at)
                VALUES (?, ?, ?, NOW())
            ");
            $stmt->execute([
                $eventType ?? 'unknown',
                json_encode($data),
                $e->getMessage()
            ]);
        } catch (Exception $logError) {
            error_log("❌ Could not log webhook failure: " . $logError->getMessage());
        }
    }
}

/**
 * Handle incoming WhatsApp messages
 */
function handleIncomingMessage($pdo, $data) {
    error_log("📬 handleIncomingMessage called");
    
    $message = $data['data'] ?? [];
    error_log("📬 Message data: " . json_encode($message));
    
    if (!isset($message['from']) || !isset($message['id'])) {
        error_log("⚠️ Invalid message data - missing 'from' or 'id'");
        error_log("⚠️ Available keys: " . implode(', ', array_keys($message)));
        return;
    }
    
    error_log("✅ Message validation passed");
    
    // Clean phone number
    $from = str_replace('@s.whatsapp.net', '', $message['from']);
    $cleanPhone = preg_replace('/[^\d+]/', '', $from);
    error_log("📞 Clean phone: " . $cleanPhone);
    
    $messageText = $message['text'] ?? $message['caption'] ?? '';
    $messageType = $message['type'] ?? 'text';
    $messageId = $message['id'];
    $timestamp = $message['timestamp'] ?? date('c');
    
    error_log("📝 Message details:");
    error_log("   ID: " . $messageId);
    error_log("   Type: " . $messageType);
    error_log("   Text: " . substr($messageText, 0, 100));
    error_log("   Timestamp: " . $timestamp);
    
    // Find customer by phone
    $customer = findCustomerByPhone($pdo, $cleanPhone);
    if ($customer) {
        error_log("👤 Customer found: " . $customer['name'] . " (ID: " . $customer['id'] . ")");
    } else {
        error_log("👤 No customer found for: " . $cleanPhone);
    }
    
    // Store incoming message
    error_log("💾 Preparing to insert message into database...");
    $stmt = $pdo->prepare("
        INSERT INTO whatsapp_incoming_messages 
        (message_id, from_phone, customer_id, message_text, message_type, 
         media_url, received_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ON CONFLICT (message_id) DO NOTHING
    ");
    
    error_log("💾 Executing SQL insert...");
    $stmt->execute([
        $messageId,
        $cleanPhone,
        $customer['id'] ?? null,
        substr($messageText, 0, 5000),
        $messageType,
        $message['image'] ?? $message['video'] ?? $message['document'] ?? $message['audio'] ?? null,
        $timestamp
    ]);
    
    $rowCount = $stmt->rowCount();
    error_log("✅ SQL executed. Rows affected: " . $rowCount);
    error_log("✅ Incoming message stored from: $cleanPhone");
    
    // Also log to customer_communications if customer found
    if ($customer) {
        $stmt = $pdo->prepare("
            INSERT INTO customer_communications 
            (customer_id, type, message, phone_number, status, sent_at, created_at)
            VALUES (?, 'whatsapp', ?, ?, 'received', ?, NOW())
        ");
        
        $stmt->execute([
            $customer['id'],
            substr($messageText, 0, 5000),
            $cleanPhone,
            $timestamp
        ]);
        
        error_log("✅ Message linked to customer: " . $customer['name']);
    }
}

/**
 * Handle message status updates
 */
function handleMessageStatusUpdate($pdo, $data) {
    $update = $data['data'] ?? [];
    
    if (!isset($update['id']) || !isset($update['status'])) {
        return;
    }
    
    $messageId = $update['id'];
    $status = $update['status'];
    
    // Update whatsapp_logs table
    $updateFields = ['status' => $status];
    
    if ($status === 'delivered') {
        $updateFields['delivered_at'] = 'NOW()';
    } elseif ($status === 'read') {
        $updateFields['read_at'] = 'NOW()';
    }
    
    $sql = "UPDATE whatsapp_logs SET status = ?";
    $params = [$status];
    
    if ($status === 'delivered') {
        $sql .= ", delivered_at = NOW()";
    } elseif ($status === 'read') {
        $sql .= ", read_at = NOW()";
    }
    
    $sql .= " WHERE message_id = ?";
    $params[] = $messageId;
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    error_log("✅ Message status updated: $messageId → $status");
}

/**
 * Handle message reactions
 */
function handleMessageReaction($pdo, $data) {
    $reaction = $data['data'] ?? [];
    
    if (!isset($reaction['messageId']) || !isset($reaction['reaction'])) {
        return;
    }
    
    $stmt = $pdo->prepare("
        INSERT INTO whatsapp_reactions (message_id, from_phone, emoji, created_at)
        VALUES (?, ?, ?, NOW())
    ");
    
    $stmt->execute([
        $reaction['messageId'],
        $reaction['from'] ?? 'unknown',
        $reaction['reaction']
    ]);
    
    error_log("👍 Reaction stored: " . $reaction['reaction']);
}

/**
 * Handle incoming calls
 */
function handleIncomingCall($pdo, $data) {
    $call = $data['data'] ?? [];
    
    if (!isset($call['from'])) {
        return;
    }
    
    $stmt = $pdo->prepare("
        INSERT INTO whatsapp_calls (from_phone, call_type, call_timestamp, created_at)
        VALUES (?, ?, ?, NOW())
    ");
    
    $stmt->execute([
        $call['from'],
        $call['callType'] ?? 'voice',
        $call['timestamp'] ?? date('c')
    ]);
    
    error_log("📞 Call logged from: " . $call['from']);
}

/**
 * Handle poll results
 */
function handlePollResults($pdo, $data) {
    $poll = $data['data'] ?? [];
    
    if (!isset($poll['pollId']) || !isset($poll['voter'])) {
        return;
    }
    
    $stmt = $pdo->prepare("
        INSERT INTO whatsapp_poll_results (poll_id, voter_phone, selected_options, created_at)
        VALUES (?, ?, ?, NOW())
    ");
    
    $stmt->execute([
        $poll['pollId'],
        $poll['voter'],
        json_encode($poll['selectedOptions'] ?? [])
    ]);
    
    error_log("📊 Poll result stored");
}

/**
 * Find customer by phone number
 */
function findCustomerByPhone($pdo, $phone) {
    // Try multiple phone format variations
    $phoneVariants = [
        $phone,
        '+' . $phone,
        preg_replace('/^\+/', '', $phone)
    ];
    
    $placeholders = implode(',', array_fill(0, count($phoneVariants), '?'));
    
    $stmt = $pdo->prepare("
        SELECT id, name, phone, whatsapp 
        FROM customers 
        WHERE phone IN ($placeholders) OR whatsapp IN ($placeholders)
        LIMIT 1
    ");
    
    $stmt->execute(array_merge($phoneVariants, $phoneVariants));
    
    return $stmt->fetch() ?: null;
}
?>

