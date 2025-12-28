<?php
/**
 * Get Active WhatsApp Session for User
 * Returns the user's currently selected active session
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
    // Get user_id from query parameter
    $userId = $_GET['user_id'] ?? null;
    
    if (!$userId) {
        throw new Exception('user_id is required');
    }
    
    // Get user's active session preference
    $prefStmt = $pdo->prepare("
        SELECT active_session_id, auto_select_session
        FROM user_whatsapp_preferences
        WHERE user_id = ?
    ");
    $prefStmt->execute([$userId]);
    $prefs = $prefStmt->fetch(PDO::FETCH_ASSOC);
    
    $activeSessionId = null;
    
    if ($prefs && $prefs['active_session_id']) {
        // User has a preferred session
        $activeSessionId = $prefs['active_session_id'];
    } elseif (!$prefs || $prefs['auto_select_session']) {
        // Auto-select first connected session
        $autoStmt = $pdo->prepare("
            SELECT id FROM whatsapp_sessions
            WHERE status = 'connected'
            ORDER BY last_connected_at DESC, created_at DESC
            LIMIT 1
        ");
        $autoStmt->execute();
        $autoSession = $autoStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($autoSession) {
            $activeSessionId = $autoSession['id'];
        }
    }
    
    if (!$activeSessionId) {
        echo json_encode([
            'success' => true,
            'active_session' => null,
            'message' => 'No active session available'
        ]);
        exit();
    }
    
    // Get full session details
    $sessionStmt = $pdo->prepare("
        SELECT 
            id,
            wasender_session_id,
            name,
            phone_number,
            status,
            account_protection,
            log_messages,
            last_connected_at,
            created_at,
            updated_at
        FROM whatsapp_sessions
        WHERE id = ?
    ");
    $sessionStmt->execute([$activeSessionId]);
    $session = $sessionStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$session) {
        echo json_encode([
            'success' => true,
            'active_session' => null,
            'message' => 'Active session not found'
        ]);
        exit();
    }
    
    // Check if session is still connected
    if ($session['status'] !== 'connected') {
        echo json_encode([
            'success' => true,
            'active_session' => $session,
            'warning' => 'Active session is not connected'
        ]);
        exit();
    }
    
    echo json_encode([
        'success' => true,
        'active_session' => $session
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

