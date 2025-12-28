<?php
/**
 * WhatsApp Media Upload Handler for Hostinger (PHP)
 * Handles file uploads for WhatsApp media
 * 
 * URL: https://dukani.site/api/whatsapp/upload-media.php
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle OPTIONS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    // Check if file was uploaded
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['error' => 'No file uploaded or upload error']);
        exit;
    }
    
    $file = $_FILES['file'];
    
    // Validate file size (max 50MB)
    $maxSize = 50 * 1024 * 1024; // 50MB
    if ($file['size'] > $maxSize) {
        http_response_code(400);
        echo json_encode(['error' => 'File too large. Maximum size: 50MB']);
        exit;
    }
    
    // Generate safe filename with path (Supabase requires path with directory)
    $timestamp = time();
    $randomId = bin2hex(random_bytes(4));
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $safeFileName = preg_replace('/[^a-zA-Z0-9._-]/', '_', pathinfo($file['name'], PATHINFO_FILENAME));
    
    // ✅ FIX: Supabase Storage requires a path with directory structure
    $filePath = "whatsapp-media/{$timestamp}-{$randomId}-{$safeFileName}.{$extension}";
    
    // Save file to public uploads directory as fallback
    $uploadsDir = __DIR__ . '/../../../public/uploads/whatsapp-media';
    if (!is_dir($uploadsDir)) {
        mkdir($uploadsDir, 0755, true);
    }
    
    $localPath = $uploadsDir . '/' . basename($filePath);
    
    // Move uploaded file to local directory
    if (!move_uploaded_file($file['tmp_name'], $localPath)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to save file']);
        exit;
    }
    
    // Construct public URL
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'dukani.site';
    $publicUrl = "{$protocol}://{$host}/uploads/whatsapp-media/" . basename($filePath);
    
    // Return success response
    echo json_encode([
        'success' => true,
        'url' => $publicUrl,
        'publicUrl' => $publicUrl,
        'method' => 'local',
        'fileName' => basename($filePath),
        'filePath' => $filePath,
        'fileSize' => $file['size'],
        'mimeType' => $file['type']
    ]);
    
} catch (Exception $e) {
    error_log("WhatsApp upload error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'error' => 'Upload failed',
        'message' => $e->getMessage()
    ]);
}
?>
