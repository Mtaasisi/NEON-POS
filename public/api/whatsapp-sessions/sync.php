<?php
/**
 * WhatsApp Session Sync API
 * Syncs session data from WasenderAPI to local database
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/database.php';

try {
    // Get request body
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['session'])) {
        throw new Exception('Session data is required');
    }
    
    $session = $input['session'];
    
    // Validate required fields
    if (!isset($session['id']) || !isset($session['name']) || !isset($session['phone_number'])) {
        throw new Exception('Missing required session fields');
    }
    
    // Check if session exists
    $checkStmt = $pdo->prepare("
        SELECT id FROM whatsapp_sessions 
        WHERE wasender_session_id = ?
    ");
    $checkStmt->execute([$session['id']]);
    $existingSession = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    if ($existingSession) {
        // Update existing session
        $updateStmt = $pdo->prepare("
            UPDATE whatsapp_sessions SET
                name = ?,
                phone_number = ?,
                status = ?,
                account_protection = ?,
                log_messages = ?,
                webhook_url = ?,
                webhook_enabled = ?,
                webhook_events = ?,
                api_key = ?,
                webhook_secret = ?,
                session_data = ?,
                user_info = ?,
                last_connected_at = CASE WHEN ? = 'connected' THEN CURRENT_TIMESTAMP ELSE last_connected_at END,
                updated_at = CURRENT_TIMESTAMP
            WHERE wasender_session_id = ?
        ");
        
        $updateStmt->execute([
            $session['name'],
            $session['phone_number'],
            $session['status'] ?? 'DISCONNECTED',
            $session['account_protection'] ?? true,
            $session['log_messages'] ?? true,
            $session['webhook_url'] ?? null,
            $session['webhook_enabled'] ?? false,
            json_encode($session['webhook_events'] ?? []),
            $session['api_key'] ?? null,
            $session['webhook_secret'] ?? null,
            json_encode($session),
            json_encode($session['user_info'] ?? null),
            $session['status'] ?? 'DISCONNECTED',
            $session['id']
        ]);
        
        // Log the update
        $logStmt = $pdo->prepare("
            INSERT INTO whatsapp_session_logs (session_id, event_type, message, metadata)
            VALUES (?, 'session_updated', 'Session data synchronized from WasenderAPI', ?)
        ");
        $logStmt->execute([
            $existingSession['id'],
            json_encode(['status' => $session['status'] ?? 'DISCONNECTED'])
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Session updated successfully',
            'session_id' => $existingSession['id']
        ]);
    } else {
        // Insert new session
        $insertStmt = $pdo->prepare("
            INSERT INTO whatsapp_sessions (
                wasender_session_id, name, phone_number, status,
                account_protection, log_messages, webhook_url, webhook_enabled,
                webhook_events, api_key, webhook_secret, session_data, user_info,
                last_connected_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $insertStmt->execute([
            $session['id'],
            $session['name'],
            $session['phone_number'],
            $session['status'] ?? 'DISCONNECTED',
            $session['account_protection'] ?? true,
            $session['log_messages'] ?? true,
            $session['webhook_url'] ?? null,
            $session['webhook_enabled'] ?? false,
            json_encode($session['webhook_events'] ?? []),
            $session['api_key'] ?? null,
            $session['webhook_secret'] ?? null,
            json_encode($session),
            json_encode($session['user_info'] ?? null),
            ($session['status'] ?? 'DISCONNECTED') === 'connected' ? date('Y-m-d H:i:s') : null
        ]);
        
        $newSessionId = $pdo->lastInsertId();
        
        // Log the creation
        $logStmt = $pdo->prepare("
            INSERT INTO whatsapp_session_logs (session_id, event_type, message, metadata)
            VALUES (?, 'session_created', 'New session created and synchronized from WasenderAPI', ?)
        ");
        $logStmt->execute([
            $newSessionId,
            json_encode(['status' => $session['status'] ?? 'DISCONNECTED'])
        ]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Session created successfully',
            'session_id' => $newSessionId
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

