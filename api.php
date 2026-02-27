<?php
/**
 * api.php - CRUD Backend for Micro Invoice POS
 * Designed for Hostinger (MySQLi + Prepared Statements)
 */

header('Content-Type: application/json');

// 1. Database Configuration
$host = "localhost";
$username = "u123456789_pos_user"; // Replace with your Hostinger DB username
$password = "YourStrongPassword123!"; // Replace with your Hostinger DB password
$dbname = "u123456789_pos_db";     // Replace with your Hostinger DB name

// 2. Create connection
$conn = new mysqli($host, $username, $password, $dbname);

// 3. Check connection
if ($conn->connect_error) {
    die(json_encode(["error" => "Connection failed: " . $conn->connect_error]));
}

// 4. Handle Actions
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

// Helper to get JSON input
function getJsonInput() {
    return json_decode(file_get_contents('php://input'), true);
}

switch ($action) {
    case 'read':
        $result = $conn->query("SELECT * FROM invoices ORDER BY created_at DESC");
        $invoices = [];
        while ($row = $result->fetch_assoc()) {
            $invoices[] = $row;
        }
        echo json_encode($invoices);
        break;

    case 'create':
        $data = getJsonInput();
        $customer = $data['customer_name'] ?? '';
        $item = $data['item_name'] ?? '';
        $price = $data['price'] ?? 0;
        $quantity = $data['quantity'] ?? 0;
        $total = $price * $quantity;

        $stmt = $conn->prepare("INSERT INTO invoices (customer_name, item_name, price, quantity, total) VALUES (?, ?, ?, ?, ?)");
        $stmt->bind_param("ssdid", $customer, $item, $price, $quantity, $total);
        
        if ($stmt->execute()) {
            echo json_encode(["success" => true, "id" => $stmt->insert_id]);
        } else {
            echo json_encode(["error" => $stmt->error]);
        }
        $stmt->close();
        break;

    case 'update':
        $data = getJsonInput();
        $id = $data['id'] ?? 0;
        $customer = $data['customer_name'] ?? '';
        $item = $data['item_name'] ?? '';
        $price = $data['price'] ?? 0;
        $quantity = $data['quantity'] ?? 0;
        $total = $price * $quantity;

        $stmt = $conn->prepare("UPDATE invoices SET customer_name=?, item_name=?, price=?, quantity=?, total=? WHERE id=?");
        $stmt->bind_param("ssdidi", $customer, $item, $price, $quantity, $total, $id);
        
        if ($stmt->execute()) {
            echo json_encode(["success" => true]);
        } else {
            echo json_encode(["error" => $stmt->error]);
        }
        $stmt->close();
        break;

    case 'delete':
        $data = getJsonInput();
        $id = $data['id'] ?? 0;

        $stmt = $conn->prepare("DELETE FROM invoices WHERE id=?");
        $stmt->bind_param("i", $id);
        
        if ($stmt->execute()) {
            echo json_encode(["success" => true]);
        } else {
            echo json_encode(["error" => $stmt->error]);
        }
        $stmt->close();
        break;

    default:
        echo json_encode(["error" => "Invalid action"]);
        break;
}

$conn->close();
?>
