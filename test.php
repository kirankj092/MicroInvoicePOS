<?php
header('Content-Type: application/json');

// Try to initialize DB
try {
    require_once 'db_config.php';
    $init_success = true;
} catch (Throwable $e) {
    $init_success = false;
    $init_error = $e->getMessage();
}

$db_file = __DIR__ . '/invoices.db';
$db_exists = file_exists($db_file);
$db_writable = $db_exists ? is_writable($db_file) : 'N/A';

$test_file = __DIR__ . '/test_write_' . time() . '.txt';
$write_result = file_put_contents($test_file, 'test');
$exists = file_exists($test_file);
if ($exists) unlink($test_file);

echo json_encode([
    'pdo_sqlite' => extension_loaded('pdo_sqlite'),
    'pdo' => extension_loaded('pdo'),
    'sqlite3' => extension_loaded('sqlite3'),
    'dir_writable' => is_writable(__DIR__),
    'db_exists' => $db_exists,
    'db_writable' => $db_writable,
    'init_success' => $init_success ?? null,
    'init_error' => $init_error ?? null,
    'file_created' => ($write_result !== false),
    'php_version' => PHP_VERSION,
    'user' => posix_getpwuid(posix_geteuid())['name'] ?? 'unknown',
    'dir' => __DIR__
]);
?>
