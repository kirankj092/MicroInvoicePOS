<?php
/**
 * api.php - Secure CRUD Backend for Micro Invoice POS
 * Designed for Hostinger Auto-Deploy (GitHub Sync Ready)
 */

// 1. CORS Headers - Essential for Frontend-Backend Communication
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
$conn = new mysqli($host, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die(json_encode(["error" => "Database connection failed: " . $conn->connect_error]));
}

// 4. Handle Actions
$action = $_GET['action'] ?? '';

// Helper function to read JSON body from JavaScript fetch
function getJsonInput() {
    return json_decode(file_get_contents('php://input'), true);
}

switch ($action) {
    case 'read':
        $user_id = $_SESSION['user_id'];
        $stmt = $conn->prepare("SELECT * FROM invoices WHERE user_id = ? ORDER BY created_at DESC");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $invoices = [];
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $invoices[] = $row;
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
        $item = $data['item_name'] ?? '';
        $price = $data['price'] ?? 0;
        $quantity = $data['quantity'] ?? 0;
        $total = $price * $quantity;

        $stmt = $conn->prepare("INSERT INTO invoices (user_id, customer_name, item_name, price, quantity, total) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("issdid", $user_id, $customer, $item, $price, $quantity, $total);
        
        if ($stmt->execute()) {
            echo json_encode(["success" => true, "id" => $stmt->insert_id]);
        } else {
            echo json_encode(["error" => $stmt->error]);
        }
        $stmt->close();
        break;

    case 'update':
        $data = getJsonInput();
        if (!$data) { echo json_encode(["error" => "No data provided"]); break; }

        $user_id = $_SESSION['user_id'];
        $id = $data['id'] ?? 0;
        $customer = $data['customer_name'] ?? '';
        $item = $data['item_name'] ?? '';
        $price = $data['price'] ?? 0;
        $quantity = $data['quantity'] ?? 0;
        $total = $price * $quantity;

        $stmt = $conn->prepare("UPDATE invoices SET customer_name=?, item_name=?, price=?, quantity=?, total=? WHERE id=? AND user_id=?");
        $stmt->bind_param("ssdidii", $customer, $item, $price, $quantity, $total, $id, $user_id);
        
        if ($stmt->execute()) {
            echo json_encode(["success" => true]);
        } else {
            echo json_encode(["error" => $stmt->error]);
        }
        $stmt->close();
        break;

    case 'delete':
        $data = getJsonInput();
        $user_id = $_SESSION['user_id'];
        $id = $data['id'] ?? 0;

        $stmt = $conn->prepare("DELETE FROM invoices WHERE id=? AND user_id=?");
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

$conn->close();
?>
