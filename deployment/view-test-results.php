<?php
/**
 * View Test Webhook Results
 */
$logFile = 'webhook-test-log.txt';
?>
<!DOCTYPE html>
<html>
<head>
    <title>Webhook Test Results</title>
    <meta http-equiv="refresh" content="5">
    <style>
        body { 
            font-family: monospace; 
            background: #1e1e1e; 
            color: #d4d4d4; 
            padding: 20px; 
        }
        h1 { color: #4ec9b0; }
        pre { 
            background: #252526; 
            padding: 15px; 
            border-radius: 5px; 
            overflow-x: auto;
            white-space: pre-wrap;
        }
        .info { 
            background: #264f78; 
            padding: 10px; 
            border-radius: 5px; 
            margin: 10px 0;
        }
        .success { color: #4ec9b0; }
        .error { color: #f48771; }
    </style>
</head>
<body>
    <h1>🧪 Webhook Test Results</h1>
    
    <div class="info">
        <strong>Auto-refreshing every 5 seconds...</strong><br>
        Current time: <?php echo date('Y-m-d H:i:s'); ?>
    </div>
    
    <?php if (file_exists($logFile)): ?>
        <h2 class="success">✅ Log File Found</h2>
        <p>File: <?php echo $logFile; ?></p>
        <p>Size: <?php echo number_format(filesize($logFile)); ?> bytes</p>
        <p>Last modified: <?php echo date('Y-m-d H:i:s', filemtime($logFile)); ?></p>
        
        <h3>Recent Requests:</h3>
        <pre><?php 
            $content = file_get_contents($logFile);
            // Show last 5000 characters
            echo htmlspecialchars(substr($content, -5000));
        ?></pre>
        
        <button onclick="if(confirm('Clear log?')) location.href='?clear=1'" style="padding: 10px; margin-top: 10px;">
            🗑️ Clear Log
        </button>
        
        <?php
        if (isset($_GET['clear'])) {
            file_put_contents($logFile, '');
            echo '<div class="info">✅ Log cleared! <a href="?">Refresh</a></div>';
        }
        ?>
        
    <?php else: ?>
        <h2 class="error">⚠️ No Log File Yet</h2>
        <p>The webhook hasn't received any requests yet.</p>
        <p>Waiting for: <?php echo $logFile; ?></p>
    <?php endif; ?>
    
</body>
</html>

