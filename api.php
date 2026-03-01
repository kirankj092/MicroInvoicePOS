<?php
ob_start();
error_reporting(E_ALL);
ini_set('display_errors', 1);
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header('Content-Type: application/json');

// Handle pre-flight OPTIONS request (prevents Network Errors in browsers)
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 2. Load Authentication Middleware
// This protects all API actions below
require_once('auth_check.php');

// 3. Load Database Credentials from the local Hostinger file
// This file is NOT on GitHub, keeping your password safe!
if (!file_exists('db_config.php')) {
    die(json_encode(["error" => "Configuration file (db_config.php) missing on server."]));
}
require_once('db_config.php');

// 3. Establish Connection
// Support multiple variable naming conventions (Hostinger vs Standard)
$db_host = $host ?? $servername ?? 'localhost';
$db_user = $username ?? $db_user ?? $user ?? '';
$db_pass = $password ?? $db_pass ?? $pass ?? '';
$db_name = $dbname ?? $db_name ?? '';

// Suppress warnings to keep JSON valid
$conn = @new mysqli($db_host, $db_user, $db_pass, $db_name);

// Check connection
if ($conn->connect_error) {
    ob_clean();
    die(json_encode([
        "error" => "Database connection failed",
        "details" => $conn->connect_error,
        "hint" => "Check your db_config.php variable names. Ensure you use \$host, \$username, \$password, and \$dbname."
    ]));
}

// Helper function to read JSON body from JavaScript fetch
function getJsonInput() {
    return json_decode(file_get_contents('php://input'), true);
}

// 4. Handle Actions
try {
    $action = $_GET['action'] ?? '';

    switch ($action) {
    case 'read':
        $user_id = $_SESSION['user_id'];
        $stmt = $conn->prepare("SELECT * FROM invoices WHERE user_id = ? ORDER BY created_at DESC");
        if (!$stmt) {
            echo json_encode(["error" => "SQL Error: " . $conn->error]);
            break;
        }
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $invoices = [];
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                // Fetch items for this invoice
                $invoice_id = $row['id'];
                $item_stmt = $conn->prepare("SELECT * FROM invoice_items WHERE invoice_id = ?");
                $item_stmt->bind_param("i", $invoice_id);
                $item_stmt->execute();
                $item_result = $item_stmt->get_result();
                $items = [];
                while ($item_row = $item_result->fetch_assoc()) {
                    $items[] = $item_row;
                }
                $row['items'] = $items;
                $invoices[] = $row;
                $item_stmt->close();
            }
        }
        echo json_encode($invoices);
        $stmt->close();
        break;

    case 'create':
        $data = getJsonInput();
        if (!$data) { echo json_encode(["error" => "No data provided"]); break; }
        
        $user_id = $_SESSION['user_id'];
        $customer = $data['customer_name'] ?? '';
        $items = $data['items'] ?? [];
        $total = $data['total'] ?? 0;

        // Start transaction
        $conn->begin_transaction();

        try {
            $stmt = $conn->prepare("INSERT INTO invoices (user_id, customer_name, total) VALUES (?, ?, ?)");
            $stmt->bind_param("isd", $user_id, $customer, $total);
            $stmt->execute();
            $invoice_id = $stmt->insert_id;
            $stmt->close();

            $item_stmt = $conn->prepare("INSERT INTO invoice_items (invoice_id, item_name, price, quantity, subtotal) VALUES (?, ?, ?, ?, ?)");
            foreach ($items as $item) {
                $item_name = $item['item_name'];
                $price = $item['price'];
                $quantity = $item['quantity'];
                $subtotal = $item['subtotal'];
                $item_stmt->bind_param("isdid", $invoice_id, $item_name, $price, $quantity, $subtotal);
                $item_stmt->execute();
            }
            $item_stmt->close();

            $conn->commit();
            echo json_encode(["success" => true, "id" => $invoice_id]);
        } catch (Exception $e) {
            $conn->rollback();
            echo json_encode(["error" => "Transaction failed: " . $e->getMessage()]);
        }
        break;

    case 'update':
        $data = getJsonInput();
        if (!$data) { echo json_encode(["error" => "No data provided"]); break; }

        $user_id = $_SESSION['user_id'];
        $id = $data['id'] ?? 0;
        $customer = $data['customer_name'] ?? '';
        $items = $data['items'] ?? [];
        $total = $data['total'] ?? 0;

        $conn->begin_transaction();

        try {
            $stmt = $conn->prepare("UPDATE invoices SET customer_name=?, total=? WHERE id=? AND user_id=?");
            $stmt->bind_param("sdii", $customer, $total, $id, $user_id);
            $stmt->execute();
            $stmt->close();

            // Delete old items
            $del_stmt = $conn->prepare("DELETE FROM invoice_items WHERE invoice_id = ?");
            $del_stmt->bind_param("i", $id);
            $del_stmt->execute();
            $del_stmt->close();

            // Insert new items
            $item_stmt = $conn->prepare("INSERT INTO invoice_items (invoice_id, item_name, price, quantity, subtotal) VALUES (?, ?, ?, ?, ?)");
            foreach ($items as $item) {
                $item_name = $item['item_name'];
                $price = $item['price'];
                $quantity = $item['quantity'];
                $subtotal = $item['subtotal'];
                $item_stmt->bind_param("isdid", $id, $item_name, $price, $quantity, $subtotal);
                $item_stmt->execute();
            }
            $item_stmt->close();

            $conn->commit();
            echo json_encode(["success" => true]);
        } catch (Exception $e) {
            $conn->rollback();
            echo json_encode(["error" => "Transaction failed: " . $e->getMessage()]);
        }
        break;

    case 'delete':
        $data = getJsonInput();
        $user_id = $_SESSION['user_id'];
        $id = $data['id'] ?? 0;

        $stmt = $conn->prepare("DELETE FROM invoices WHERE id=? AND user_id=?");
        if (!$stmt) {
            echo json_encode(["error" => "SQL Error: " . $conn->error]);
            break;
        }
        $stmt->bind_param("ii", $id, $user_id);
        
        if ($stmt->execute()) {
            echo json_encode(["success" => true]);
        } else {
            echo json_encode(["error" => $stmt->error]);
        }
        $stmt->close();
        break;

    default:
        echo json_encode(["error" => "Invalid action requested"]);
        break;
}
} catch (Exception $e) {
    ob_clean();
    echo json_encode([
        "error" => "Server Exception",
        "details" => $e->getMessage()
    ]);
}

$conn->close();
?>
