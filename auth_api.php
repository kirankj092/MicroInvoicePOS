<?php
ob_start();
// auth_api.php
require_once 'db_config.php';

header('Content-Type: application/json');

$action = $_REQUEST['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($action === 'register' && $method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $username = $data['username'] ?? '';
        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';

        if (!$username || !$email || !$password) {
            echo json_encode(['error' => 'Missing required fields']);
            exit;
        }

        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO users (username, email, password) VALUES (?, ?, ?)");
        $stmt->execute([$username, $email, $hashedPassword]);
        echo json_encode(['success' => true, 'message' => 'Registration successful']);
        exit;
    }

    if ($action === 'login' && $method === 'POST') {
        error_log("Login attempt started");
        $data = json_decode(file_get_contents('php://input'), true);
        $username = $data['username'] ?? '';
        $password = $data['password'] ?? '';

        if (!$username || !$password) {
            error_log("Login failed: Missing username or password");
            echo json_encode(['error' => 'Username and password are required']);
            exit;
        }

        error_log("Searching for user: $username");
        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? OR email = ?");
        $stmt->execute([$username, $username]);
        $user = $stmt->fetch();

        if ($user) {
            error_log("User found. Checking password.");
            if (password_verify($password, $user['password'])) {
                error_log("Password match. Setting session.");
                $_SESSION['user_id'] = $user['id'];
                $_SESSION['username'] = $user['username'];
                echo json_encode(['success' => true, 'message' => 'Login successful']);
            } else {
                error_log("Password mismatch");
                echo json_encode(['error' => 'Invalid credentials']);
            }
        } else {
            error_log("User not found: $username");
            echo json_encode(['error' => 'Invalid credentials']);
        }
        exit;
    }

    if ($action === 'check') {
        if (isset($_SESSION['user_id'])) {
            $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
            $stmt->execute([$_SESSION['user_id']]);
            $user = $stmt->fetch();

            echo json_encode([
                'authenticated' => true,
                'username' => $_SESSION['username'],
                'email' => $user['email'],
                'profile' => [
                    'shop_name' => $user['shop_name'],
                    'address' => $user['address'],
                    'phone' => $user['phone'],
                    'gstin' => $user['gstin'],
                    'email' => $user['email'],
                    'shop_logo' => $user['shop_logo'],
                    'signature' => $user['signature']
                ]
            ]);
        } else {
            echo json_encode(['authenticated' => false]);
        }
        exit;
    }

    if ($action === 'update_profile' && $method === 'POST') {
        if (!isset($_SESSION['user_id'])) {
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $pdo->prepare("UPDATE users SET shop_name=?, address=?, phone=?, gstin=?, email=?, shop_logo=?, signature=? WHERE id=?");
        $stmt->execute([
            $data['shop_name'], 
            $data['address'], 
            $data['phone'], 
            $data['gstin'], 
            $data['email'], 
            $data['shop_logo'], 
            $data['signature'], 
            $_SESSION['user_id']
        ]);
        echo json_encode(['success' => true]);
        exit;
    }

    if ($action === 'logout') {
        session_destroy();
        echo json_encode(['success' => true]);
        exit;
    }

    // Forgot password logic (simplified for PHP)
    if (($action === 'forgot-password' || $action === 'forgot_password') && $method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $email = $data['email'] ?? '';
        
        $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if (!$user) {
            echo json_encode(['error' => 'Email not found']);
            exit;
        }

        $code = strval(rand(100000, 999999));
        $expires_at = date('Y-m-d H:i:s', strtotime('+15 minutes'));

        $stmt = $pdo->prepare("DELETE FROM password_resets WHERE email = ?");
        $stmt->execute([$email]);
        
        $stmt = $pdo->prepare("INSERT INTO password_resets (email, code, expires_at) VALUES (?, ?, ?)");
        $stmt->execute([$email, $code, $expires_at]);

        // In a real Hostinger environment, you'd use mail() or a library like PHPMailer
        // For now, we'll just return success to simulate it, or try mail()
        $subject = "Password Reset Code";
        $message = "Your password reset code is: $code. It expires in 15 minutes.";
        $headers = "From: no-reply@micro-invoice-pos.com";
        
        @mail($email, $subject, $message, $headers);
        
        echo json_encode(['success' => true, 'message' => 'Reset code sent (if mail server configured)']);
        exit;
    }

    if (($action === 'verify-code' || $action === 'verify_code') && $method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $email = $data['email'] ?? '';
        $code = $data['code'] ?? '';
        
        $stmt = $pdo->prepare("SELECT * FROM password_resets WHERE email = ? AND code = ? AND expires_at > ?");
        $stmt->execute([$email, $code, date('Y-m-d H:i:s')]);
        $reset = $stmt->fetch();
        
        if ($reset) {
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['error' => 'Invalid or expired code']);
        }
        exit;
    }

    if (($action === 'reset-password' || $action === 'reset_password') && $method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        $email = $data['email'] ?? '';
        $code = $data['code'] ?? '';
        $newPassword = $data['newPassword'] ?? '';
        
        $stmt = $pdo->prepare("SELECT * FROM password_resets WHERE email = ? AND code = ? AND expires_at > ?");
        $stmt->execute([$email, $code, date('Y-m-d H:i:s')]);
        $reset = $stmt->fetch();
        
        if ($reset) {
            $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("UPDATE users SET password = ? WHERE email = ?");
            $stmt->execute([$hashedPassword, $email]);
            
            $stmt = $pdo->prepare("DELETE FROM password_resets WHERE email = ?");
            $stmt->execute([$email]);
            
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['error' => 'Invalid or expired code']);
        }
        exit;
    }

    echo json_encode(['error' => 'Invalid action']);

} catch (Throwable $e) {
    if (ob_get_length()) ob_end_clean();
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
}
