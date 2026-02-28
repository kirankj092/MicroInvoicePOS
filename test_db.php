<?php
/**
 * test_db.php - Database Connection Tester
 * Visit this file directly in your browser to see raw errors.
 */
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: text/plain');

echo "--- Database Connection Test ---\n";

if (!file_exists('db_config.php')) {
    die("ERROR: db_config.php not found!\n");
}

echo "Loading db_config.php...\n";
require_once('db_config.php');

// Check what variables are defined
echo "Defined variables:\n";
$vars = ['host', 'servername', 'username', 'db_user', 'user', 'password', 'db_pass', 'pass', 'dbname', 'db_name'];
foreach ($vars as $v) {
    if (isset($$v)) {
        echo "- \$$v is set\n";
    }
}

$db_host = $host ?? $servername ?? 'localhost';
$db_user = $username ?? $db_user ?? $user ?? '';
$db_pass = $password ?? $db_pass ?? $pass ?? '';
$db_name = $dbname ?? $db_name ?? '';

echo "\nAttempting connection to $db_host with user $db_user and database $db_name...\n";

$conn = @new mysqli($db_host, $db_user, $db_pass, $db_name);

if ($conn->connect_error) {
    echo "CONNECTION FAILED!\n";
    echo "Error Number: " . $conn->connect_errno . "\n";
    echo "Error Message: " . $conn->connect_error . "\n";
} else {
    echo "CONNECTION SUCCESSFUL!\n";
    $conn->close();
}
?>
