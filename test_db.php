<?php
/**
 * test_db.php - Database Connection Tester
 * Visit this file directly in your browser to see raw errors.
 */
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: text/plain');

echo "--- Database Connection Test ---\n";
echo "PHP Version: " . PHP_VERSION . "\n";

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
    echo "CONNECTION SUCCESSFUL!\n\n";
    
    echo "--- Table Check ---\n";
    $tables = ['users', 'invoices'];
    foreach ($tables as $table) {
        $result = $conn->query("SHOW TABLES LIKE '$table'");
        if ($result->num_rows > 0) {
            echo "✅ Table '$table' exists.\n";
            
            // Check for critical user_id column
            if ($table === 'invoices') {
                $columns = $conn->query("SHOW COLUMNS FROM invoices");
                $cols = [];
                $has_user_id = false;
                while($col = $columns->fetch_assoc()) {
                    $cols[] = $col['Field'];
                    if ($col['Field'] === 'user_id') $has_user_id = true;
                }
                echo "   Columns: " . implode(", ", $cols) . "\n";
                
                if (!$has_user_id) {
                    echo "   ❌ CRITICAL ERROR: 'user_id' column is MISSING!\n";
                    echo "   Run this SQL to fix it:\n";
                    echo "   ALTER TABLE invoices ADD COLUMN user_id INT NOT NULL AFTER id;\n";
                }
            }
        } else {
            echo "❌ Table '$table' MISSING!\n";
            echo "   Run the following SQL in your Hostinger phpMyAdmin:\n\n";
            if ($table === 'users') {
                echo "CREATE TABLE users (\n";
                echo "    id INT AUTO_INCREMENT PRIMARY KEY,\n";
                echo "    username VARCHAR(50) NOT NULL UNIQUE,\n";
                echo "    email VARCHAR(100) NOT NULL UNIQUE,\n";
                echo "    password VARCHAR(255) NOT NULL,\n";
                echo "    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n";
                echo ");\n\n";
            } else {
                echo "CREATE TABLE invoices (\n";
                echo "    id INT AUTO_INCREMENT PRIMARY KEY,\n";
                echo "    user_id INT NOT NULL,\n";
                echo "    customer_name VARCHAR(100),\n";
                echo "    item_name VARCHAR(100),\n";
                echo "    price DECIMAL(10,2),\n";
                echo "    quantity INT,\n";
                echo "    total DECIMAL(10,2),\n";
                echo "    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n";
                echo "    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE\n";
                echo ");\n\n";
            }
        }
    }
    $conn->close();
}

echo "\n--- Session Check ---\n";
$session_path = session_save_path();
echo "Session save path: " . ($session_path ?: "Default") . "\n";
if (is_writable($session_path ?: sys_get_temp_dir())) {
    echo "✅ Session path is writable.\n";
} else {
    echo "❌ Session path is NOT writable!\n";
}

session_start();
$_SESSION['test_val'] = 'hello';
if (isset($_SESSION['test_val']) && $_SESSION['test_val'] === 'hello') {
    echo "✅ Session read/write working.\n";
} else {
    echo "❌ Session read/write FAILED.\n";
}
?>
