<?php
/**
 * View webhook debug logs
 */

header('Content-Type: text/plain');

$logFile = __DIR__ . '/webhook-debug.log';

if (file_exists($logFile)) {
    echo "📋 Webhook Debug Log\n";
    echo "==================\n\n";
    echo file_get_contents($logFile);
} else {
    echo "⚠️ No log file found yet\n";
    echo "Log file location: $logFile\n";
    echo "\nSend a test webhook to create the log file.";
}
?>

