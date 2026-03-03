<?php
// Enable error reporting for debugging (disable in production)
error_reporting(E_ALL);
ini_set('display_errors', 0); // Don't output errors to browser, handle them manually

// Start output buffering to prevent accidental output
ob_start();

// CORS Headers - CRITICAL for iframe/cross-origin
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
// Allow any origin for development/testing, or specific ones
if ($origin) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
} else {
    // Fallback for direct access or when origin is missing
    header("Access-Control-Allow-Origin: *");
}

header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Helper function to send JSON response
function sendJson($data, $statusCode = 200) {
    // Clear any previous output
    if (ob_get_length()) ob_clean();
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

// Helper to get JSON input
function getJsonInput() {
    $input = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        return [];
    }
    return $input;
}

// Include Auth Check (Middleware)
require_once 'auth_check.php';

// Include Database Configuration
require_once 'db_config.php';

// Check database connection again (redundant if db_config checks, but safe)
if ($conn->connect_error) {
    sendJson(["error" => "Database connection failed: " . $conn->connect_error], 500);
}

// Action Handler
$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'get_profile':
            $stmt = $conn->prepare("SELECT username, email, shop_name, address, phone, gstin, shop_logo, signature FROM users WHERE id = ?");
            $stmt->bind_param("i", $_SESSION['user_id']);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($user = $result->fetch_assoc()) {
                sendJson(["success" => true, "data" => $user]);
            } else {
                sendJson(["error" => "User not found"], 404);
            }
            $stmt->close();
            break;

        case 'update_profile':
            $data = getJsonInput();
            $shop_name = $data['shop_name'] ?? '';
            $address = $data['address'] ?? '';
            $phone = $data['phone'] ?? '';
            $gstin = $data['gstin'] ?? '';
            $shop_logo = $data['shop_logo'] ?? null;
            $signature = $data['signature'] ?? null;

            $sql = "UPDATE users SET shop_name=?, address=?, phone=?, gstin=?";
            $params = [$shop_name, $address, $phone, $gstin];
            $types = "ssss";

            if ($shop_logo !== null) {
                $sql .= ", shop_logo=?";
                $params[] = $shop_logo;
                $types .= "s";
            }
            if ($signature !== null) {
                $sql .= ", signature=?";
                $params[] = $signature;
                $types .= "s";
            }

            $sql .= " WHERE id=?";
            $params[] = $_SESSION['user_id'];
            $types .= "i";

            $stmt = $conn->prepare($sql);
            $stmt->bind_param($types, ...$params);

            if ($stmt->execute()) {
                sendJson(["success" => true, "message" => "Profile updated successfully"]);
            } else {
                sendJson(["error" => "Update failed: " . $conn->error], 500);
            }
            $stmt->close();
            break;
            
        // Add other API actions here (invoices, customers, etc.)
        // For now, focusing on auth and profile as requested.
        
        default:
            sendJson(["error" => "Invalid action"], 400);
    }
} catch (Exception $e) {
    sendJson(["error" => "Server Error: " . $e->getMessage()], 500);
}
?>
