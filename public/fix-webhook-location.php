<?php
/**
 * Automatic Webhook Location Fixer
 * Upload this file to public_html/ and visit it in your browser
 * It will automatically move webhook.php to the correct location
 */

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>Webhook Location Fixer</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .success { color: green; background: #d4edda; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .error { color: red; background: #f8d7da; padding: 15px; border-radius: 5px; margin: 10px 0; }
        .info { color: blue; background: #d1ecf1; padding: 15px; border-radius: 5px; margin: 10px 0; }
        pre { background: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }
        h1 { color: #333; }
    </style>
</head>
<body>
    <h1>🔧 Webhook Location Fixer</h1>
    
<?php

$log = [];
$success = true;

try {
    $log[] = "🚀 Starting automatic fix...";
    
    // Step 1: Create api directory if doesn't exist
    if (!is_dir('api')) {
        if (mkdir('api', 0755, true)) {
            $log[] = "✅ Created 'api' directory";
        } else {
            throw new Exception("Failed to create 'api' directory");
        }
    } else {
        $log[] = "✅ 'api' directory already exists";
    }
    
    // Step 2: Create api/whatsapp directory if doesn't exist
    if (!is_dir('api/whatsapp')) {
        if (mkdir('api/whatsapp', 0755, true)) {
            $log[] = "✅ Created 'api/whatsapp' directory";
        } else {
            throw new Exception("Failed to create 'api/whatsapp' directory");
        }
    } else {
        $log[] = "✅ 'api/whatsapp' directory already exists";
    }
    
    // Step 3: Check if webhook.php exists in root
    if (file_exists('webhook.php')) {
        $log[] = "📄 Found webhook.php in root directory";
        
        // Step 4: Move webhook.php to correct location
        if (copy('webhook.php', 'api/whatsapp/webhook.php')) {
            $log[] = "✅ Copied webhook.php to api/whatsapp/";
            
            // Set proper permissions
            chmod('api/whatsapp/webhook.php', 0644);
            $log[] = "✅ Set file permissions (644)";
            
            // Delete old file from root
            if (unlink('webhook.php')) {
                $log[] = "✅ Removed old webhook.php from root";
            }
        } else {
            throw new Exception("Failed to copy webhook.php");
        }
    } elseif (file_exists('api/whatsapp/webhook.php')) {
        $log[] = "✅ webhook.php is already in the correct location!";
    } else {
        throw new Exception("webhook.php not found! Please upload it first.");
    }
    
    // Step 5: Verify the file
    if (file_exists('api/whatsapp/webhook.php')) {
        $size = filesize('api/whatsapp/webhook.php');
        $log[] = "✅ Verified: webhook.php exists at correct location";
        $log[] = "📊 File size: " . number_format($size / 1024, 2) . " KB";
        
        // Test if file is readable
        if (is_readable('api/whatsapp/webhook.php')) {
            $log[] = "✅ File is readable";
        }
    }
    
    $log[] = "";
    $log[] = "🎉 SUCCESS! Webhook is now in the correct location!";
    
} catch (Exception $e) {
    $success = false;
    $log[] = "❌ Error: " . $e->getMessage();
}

// Display results
foreach ($log as $message) {
    if (strpos($message, '✅') !== false || strpos($message, '🎉') !== false) {
        echo "<div class='success'>" . htmlspecialchars($message) . "</div>";
    } elseif (strpos($message, '❌') !== false) {
        echo "<div class='error'>" . htmlspecialchars($message) . "</div>";
    } else {
        echo "<div class='info'>" . htmlspecialchars($message) . "</div>";
    }
}

if ($success) {
    echo "<div class='success'>";
    echo "<h2>✅ All Done!</h2>";
    echo "<p><strong>Your webhook URL is now:</strong></p>";
    echo "<pre>https://dukani.site/api/whatsapp/webhook.php</pre>";
    echo "<p><strong>Test it now:</strong></p>";
    echo "<ol>";
    echo "<li>Go to: <a href='https://dukani.site/api/whatsapp/webhook.php' target='_blank'>https://dukani.site/api/whatsapp/webhook.php</a></li>";
    echo "<li>Should see: <code>{\"status\":\"healthy\"}</code></li>";
    echo "<li>Test in WasenderAPI dashboard</li>";
    echo "<li>Send a WhatsApp message!</li>";
    echo "</ol>";
    echo "<p><strong>⚠️ Important:</strong> You can now delete this file (fix-webhook-location.php)</p>";
    echo "</div>";
}

?>

<hr>
<p><small>Automatic Webhook Location Fixer v1.0 | Generated: <?php echo date('Y-m-d H:i:s'); ?></small></p>

</body>
</html>

