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

// Session Configuration
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_secure', 1); // Always secure for iframe
ini_set('session.gc_maxlifetime', 86400 * 30); // 30 days

session_set_cookie_params([
    'lifetime' => 86400 * 30,
    'path' => '/',
    'domain' => '', // Current domain
    'secure' => true, // Required for SameSite=None
    'httponly' => true,
    'samesite' => 'None' // Required for iframe
]);

session_start();

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
        case 'check':
            if (isset($_SESSION['user_id'])) {
                $stmt = $conn->prepare("SELECT id, username, email, shop_name, address, phone, gstin, shop_logo, signature FROM users WHERE id = ?");
                $stmt->bind_param("i", $_SESSION['user_id']);
                $stmt->execute();
                $result = $stmt->get_result();
                if ($user = $result->fetch_assoc()) {
                    sendJson(["authenticated" => true, "profile" => $user]);
                } else {
                    // Session exists but user not found (deleted?)
                    session_destroy();
                    sendJson(["authenticated" => false]);
                }
                $stmt->close();
            } else {
                sendJson(["authenticated" => false]);
            }
            break;

        case 'login':
            $data = getJsonInput();
            $username = $data['username'] ?? '';
            $password = $data['password'] ?? '';

            if (empty($username) || empty($password)) {
                sendJson(["error" => "Username and password are required."], 400);
            }

            $stmt = $conn->prepare("SELECT id, username, password FROM users WHERE username = ? OR email = ?");
            $stmt->bind_param("ss", $username, $username);
            $stmt->execute();
            $result = $stmt->get_result();

            if ($user = $result->fetch_assoc()) {
                if (password_verify($password, $user['password'])) {
                    $_SESSION['user_id'] = $user['id'];
                    $_SESSION['username'] = $user['username'];
                    sendJson(["success" => true, "message" => "Login successful"]);
                } else {
                    sendJson(["error" => "Invalid credentials"], 401);
                }
            } else {
                sendJson(["error" => "User not found"], 404);
            }
            $stmt->close();
            break;

        case 'register':
            $data = getJsonInput();
            $username = $data['username'] ?? '';
            $email = $data['email'] ?? '';
            $password = $data['password'] ?? '';

            if (empty($username) || empty($email) || empty($password)) {
                sendJson(["error" => "All fields are required."], 400);
            }

            // Check if user exists
            $stmt = $conn->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
            $stmt->bind_param("ss", $username, $email);
            $stmt->execute();
            if ($stmt->get_result()->num_rows > 0) {
                sendJson(["error" => "Username or email already exists."], 409);
            }
            $stmt->close();

            // Create user
            $hashed_password = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $conn->prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
            $stmt->bind_param("sss", $username, $email, $hashed_password);

            if ($stmt->execute()) {
                sendJson(["success" => true, "message" => "Registration successful"]);
            } else {
                sendJson(["error" => "Registration failed: " . $conn->error], 500);
            }
            $stmt->close();
            break;

        case 'logout':
            session_unset();
            session_destroy();
            sendJson(["success" => true]);
            break;

        case 'forgot-password':
            // Placeholder for forgot password logic
            // In a real app, you'd send an email. For now, we'll simulate success or implement basic logic if needed.
            // For this fix, let's just acknowledge the request.
            $data = getJsonInput();
            $email = $data['email'] ?? '';
             if (empty($email)) {
                sendJson(["error" => "Email is required."], 400);
            }
            // Check if email exists
            $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
            $stmt->bind_param("s", $email);
            $stmt->execute();
            if ($stmt->get_result()->num_rows === 0) {
                 sendJson(["error" => "Email not found."], 404);
            }
            
            // Generate a dummy code for demo purposes (or store in DB)
            // In production, send email.
            // For now, return success to unblock UI flow.
            sendJson(["success" => true, "message" => "Verification code sent (simulated)."]);
            break;

        case 'verify-code':
             // Placeholder
             sendJson(["success" => true, "message" => "Code verified (simulated)."]);
             break;

        case 'reset-password':
             // Placeholder
             $data = getJsonInput();
             $email = $data['email'] ?? '';
             $newPassword = $data['newPassword'] ?? '';
             
             if (empty($email) || empty($newPassword)) {
                 sendJson(["error" => "Email and new password required."], 400);
             }
             
             $hashed_password = password_hash($newPassword, PASSWORD_DEFAULT);
             $stmt = $conn->prepare("UPDATE users SET password = ? WHERE email = ?");
             $stmt->bind_param("ss", $hashed_password, $email);
             
             if ($stmt->execute()) {
                 sendJson(["success" => true, "message" => "Password reset successful."]);
             } else {
                 sendJson(["error" => "Password reset failed."], 500);
             }
             break;

        default:
            sendJson(["error" => "Invalid action"], 400);
    }
} catch (Exception $e) {
    sendJson(["error" => "Server Error: " . $e->getMessage()], 500);
}
?>
