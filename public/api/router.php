<?php
// Router for PHP built-in server
// This file handles all requests and routes them appropriately

// Get the request URI
$requestUri = $_SERVER['REQUEST_URI'];

// Remove the /api prefix if it exists
$requestUri = preg_replace('/^\/api/', '', $requestUri);

// Handle specific endpoints directly
if (strpos($requestUri, '/upload-image') !== false || $requestUri === '/upload-image' || $requestUri === '/upload-image.php') {
    // Serve upload-image.php directly
    if (file_exists(__DIR__ . '/upload-image.php')) {
        include __DIR__ . '/upload-image.php';
        exit();
    }
}

// If the request is for green-api-proxy.php, serve it directly
if (strpos($requestUri, '/green-api-proxy.php') !== false) {
    include __DIR__ . '/green-api-proxy.php';
    exit();
}

// For all other requests, route to green-api-proxy.php
$_SERVER['REQUEST_URI'] = '/green-api-proxy.php' . $requestUri;
include __DIR__ . '/green-api-proxy.php';
?>
