<?php
/**
 * Check WhatsApp Integration Configuration
 * Shows which session credentials are currently being used
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
    $result = [
        'success' => true,
        'integration' => null,
        'database_sessions' => [],
        'recommendation' => ''
    ];
    
    // Check integrations table for WhatsApp configuration
    $integrationStmt = $pdo->prepare("
        SELECT 
            integration_name,
            is_enabled,
            credentials,
            config,
            last_used_at
        FROM lats_pos_integrations_settings
        WHERE integration_name = 'WHATSAPP_WASENDER'
    ");
    $integrationStmt->execute();
    $integration = $integrationStmt->fetch(PDO::FETCH_ASSOC);
    
    if ($integration) {
        $credentials = json_decode($integration['credentials'], true);
        $result['integration'] = [
            'enabled' => (bool)$integration['is_enabled'],
            'has_api_key' => !empty($credentials['api_key']) || !empty($credentials['bearer_token']),
            'has_session_id' => !empty($credentials['session_id']) || !empty($credentials['whatsapp_session']),
            'session_id' => $credentials['session_id'] ?? $credentials['whatsapp_session'] ?? null,
            'api_key_preview' => !empty($credentials['api_key']) ? substr($credentials['api_key'], 0, 10) . '...' : 
                                (!empty($credentials['bearer_token']) ? substr($credentials['bearer_token'], 0, 10) . '...' : null),
            'last_used_at' => $integration['last_used_at']
        ];
    }
    
    // Check database sessions table
    $sessionsStmt = $pdo->prepare("
        SELECT 
            id,
            wasender_session_id,
            name,
            phone_number,
            status,
            last_connected_at,
            created_at
        FROM whatsapp_sessions
        ORDER BY last_connected_at DESC, created_at DESC
    ");
    $sessionsStmt->execute();
    $sessions = $sessionsStmt->fetchAll(PDO::FETCH_ASSOC);
    
    $result['database_sessions'] = $sessions;
    $result['database_sessions_count'] = count($sessions);
    $result['connected_sessions_count'] = count(array_filter($sessions, fn($s) => $s['status'] === 'connected'));
    
    // Provide recommendation
    if ($integration && $result['integration']['has_session_id'] && count($sessions) === 0) {
        $result['recommendation'] = 'You have credentials in Integrations but no sessions in database. Your messages are being sent using the old integration credentials. Create a session in Session Manager to use the new system.';
        $result['status'] = 'using_integration_credentials';
    } elseif (count($sessions) > 0 && $result['connected_sessions_count'] > 0) {
        $result['recommendation'] = 'You have connected sessions in database. The system should use these for sending messages.';
        $result['status'] = 'ready_for_database_sessions';
    } elseif (count($sessions) > 0 && $result['connected_sessions_count'] === 0) {
        $result['recommendation'] = 'You have sessions in database but none are connected. Connect a session to start using the new system.';
        $result['status'] = 'sessions_not_connected';
    } else {
        $result['recommendation'] = 'No sessions configured. Create and connect a session in Session Manager.';
        $result['status'] = 'no_sessions';
    }
    
    echo json_encode($result, JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

