<?php
ob_start();
error_reporting(0);
ini_set('display_errors', 0);
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

    case 'forgot-password':
    case 'forgot_password':
        $data = getJsonInput();
        $email = $data['email'] ?? '';

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
            $code = strval(rand(100000, 999999));
            $expires_at = date('Y-m-d H:i:s', strtotime('+15 minutes'));

            // Delete old codes
            $del = $conn->prepare("DELETE FROM password_resets WHERE email = ?");
            $del->bind_param("s", $email);
            $del->execute();

            // Insert new code
            $ins = $conn->prepare("INSERT INTO password_resets (email, code, expires_at) VALUES (?, ?, ?)");
            $ins->bind_param("sss", $email, $code, $expires_at);
            
            if ($ins->execute()) {
                // Send Email
                $subject = "Password Reset Code";
                $message = "Your password reset code is: " . $code . ". It expires in 15 minutes.";
                $headers = "From: " . ($gmail_user ?? 'no-reply@' . $_SERVER['HTTP_HOST']) . "\r\n";
                $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
                
                $html_message = "<html><body><p>Your password reset code is: <strong>$code</strong>.</p><p>It expires in 15 minutes.</p></body></html>";
                
                // Note: On Hostinger, mail() usually works. For Gmail SMTP, PHPMailer is recommended.
                if (@mail($email, $subject, $html_message, $headers)) {
                    echo json_encode(["success" => true, "message" => "Code sent to your email."]);
                } else {
                    // Fallback for preview/local if mail() fails
                    echo json_encode(["success" => true, "message" => "Code generated (Email delivery failed, check server logs).", "debug_code" => $code]);
                }
            } else {
                echo json_encode(["error" => "Failed to generate reset code."]);
            }
        } else {
            echo json_encode(["error" => "Email not found."]);
        }
        break;

    case 'verify-code':
    case 'verify_code':
        $data = getJsonInput();
        $email = $data['email'] ?? '';
        $code = $data['code'] ?? '';
        $now = date('Y-m-d H:i:s');

        $stmt = $conn->prepare("SELECT id FROM password_resets WHERE email = ? AND code = ? AND expires_at > ?");
        $stmt->bind_param("sss", $email, $code, $now);
        $stmt->execute();
        if ($stmt->get_result()->fetch_assoc()) {
            echo json_encode(["success" => true]);
        } else {
            echo json_encode(["error" => "Invalid or expired code."]);
        }
        break;

    case 'reset-password':
    case 'reset_password':
        $data = getJsonInput();
        $email = $data['email'] ?? '';
        $code = $data['code'] ?? '';
        $new_pass = $data['newPassword'] ?? '';
        $now = date('Y-m-d H:i:s');

        $stmt = $conn->prepare("SELECT id FROM password_resets WHERE email = ? AND code = ? AND expires_at > ?");
        $stmt->bind_param("sss", $email, $code, $now);
        $stmt->execute();
        
        if ($stmt->get_result()->fetch_assoc()) {
            $hashed_pass = password_hash($new_pass, PASSWORD_DEFAULT);
            $update = $conn->prepare("UPDATE users SET password = ? WHERE email = ?");
            $update->bind_param("ss", $hashed_pass, $email);
            if ($update->execute()) {
                $del = $conn->prepare("DELETE FROM password_resets WHERE email = ?");
                $del->bind_param("s", $email);
                $del->execute();
                echo json_encode(["success" => true, "message" => "Password reset successfully."]);
            } else {
                echo json_encode(["error" => "Failed to update password."]);
            }
        } else {
            echo json_encode(["error" => "Invalid or expired code."]);
        }
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
