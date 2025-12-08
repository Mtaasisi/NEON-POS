<?php
/**
 * Configuration file for WhatsApp Hub
 * This file loads credentials from environment variables (more secure)
 * 
 * SECURITY NOTE: Sensitive credentials should be set via:
 * 1. Server environment variables (recommended for production)
 * 2. .env file loaded by your application
 * 
 * This file provides fallback defaults for development only.
 */

// Load .env file if it exists (for development)
$envFile = __DIR__ . '/../../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        // Skip comments
        if (strpos(trim($line), '#') === 0) continue;
        
        // Parse KEY=VALUE
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            
            // Only set if not already set in server environment
            if (!getenv($key) && $key && $value) {
                putenv("$key=$value");
            }
        }
    }
}

// WhatsApp credentials - Use environment variables with fallbacks
$greenApiInstanceId = getenv('VITE_GREENAPI_INSTANCE_ID') ?: '7105284900';
$greenApiToken = getenv('VITE_GREENAPI_API_TOKEN') ?: '';
$greenApiUrl = getenv('VITE_GREENAPI_API_URL') ?: 'https://7105.api.greenapi.com';

// Set environment variables for use by other scripts
putenv("GREENAPI_INSTANCE_ID=$greenApiInstanceId");
if ($greenApiToken) putenv("GREENAPI_API_TOKEN=$greenApiToken");
putenv("GREENAPI_API_URL=$greenApiUrl");

// Application environment settings
$appEnv = getenv('APP_ENV') ?: 'development';
$debugMode = getenv('DEBUG_MODE') ?: 'false';
$debugLogging = getenv('DEBUG_LOGGING') ?: 'false';
$debugWebhook = getenv('DEBUG_WEBHOOK') ?: 'false';

putenv("APP_ENV=$appEnv");
putenv("DEBUG_MODE=$debugMode");
putenv("DEBUG_LOGGING=$debugLogging");
putenv("DEBUG_WEBHOOK=$debugWebhook");

// Log configuration status (without exposing sensitive data)
$configStatus = [
    'greenapi_instance' => $greenApiInstanceId ? 'configured' : 'missing',
    'greenapi_token' => $greenApiToken ? 'configured' : 'missing',
];

error_log("WhatsApp config loaded: " . json_encode($configStatus));

// Warn about missing critical credentials
if (!$greenApiToken) {
    error_log("WARNING: GREENAPI_API_TOKEN is not configured. WhatsApp features will not work.");
}
?>