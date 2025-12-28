<?php
/**
 * Secure Configuration file for WhatsApp Hub
 * This file uses environment variables for sensitive data
 * 
 * PRODUCTION SECURITY BEST PRACTICES:
 * - Set credentials via server environment variables (NOT in .env files)
 * - Use secrets management (AWS Secrets Manager, Azure Key Vault, etc.)
 * - Never commit credentials to version control
 * - Rotate credentials regularly
 */

// Load .env file if it exists (for development/staging only)
$envFile = __DIR__ . '/../../.env';
if (file_exists($envFile) && getenv('APP_ENV') !== 'production') {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            if (!getenv($key) && $key && $value) {
                putenv("$key=$value");
            }
        }
    }
}

// Get credentials from environment variables (REQUIRED for production)
$greenApiInstanceId = getenv('VITE_GREENAPI_INSTANCE_ID') ?: getenv('GREENAPI_INSTANCE_ID') ?: '';
$greenApiToken = getenv('VITE_GREENAPI_API_TOKEN') ?: getenv('GREENAPI_API_TOKEN') ?: '';
$greenApiUrl = getenv('VITE_GREENAPI_API_URL') ?: getenv('GREENAPI_API_URL') ?: 'https://7105.api.greenapi.com';

// Validate required credentials
$requiredVars = [
    'GREENAPI_INSTANCE_ID' => $greenApiInstanceId,
    'GREENAPI_API_TOKEN' => $greenApiToken,
];

$missingVars = [];
foreach ($requiredVars as $varName => $varValue) {
    if (empty($varValue)) {
        $missingVars[] = $varName;
    }
}

if (!empty($missingVars)) {
    error_log("ERROR: Missing required environment variables: " . implode(', ', $missingVars));
    if (getenv('APP_ENV') === 'production') {
        http_response_code(500);
        die(json_encode([
            'error' => 'Configuration error',
            'message' => 'Required environment variables are not configured'
        ]));
    }
}

// Set WhatsApp credentials for child processes
if ($greenApiInstanceId) putenv("GREENAPI_INSTANCE_ID={$greenApiInstanceId}");
if ($greenApiToken) putenv("GREENAPI_API_TOKEN={$greenApiToken}");
if ($greenApiUrl) putenv("GREENAPI_API_URL={$greenApiUrl}");

// Application environment settings
$appEnv = getenv('APP_ENV') ?: 'development';
$debugMode = getenv('DEBUG_MODE') ?: ($appEnv === 'production' ? 'false' : 'true');
$debugLogging = getenv('DEBUG_LOGGING') ?: ($appEnv === 'production' ? 'false' : 'true');
$debugWebhook = getenv('DEBUG_WEBHOOK') ?: 'false';

putenv("APP_ENV={$appEnv}");
putenv("DEBUG_MODE={$debugMode}");
putenv("DEBUG_LOGGING={$debugLogging}");
putenv("DEBUG_WEBHOOK={$debugWebhook}");

// Log configuration status (without exposing sensitive data)
$configStatus = [
    'environment' => $appEnv,
    'database' => 'Neon PostgreSQL',
    'greenapi_instance' => $greenApiInstanceId ? '✓ configured' : '✗ missing',
    'greenapi_token' => $greenApiToken ? '✓ configured' : '✗ missing',
    'greenapi_url' => $greenApiUrl ? '✓ configured' : '✗ missing',
    'debug_mode' => $debugMode,
];

error_log("WhatsApp config loaded securely: " . json_encode($configStatus));
?>
