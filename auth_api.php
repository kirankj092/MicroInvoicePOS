<?php
ob_start();
/**
 * auth_api.php - Secure Authentication Backend
 * Handles Login, Registration, and Session Management
 */

// 1. Secure Session Configuration
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_secure', isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 1 : 0);
session_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 2. Load Database Credentials
if (!file_exists('db_config.php')) {
    die(json_encode(["error" => "Configuration file missing."]));
}
require_once('db_config.php');

// Support multiple variable naming conventions
$db_host = $host ?? $servername ?? 'localhost';
$db_user = $username ?? $db_user ?? $user ?? '';
$db_pass = $password ?? $db_pass ?? $pass ?? '';
$db_name = $dbname ?? $db_name ?? '';

// Suppress warnings to keep JSON valid
$conn = @new mysqli($db_host, $db_user, $db_pass, $db_name);

if ($conn->connect_error) {
    ob_clean();
    die(json_encode([
        "error" => "Database connection failed",
        "details" => $conn->connect_error,
        "hint" => "Check your db_config.php variable names. Ensure you use \$host, \$username, \$password, and \$dbname."
    ]));
}

// Helper to get JSON input
function getJsonInput() {
    return json_decode(file_get_contents('php://input'), true);
}

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'register':
        $data = getJsonInput();
        $user = $data['username'] ?? '';
        $email = $data['email'] ?? '';
        $pass = $data['password'] ?? '';

        if (empty($user) || empty($email) || empty($pass)) {
            echo json_encode(["error" => "All fields are required."]);
            break;
        }

        $hashed_pass = password_hash($pass, PASSWORD_DEFAULT);

        $stmt = $conn->prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
        if (!$stmt) {
            echo json_encode(["error" => "SQL Error: " . $conn->error]);
            break;
        }
        $stmt->bind_param("sss", $user, $email, $hashed_pass);

        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Registration successful."]);
        } else {
            echo json_encode(["error" => "Username or Email already exists."]);
        }
        $stmt->close();
        break;

    case 'login':
        $data = getJsonInput();
        $user = $data['username'] ?? '';
        $pass = $data['password'] ?? '';

        $stmt = $conn->prepare("SELECT id, password FROM users WHERE username = ? OR email = ?");
        if (!$stmt) {
            echo json_encode(["error" => "SQL Error: " . $conn->error]);
            break;
        }
        $stmt->bind_param("ss", $user, $user);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($row = $result->fetch_assoc()) {
            if (password_verify($pass, $row['password'])) {
                // Regenerate session ID to prevent session hijacking
                session_regenerate_id(true);
                $_SESSION['user_id'] = $row['id'];
                $_SESSION['username'] = $user;
                $_SESSION['last_regen'] = time();
                
                echo json_encode(["success" => true, "message" => "Login successful."]);
            } else {
                echo json_encode(["error" => "Invalid password."]);
            }
        } else {
            echo json_encode(["error" => "User not found."]);
        }
        $stmt->close();
        break;

    case 'check':
        if (isset($_SESSION['user_id'])) {
            echo json_encode(["authenticated" => true, "username" => $_SESSION['username']]);
        } else {
            echo json_encode(["authenticated" => false]);
        }
        break;

    case 'logout':
        session_unset();
        session_destroy();
        echo json_encode(["success" => true]);
        break;

    default:
        echo json_encode(["error" => "Invalid action."]);
        break;
}

$conn->close();
?>
