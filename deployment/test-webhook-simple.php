<?php
/**
 * SUPER SIMPLE Webhook Test
 * This always returns 200 OK and logs everything
 */

// Create a log file we can read
$logFile = 'webhook-test-log.txt';

// Get all request info
$requestData = [
    'timestamp' => date('Y-m-d H:i:s'),
    'method' => $_SERVER['REQUEST_METHOD'],
    'headers' => getallheaders(),
    'raw_input' => file_get_contents('php://input'),
    'get' => $_GET,
    'post' => $_POST,
    'server' => [
        'HTTP_HOST' => $_SERVER['HTTP_HOST'] ?? '',
        'REQUEST_URI' => $_SERVER['REQUEST_URI'] ?? '',
        'REMOTE_ADDR' => $_SERVER['REMOTE_ADDR'] ?? '',
        'HTTP_USER_AGENT' => $_SERVER['HTTP_USER_AGENT'] ?? '',
    ]
];

// Log to file
file_put_contents(
    $logFile, 
    "=== REQUEST " . date('Y-m-d H:i:s') . " ===\n" . 
    print_r($requestData, true) . 
    "\n\n", 
    FILE_APPEND
);

// ALWAYS return 200 OK
http_response_code(200);
header('Content-Type: application/json');

// Return success
echo json_encode([
    'status' => 'success',
    'message' => 'Request logged successfully',
    'timestamp' => date('c'),
    'logged_to' => $logFile,
    'request_method' => $_SERVER['REQUEST_METHOD'],
    'content_length' => strlen(file_get_contents('php://input'))
]);

