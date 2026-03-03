<?php
ob_start();
error_reporting(0);
ini_set('display_errors', 0);
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
// 1. CORS Headers
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header("Access-Control-Allow-Credentials: true");
}
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

// Handle pre-flight OPTIONS request (prevents Network Errors in browsers)
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD']))
        header("Access-Control-Allow-Methods: GET, POST, OPTIONS");         
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']))
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
    if (isset($_SERVER['HTTP_ORIGIN'])) {
        header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
        header("Access-Control-Allow-Credentials: true");
    }
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

// Ensure tables exist (Automatic Migration for Hostinger)
$conn->query("CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    shop_name VARCHAR(255) DEFAULT 'Micro Invoice POS',
    address TEXT,
    phone VARCHAR(20),
    gstin VARCHAR(50),
    shop_logo LONGTEXT,
    signature LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$conn->query("CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$conn->query("CREATE TABLE IF NOT EXISTS invoice_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0,
    gst_rate INT DEFAULT 0,
    subtotal DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$conn->query("CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    address TEXT,
    dob DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$conn->query("CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    code VARCHAR(10) NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

// Helper function to read JSON body from JavaScript fetch
function getJsonInput() {
    return json_decode(file_get_contents('php://input'), true);
}

// Helper for clean JSON output
function sendJsonResponse($data) {
    if (ob_get_length()) ob_clean();
    echo json_encode($data);
    exit;
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

    case 'customers_read':
        $user_id = $_SESSION['user_id'];
        $stmt = $conn->prepare("SELECT * FROM customers WHERE user_id = ? ORDER BY name ASC");
        $stmt->bind_param("i", $user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $customers = [];
        while ($row = $result->fetch_assoc()) {
            $customers[] = $row;
        }
        echo json_encode($customers);
        $stmt->close();
        break;

    case 'customer_create':
        $data = getJsonInput();
        $user_id = $_SESSION['user_id'];
        $name = $data['name'] ?? '';
        $phone = $data['phone'] ?? '';
        $email = $data['email'] ?? '';
        $address = $data['address'] ?? '';
        $dob = $data['dob'] ?? null;

        $stmt = $conn->prepare("INSERT INTO customers (user_id, name, phone, email, address, dob) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("isssss", $user_id, $name, $phone, $email, $address, $dob);
        if ($stmt->execute()) {
            echo json_encode(["success" => true, "id" => $stmt->insert_id]);
        } else {
            echo json_encode(["error" => $stmt->error]);
        }
        $stmt->close();
        break;

    case 'customer_update':
        $data = getJsonInput();
        $user_id = $_SESSION['user_id'];
        $id = $data['id'] ?? 0;
        $name = $data['name'] ?? '';
        $phone = $data['phone'] ?? '';
        $email = $data['email'] ?? '';
        $address = $data['address'] ?? '';
        $dob = $data['dob'] ?? null;

        $stmt = $conn->prepare("UPDATE customers SET name=?, phone=?, email=?, address=?, dob=? WHERE id=? AND user_id=?");
        $stmt->bind_param("sssssii", $name, $phone, $email, $address, $dob, $id, $user_id);
        if ($stmt->execute()) {
            echo json_encode(["success" => true]);
        } else {
            echo json_encode(["error" => $stmt->error]);
        }
        $stmt->close();
        break;

    case 'customer_delete':
        $data = getJsonInput();
        $user_id = $_SESSION['user_id'];
        $id = $data['id'] ?? 0;

        $stmt = $conn->prepare("DELETE FROM customers WHERE id=? AND user_id=?");
        $stmt->bind_param("ii", $id, $user_id);
        if ($stmt->execute()) {
            echo json_encode(["success" => true]);
        } else {
            echo json_encode(["error" => $stmt->error]);
        }
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

            $item_stmt = $conn->prepare("INSERT INTO invoice_items (invoice_id, item_name, price, quantity, discount, gst_rate, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)");
            foreach ($items as $item) {
                $item_name = $item['item_name'];
                $price = $item['price'];
                $quantity = $item['quantity'];
                $discount = $item['discount'] ?? 0;
                $gst_rate = $item['gst_rate'] ?? 0;
                $subtotal = $item['subtotal'];
                $item_stmt->bind_param("isdidid", $invoice_id, $item_name, $price, $quantity, $discount, $gst_rate, $subtotal);
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
            // Verify ownership before updating
            $check_stmt = $conn->prepare("SELECT id FROM invoices WHERE id=? AND user_id=?");
            $check_stmt->bind_param("ii", $id, $user_id);
            $check_stmt->execute();
            if ($check_stmt->get_result()->num_rows === 0) {
                throw new Exception("Unauthorized or invoice not found.");
            }
            $check_stmt->close();

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
            $item_stmt = $conn->prepare("INSERT INTO invoice_items (invoice_id, item_name, price, quantity, discount, gst_rate, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)");
            foreach ($items as $item) {
                $item_name = $item['item_name'];
                $price = $item['price'];
                $quantity = $item['quantity'];
                $discount = $item['discount'] ?? 0;
                $gst_rate = $item['gst_rate'] ?? 0;
                $subtotal = $item['subtotal'];
                $item_stmt->bind_param("isdidid", $id, $item_name, $price, $quantity, $discount, $gst_rate, $subtotal);
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
