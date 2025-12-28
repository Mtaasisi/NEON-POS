<?php
/**
 * Sync All Sessions from WasenderAPI to Local Database
 * Fetches all sessions from WasenderAPI and saves them locally
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
    // Get Bearer Token from integrations
    $integrationStmt = $pdo->prepare("
        SELECT credentials FROM lats_pos_integrations_settings
        WHERE integration_name = 'WHATSAPP_WASENDER' AND is_enabled = true
    ");
    $integrationStmt->execute();
    $integration = $integrationStmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$integration) {
        throw new Exception('WhatsApp integration not configured. Please configure in Admin Settings.');
    }
    
    $credentials = json_decode($integration['credentials'], true);
    $bearerToken = $credentials['api_key'] ?? $credentials['bearer_token'] ?? null;
    
    if (!$bearerToken) {
        throw new Exception('Bearer token not found in integration credentials');
    }
    
    // Fetch all sessions from WasenderAPI
    $curl = curl_init();
    curl_setopt_array($curl, [
        CURLOPT_URL => 'https://www.wasenderapi.com/api/whatsapp-sessions',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $bearerToken,
            'Content-Type: application/json'
        ]
    ]);
    
    $response = curl_exec($curl);
    $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);
    
    if ($httpCode !== 200) {
        throw new Exception('Failed to fetch sessions from WasenderAPI: HTTP ' . $httpCode);
    }
    
    $apiData = json_decode($response, true);
    
    if (!$apiData || !$apiData['success']) {
        throw new Exception('Invalid response from WasenderAPI');
    }
    
    $sessions = $apiData['data'] ?? [];
    $synced = 0;
    $errors = [];
    
    // Sync each session to database
    foreach ($sessions as $session) {
        try {
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
                    $session['status'] ?? 'DISCONNECTED',
                    $session['id']
                ]);
                
                $synced++;
            } else {
                // Insert new session
                $insertStmt = $pdo->prepare("
                    INSERT INTO whatsapp_sessions (
                        wasender_session_id, name, phone_number, status,
                        account_protection, log_messages, webhook_url, webhook_enabled,
                        webhook_events, api_key, webhook_secret, session_data,
                        last_connected_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    ($session['status'] ?? 'DISCONNECTED') === 'connected' ? date('Y-m-d H:i:s') : null
                ]);
                
                $newSessionId = $pdo->lastInsertId();
                
                // Log the creation
                $logStmt = $pdo->prepare("
                    INSERT INTO whatsapp_session_logs (session_id, event_type, message, metadata)
                    VALUES (?, 'session_synced', 'Session imported from WasenderAPI', ?)
                ");
                $logStmt->execute([
                    $newSessionId,
                    json_encode(['wasender_id' => $session['id'], 'status' => $session['status']])
                ]);
                
                $synced++;
            }
        } catch (Exception $e) {
            $errors[] = "Session {$session['id']}: " . $e->getMessage();
        }
    }
    
    echo json_encode([
        'success' => true,
        'message' => "Synced {$synced} session(s) from WasenderAPI",
        'synced_count' => $synced,
        'total_sessions' => count($sessions),
        'errors' => $errors
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

