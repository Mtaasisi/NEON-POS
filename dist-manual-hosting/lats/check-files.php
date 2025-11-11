<?php
// Simple diagnostic script to check file structure
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
    <title>File Structure Diagnostic</title>
    <style>
        body { font-family: monospace; padding: 20px; background: #f5f5f5; }
        .success { color: green; }
        .error { color: red; }
        .info { color: blue; }
        pre { background: white; padding: 10px; border: 1px solid #ddd; }
    </style>
</head>
<body>
    <h1>🔍 File Structure Diagnostic</h1>
    
    <h2>Current Directory:</h2>
    <pre><?php echo __DIR__; ?></pre>
    
    <h2>Checking Critical Files:</h2>
    <?php
    $files = [
        'index.html',
        '.htaccess',
        'assets/index-222cfb29.js',
        'assets/vendor-a2ff445a.js',
        'assets/supabase-7e851d02.js',
        'assets/routing-a2f0f6d2.js',
        'assets/ui-551a39a6.js',
        'assets/index-d3868143.css'
    ];
    
    foreach ($files as $file) {
        $path = __DIR__ . '/' . $file;
        if (file_exists($path)) {
            $size = filesize($path);
            echo "<div class='success'>✓ $file exists (" . number_format($size) . " bytes)</div>";
        } else {
            echo "<div class='error'>✗ $file NOT FOUND</div>";
        }
    }
    ?>
    
    <h2>Assets Directory Contents:</h2>
    <pre><?php
    $assetsDir = __DIR__ . '/assets';
    if (is_dir($assetsDir)) {
        $files = scandir($assetsDir);
        echo "Total files: " . (count($files) - 2) . "\n\n";
        foreach (array_slice($files, 0, 20) as $file) {
            if ($file !== '.' && $file !== '..') {
                echo $file . "\n";
            }
        }
        if (count($files) > 20) {
            echo "\n... and " . (count($files) - 20) . " more files";
        }
    } else {
        echo "Assets directory NOT FOUND!";
    }
    ?></pre>
    
    <h2>Server Info:</h2>
    <pre><?php
    echo "PHP Version: " . PHP_VERSION . "\n";
    echo "Server Software: " . $_SERVER['SERVER_SOFTWARE'] . "\n";
    echo "Document Root: " . $_SERVER['DOCUMENT_ROOT'] . "\n";
    echo "Script Path: " . $_SERVER['SCRIPT_FILENAME'] . "\n";
    ?></pre>
    
    <h2>Apache Modules (if available):</h2>
    <pre><?php
    if (function_exists('apache_get_modules')) {
        $modules = apache_get_modules();
        $important = ['mod_rewrite', 'mod_headers', 'mod_deflate', 'mod_expires'];
        foreach ($important as $mod) {
            if (in_array($mod, $modules)) {
                echo "<span class='success'>✓ $mod enabled</span>\n";
            } else {
                echo "<span class='error'>✗ $mod not found</span>\n";
            }
        }
    } else {
        echo "apache_get_modules() not available (might be Nginx or other server)\n";
    }
    ?></pre>
    
    <h2>Direct Asset Test:</h2>
    <p>Try accessing these URLs directly:</p>
    <?php
    $baseUrl = 'https://dukani.site/lats';
    $testFiles = [
        'assets/index-222cfb29.js',
        'assets/vendor-a2ff445a.js',
        'assets/index-d3868143.css'
    ];
    foreach ($testFiles as $file) {
        echo "<a href='$baseUrl/$file' target='_blank'>$baseUrl/$file</a><br>";
    }
    ?>
</body>
</html>

