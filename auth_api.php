<?php
ob_start();
error_reporting(E_ALL);
ini_set('display_errors', 1);
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

// 1. Secure Session Configuration
ini_set('session.cookie_httponly', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_secure', isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 1 : 0);
// Set session lifetime to 30 days (2592000 seconds) for persistent login
ini_set('session.gc_maxlifetime', 2592000);
session_set_cookie_params([
    'lifetime' => 2592000,
    'path' => '/',
    'domain' => '',
    'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on',
    'httponly' => true,
    'samesite' => 'Lax'
]);
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

try {
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
            $user_id = $_SESSION['user_id'];
            $stmt = $conn->prepare("SELECT username, email, shop_name, address, phone, gstin, shop_logo, signature FROM users WHERE id = ?");
            $stmt->bind_param("i", $user_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $user_data = $result->fetch_assoc();
            
            echo json_encode([
                "authenticated" => true, 
                "username" => $user_data['username'],
                "profile" => $user_data
            ]);
            $stmt->close();
        } else {
            echo json_encode(["authenticated" => false]);
        }
        break;

    case 'update_profile':
        if (!isset($_SESSION['user_id'])) {
            echo json_encode(["error" => "Unauthorized"]);
            break;
        }
        $data = getJsonInput();
        $user_id = $_SESSION['user_id'];
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
        $params[] = $user_id;
        $types .= "i";

        $stmt = $conn->prepare($sql);
        $stmt->bind_param($types, ...$params);

        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Profile updated successfully."]);
        } else {
            echo json_encode(["error" => "Failed to update profile: " . $stmt->error]);
        }
        $stmt->close();
        break;

    case 'logout':
        session_unset();
        session_destroy();
        // Clear the session cookie explicitly
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }
        echo json_encode(["success" => true]);
        break;

    case 'forgot_password':
        $data = getJsonInput();
        $email = $data['email'] ?? '';
        $new_pass = $data['new_password'] ?? '';

        if (empty($email)) {
            echo json_encode(["error" => "Email is required."]);
            break;
        }

        // Check if user exists
        $stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($row = $result->fetch_assoc()) {
            if (!empty($new_pass)) {
                // Actually reset the password (for demo purposes)
                $hashed_pass = password_hash($new_pass, PASSWORD_DEFAULT);
                $update_stmt = $conn->prepare("UPDATE users SET password = ? WHERE id = ?");
                $update_stmt->bind_param("si", $hashed_pass, $row['id']);
                if ($update_stmt->execute()) {
                    echo json_encode(["success" => true, "message" => "Password reset successfully."]);
                } else {
                    echo json_encode(["error" => "Failed to reset password."]);
                }
                $update_stmt->close();
            } else {
                // Just verify email exists
                echo json_encode(["success" => true, "message" => "Email verified. Please enter your new password."]);
            }
        } else {
            echo json_encode(["error" => "Email not found."]);
        }
        $stmt->close();
        break;

    default:
        echo json_encode(["error" => "Invalid action."]);
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
