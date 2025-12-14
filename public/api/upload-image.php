<?php
/**
 * Image Upload Handler for Production (PHP)
 * Handles image uploads for product images and media library
 * 
 * URL: https://dukani.site/api/upload-image.php
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle OPTIONS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

try {
    // Check if file was uploaded
    if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'No image file uploaded']);
        exit;
    }
    
    $file = $_FILES['image'];
    
    // Validate file type
    $allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    $fileType = mime_content_type($file['tmp_name']);
    
    if (!in_array($fileType, $allowedTypes)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid file type. Only images are allowed.']);
        exit;
    }
    
    // Validate file size (max 5MB)
    $maxSize = 5 * 1024 * 1024; // 5MB
    if ($file['size'] > $maxSize) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'File too large. Maximum size: 5MB']);
        exit;
    }
    
    // Check if this is a product image
    $isProductImage = isset($_POST['type']) && $_POST['type'] === 'product';
    $subfolder = $isProductImage ? 'products' : '';
    
    // Generate safe filename
    $timestamp = time();
    $randomId = bin2hex(random_bytes(4));
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $safeFileName = preg_replace('/[^a-zA-Z0-9._-]/', '_', pathinfo($file['name'], PATHINFO_FILENAME));
    
    // Use provided filename or generate one
    $filename = isset($_POST['filename']) ? $_POST['filename'] : "{$timestamp}-{$randomId}-{$safeFileName}.{$extension}";
    
    // Ensure filename is safe
    $filename = preg_replace('/[^a-zA-Z0-9._-]/', '_', $filename);
    
    // Create directory if it doesn't exist
    $imagesDir = __DIR__ . '/../../../public/images' . ($subfolder ? '/' . $subfolder : '');
    if (!is_dir($imagesDir)) {
        mkdir($imagesDir, 0755, true);
    }
    
    // Full path to save file
    $filePath = $imagesDir . '/' . $filename;
    
    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $filePath)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to save file']);
        exit;
    }
    
    // Construct public URL
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'dukani.site';
    $relativePath = $subfolder ? "images/{$subfolder}/{$filename}" : "images/{$filename}";
    $publicUrl = "/{$relativePath}";
    
    // Return success response
    echo json_encode([
        'success' => true,
        'filename' => $filename,
        'path' => $relativePath,
        'url' => $publicUrl
    ]);
    
} catch (Exception $e) {
    error_log("Image upload error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Upload failed',
        'message' => $e->getMessage()
    ]);
}
?>
