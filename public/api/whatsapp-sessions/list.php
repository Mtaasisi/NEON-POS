<?php
/**
 * WhatsApp Sessions List API
 * Get all WhatsApp sessions from local database
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../config/database.php';

try {
    // Get all sessions
    $stmt = $pdo->prepare("
        SELECT 
            id,
            wasender_session_id,
            name,
            phone_number,
            status,
            account_protection,
            log_messages,
            webhook_url,
            webhook_enabled,
            webhook_events,
            last_connected_at,
            created_at,
            updated_at
        FROM whatsapp_sessions
        ORDER BY created_at DESC
    ");
    
    $stmt->execute();
    $sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Parse JSON fields
    foreach ($sessions as &$session) {
        $session['webhook_events'] = json_decode($session['webhook_events'] ?? '[]', true);
        $session['account_protection'] = (bool)$session['account_protection'];
        $session['log_messages'] = (bool)$session['log_messages'];
        $session['webhook_enabled'] = (bool)$session['webhook_enabled'];
    }
    
    echo json_encode([
        'success' => true,
        'data' => $sessions
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

