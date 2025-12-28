<?php
/**
 * MySQL Schema Import Script
 * Upload this file to your web server and run it via browser
 */

// Database configuration
$host = 'srv679.hstgr.io';
$username = 'u440907902_inauzwa001';
$password = 'Tanzania10';
$database = 'u440907902_inauzwa01';

// SQL file path (update this to match where you uploaded SCHEMA_FIRST_IMPORT_THIS.sql)
$sqlFile = __DIR__ . '/SCHEMA_FIRST_IMPORT_THIS.sql'; // Assuming same directory as this script

try {
    // Connect to MySQL
    $pdo = new PDO("mysql:host=$host;dbname=$database", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "<h2>Connected to MySQL database successfully!</h2>";

    // Check if SQL file exists
    if (!file_exists($sqlFile)) {
        die("<p style='color: red;'>Error: SQL file not found at: $sqlFile</p>");
    }

    echo "<p>Found SQL file: $sqlFile</p>";

    // Read the SQL file
    $sql = file_get_contents($sqlFile);

    if (empty($sql)) {
        die("<p style='color: red;'>Error: SQL file is empty</p>");
    }

    echo "<p>SQL file size: " . strlen($sql) . " characters</p>";

    // Split SQL into individual statements
    $statements = array_filter(array_map('trim', explode(';', $sql)));

    $totalStatements = count($statements);
    $successCount = 0;
    $errorCount = 0;

    echo "<h3>Executing $totalStatements SQL statements...</h3>";
    echo "<div style='max-height: 400px; overflow-y: auto; background: #f5f5f5; padding: 10px; border: 1px solid #ccc;'>";

    foreach ($statements as $index => $statement) {
        if (empty($statement)) continue;

        try {
            $pdo->exec($statement);
            echo "<p style='color: green; margin: 2px 0;'>✓ Statement " . ($index + 1) . " executed successfully</p>";
            $successCount++;
        } catch (PDOException $e) {
            echo "<p style='color: red; margin: 2px 0;'>✗ Statement " . ($index + 1) . " failed: " . $e->getMessage() . "</p>";
            $errorCount++;
        }

        // Flush output to show progress
        if (ob_get_level()) ob_flush();
        flush();
    }

    echo "</div>";

    echo "<h3>Import Summary:</h3>";
    echo "<p>Total statements: $totalStatements</p>";
    echo "<p>Successful: <span style='color: green;'>$successCount</span></p>";
    echo "<p>Failed: <span style='color: red;'>$errorCount</span></p>";

    if ($errorCount === 0) {
        echo "<p style='color: green; font-weight: bold;'>🎉 Schema import completed successfully!</p>";
    } else {
        echo "<p style='color: orange;'>⚠️ Schema import completed with some errors. Please check the details above.</p>";
    }

} catch (PDOException $e) {
    echo "<h2 style='color: red;'>Database Connection Error:</h2>";
    echo "<p>" . $e->getMessage() . "</p>";
} catch (Exception $e) {
    echo "<h2 style='color: red;'>General Error:</h2>";
    echo "<p>" . $e->getMessage() . "</p>";
}
?>
