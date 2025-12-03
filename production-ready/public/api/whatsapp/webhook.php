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
$DB_HOST = 'ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech';
$DB_NAME = 'neondb';
$DB_USER = 'neondb_owner';
$DB_PASS = 'npg_dMyv1cG4KSOR';

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
    try {
        // Get webhook payload
        $input = file_get_contents('php://input');
        $webhook = json_decode($input, true);
        
        if (!$webhook) {
            throw new Exception('Invalid JSON payload');
        }
        
        $eventType = $webhook['event'] ?? 'unknown';
        
        // Log event (optional)
        error_log("📨 WhatsApp Webhook: $eventType");
        
        // Immediately respond 200 OK (required by WasenderAPI)
        http_response_code(200);
        echo json_encode([
            'received' => true,
            'timestamp' => date('c'),
            'event' => $eventType
        ]);
        
        // Process webhook asynchronously
        processWebhook($webhook);
        
    } catch (Exception $e) {
        error_log("❌ Webhook error: " . $e->getMessage());
        http_response_code(200); // Still return 200 to prevent retries
        echo json_encode(['received' => true, 'error' => 'logged']);
    }
    exit;
}

/**
 * Process webhook events
 */
function processWebhook($data) {
    global $DB_HOST, $DB_NAME, $DB_USER, $DB_PASS;
    
    try {
        // Connect to Neon database
        $dsn = "pgsql:host=$DB_HOST;dbname=$DB_NAME;sslmode=require";
        $pdo = new PDO($dsn, $DB_USER, $DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);
        
        $eventType = $data['event'] ?? 'unknown';
        
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
    $message = $data['data'] ?? [];
    
    if (!isset($message['from']) || !isset($message['id'])) {
        error_log("⚠️ Invalid message data");
        return;
    }
    
    // Clean phone number
    $from = str_replace('@s.whatsapp.net', '', $message['from']);
    $cleanPhone = preg_replace('/[^\d+]/', '', $from);
    
    $messageText = $message['text'] ?? $message['caption'] ?? '';
    $messageType = $message['type'] ?? 'text';
    $messageId = $message['id'];
    $timestamp = $message['timestamp'] ?? date('c');
    
    // Find customer by phone
    $customer = findCustomerByPhone($pdo, $cleanPhone);
    
    // Store incoming message
    $stmt = $pdo->prepare("
        INSERT INTO whatsapp_incoming_messages 
        (message_id, from_phone, customer_id, message_text, message_type, 
         media_url, received_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ON CONFLICT (message_id) DO NOTHING
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

