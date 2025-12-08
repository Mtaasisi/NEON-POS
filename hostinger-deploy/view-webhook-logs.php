<?php
/**
 * Webhook Debug Log Viewer
 * Shows recent error logs to help debug webhook issues
 */

header('Content-Type: text/html; charset=utf-8');

// Try to find error log file
$possibleLogFiles = [
    '/home/u123456789/domains/dukani.site/public_html/error_log',
    '/home/u123456789/error_log',
    '../error_log',
    './error_log',
    'error_log',
];

$logFile = null;
foreach ($possibleLogFiles as $path) {
    if (file_exists($path)) {
        $logFile = $path;
        break;
    }
}

?>
<!DOCTYPE html>
<html>
<head>
    <title>Webhook Debug Logs</title>
    <style>
        body { 
            font-family: 'Courier New', monospace; 
            background: #1e1e1e; 
            color: #d4d4d4; 
            padding: 20px; 
            margin: 0;
        }
        h1 { color: #4ec9b0; margin-bottom: 20px; }
        .log-container {
            background: #252526;
            border: 1px solid #3c3c3c;
            border-radius: 5px;
            padding: 15px;
            max-height: 80vh;
            overflow-y: auto;
        }
        .log-line {
            padding: 3px 0;
            border-bottom: 1px solid #333;
            font-size: 13px;
        }
        .log-line:hover { background: #2d2d30; }
        .success { color: #4ec9b0; }
        .error { color: #f48771; }
        .warning { color: #dcdcaa; }
        .info { color: #9cdcfe; }
        .timestamp { color: #858585; }
        .highlight { background: #264f78; }
        .controls {
            margin-bottom: 15px;
            padding: 10px;
            background: #252526;
            border-radius: 5px;
        }
        .controls button {
            background: #0e639c;
            color: white;
            border: none;
            padding: 8px 15px;
            margin-right: 10px;
            border-radius: 3px;
            cursor: pointer;
        }
        .controls button:hover { background: #1177bb; }
        .stats {
            background: #1e3a5f;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 15px;
        }
    </style>
</head>
<body>
    <h1>🐛 Webhook Debug Logs</h1>
    
    <div class="controls">
        <button onclick="location.reload()">🔄 Refresh</button>
        <button onclick="clearLogs()">🗑️ Clear Display</button>
        <button onclick="filterLogs('WEBHOOK')">🎯 Show Webhooks Only</button>
        <button onclick="filterLogs('')">👁️ Show All</button>
    </div>
    
    <?php if ($logFile && file_exists($logFile)): ?>
        <?php
        $lines = file($logFile, FILE_IGNORE_NEW_LINES);
        $lines = array_reverse(array_slice($lines, -200)); // Last 200 lines
        
        $webhookCount = 0;
        $errorCount = 0;
        $successCount = 0;
        
        foreach ($lines as $line) {
            if (strpos($line, 'WEBHOOK') !== false) $webhookCount++;
            if (strpos($line, '❌') !== false) $errorCount++;
            if (strpos($line, '✅') !== false) $successCount++;
        }
        ?>
        
        <div class="stats">
            <strong>📊 Stats (Last 200 lines):</strong><br>
            🎯 Webhook entries: <span class="info"><?php echo $webhookCount; ?></span> | 
            ✅ Success: <span class="success"><?php echo $successCount; ?></span> | 
            ❌ Errors: <span class="error"><?php echo $errorCount; ?></span>
        </div>
        
        <div class="log-container" id="logContainer">
            <?php foreach ($lines as $i => $line): ?>
                <?php
                $class = '';
                if (strpos($line, '✅') !== false) $class = 'success';
                elseif (strpos($line, '❌') !== false) $class = 'error';
                elseif (strpos($line, '⚠️') !== false) $class = 'warning';
                elseif (strpos($line, 'WEBHOOK') !== false) $class = 'highlight info';
                
                // Escape HTML
                $line = htmlspecialchars($line);
                ?>
                <div class="log-line <?php echo $class; ?>" data-line="<?php echo $i; ?>">
                    <?php echo $line; ?>
                </div>
            <?php endforeach; ?>
        </div>
        
        <div style="margin-top: 15px; color: #858585; font-size: 12px;">
            Log file: <?php echo $logFile; ?><br>
            Last updated: <?php echo date('Y-m-d H:i:s', filemtime($logFile)); ?><br>
            Total lines shown: <?php echo count($lines); ?>
        </div>
        
    <?php else: ?>
        <div style="background: #5a1e1e; padding: 15px; border-radius: 5px;">
            ⚠️ Could not find error log file.<br>
            <br>
            Tried these locations:<br>
            <?php foreach ($possibleLogFiles as $path): ?>
                - <?php echo htmlspecialchars($path); ?><br>
            <?php endforeach; ?>
            <br>
            Ask your hosting provider for the error log location.
        </div>
    <?php endif; ?>
    
    <script>
        function clearLogs() {
            document.getElementById('logContainer').innerHTML = '<div class="info">Logs cleared (refresh to reload)</div>';
        }
        
        function filterLogs(keyword) {
            const lines = document.querySelectorAll('.log-line');
            lines.forEach(line => {
                if (keyword === '' || line.textContent.includes(keyword)) {
                    line.style.display = 'block';
                } else {
                    line.style.display = 'none';
                }
            });
        }
        
        // Auto-scroll to bottom
        const container = document.getElementById('logContainer');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    </script>
</body>
</html>

