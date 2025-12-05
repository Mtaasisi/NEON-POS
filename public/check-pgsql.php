<?php
header('Content-Type: application/json');

$drivers = PDO::getAvailableDrivers();
$has_pgsql = in_array('pgsql', $drivers);

$result = [
    'php_version' => PHP_VERSION,
    'pdo_drivers' => $drivers,
    'has_pgsql' => $has_pgsql,
    'status' => $has_pgsql ? 'ready' : 'missing_driver',
    'message' => $has_pgsql 
        ? 'PostgreSQL driver is installed and ready!' 
        : 'PostgreSQL driver is NOT installed. Contact hosting provider.',
    'timestamp' => date('c')
];

echo json_encode($result, JSON_PRETTY_PRINT);
?>

