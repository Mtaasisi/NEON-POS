<?php
/**
 * Database Connection Configuration
 * PostgreSQL (Neon) PDO Connection
 */

// Load .env file if it exists
$envFile = __DIR__ . '/../../.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        // Skip comments
        if (strpos(trim($line), '#') === 0) continue;
        
        // Parse KEY=VALUE
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            
            // Remove quotes if present
            $value = trim($value, '"\'');
            
            // Only set if not already set in server environment
            if (!getenv($key) && $key && $value) {
                putenv("$key=$value");
            }
        }
    }
}

// Get DATABASE_URL from environment
$databaseUrl = getenv('DATABASE_URL');

// Fallback to production database if not set
if (!$databaseUrl) {
    // Use production database based on NODE_ENV
    $nodeEnv = getenv('NODE_ENV') ?: 'development';
    if ($nodeEnv === 'production') {
        $databaseUrl = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
    } else {
        $databaseUrl = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
    }
}

try {
    // Parse PostgreSQL connection string
    // Format: postgresql://user:password@host:port/database?params
    $urlParts = parse_url($databaseUrl);
    
    if (!$urlParts) {
        throw new Exception('Invalid database URL format');
    }
    
    $host = $urlParts['host'] ?? 'localhost';
    $port = $urlParts['port'] ?? 5432;
    $database = ltrim($urlParts['path'] ?? '', '/');
    $user = $urlParts['user'] ?? '';
    $password = $urlParts['pass'] ?? '';
    
    // Parse query parameters
    $sslMode = 'require';
    if (isset($urlParts['query'])) {
        parse_str($urlParts['query'], $queryParams);
        $sslMode = $queryParams['sslmode'] ?? 'require';
    }
    
    // Build PDO DSN
    $dsn = sprintf(
        'pgsql:host=%s;port=%d;dbname=%s;sslmode=%s',
        $host,
        $port,
        $database,
        $sslMode
    );
    
    // Create PDO connection
    $pdo = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::ATTR_STRINGIFY_FETCHES => false,
    ]);
    
    // Log successful connection (without sensitive data)
    $dbHost = $host;
    error_log("✅ Database connected: {$dbHost}/{$database}");
    
} catch (PDOException $e) {
    // Log error without exposing sensitive connection details
    error_log("❌ Database connection error: " . $e->getMessage());
    
    // Throw a user-friendly error
    throw new Exception('Error connecting to database: ' . $e->getMessage());
} catch (Exception $e) {
    error_log("❌ Database configuration error: " . $e->getMessage());
    throw new Exception('Error connecting to database: ' . $e->getMessage());
}
?>

