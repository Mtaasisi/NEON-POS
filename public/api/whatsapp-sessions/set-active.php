<?php
/**
 * Set Active WhatsApp Session for User
 * Updates the user's currently selected active session
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
    
    if (!$input || !isset($input['user_id']) || !isset($input['session_id'])) {
        throw new Exception('user_id and session_id are required');
    }
    
    $userId = $input['user_id'];
    $sessionId = $input['session_id'];
    
    // Verify session exists and is connected
    $sessionStmt = $pdo->prepare("
        SELECT id, name, status FROM whatsapp_sessions
        WHERE id = ?
    ");
    $sessionStmt->execute([$sessionId]);
    $session = $sessionStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$session) {
        throw new Exception('Session not found');
    }
    
    if ($session['status'] !== 'connected') {
        throw new Exception('Session is not connected. Please connect the session first.');
    }
    
    // Check if user preferences exist
    $checkStmt = $pdo->prepare("
        SELECT id FROM user_whatsapp_preferences
        WHERE user_id = ?
    ");
    $checkStmt->execute([$userId]);
    $existingPrefs = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    if ($existingPrefs) {
        // Update existing preferences
        $updateStmt = $pdo->prepare("
            UPDATE user_whatsapp_preferences
            SET active_session_id = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        ");
        $updateStmt->execute([$sessionId, $userId]);
    } else {
        // Insert new preferences
        $insertStmt = $pdo->prepare("
            INSERT INTO user_whatsapp_preferences (user_id, active_session_id)
            VALUES (?, ?)
        ");
        $insertStmt->execute([$userId, $sessionId]);
    }
    
    echo json_encode([
        'success' => true,
        'message' => "Active session set to '{$session['name']}'",
        'active_session_id' => $sessionId
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

