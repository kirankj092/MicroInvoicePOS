<?php
/**
 * auth_check.php - Authentication Middleware
 * Include this at the top of any PHP file you want to protect.
 */

if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.use_only_cookies', 1);
    ini_set('session.cookie_secure', isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 1 : 0);
    session_start();
}

// Check if user is logged in
if (!isset($_SESSION['user_id'])) {
    header('Content-Type: application/json');
    http_response_code(401);
    die(json_encode(["error" => "Unauthorized access. Please login."]));
}

// Session Hijacking Prevention: Check if session is too old (e.g., 30 mins)
$timeout = 1800; // 30 minutes
if (isset($_SESSION['last_regen']) && (time() - $_SESSION['last_regen'] > $timeout)) {
    session_unset();
    session_destroy();
    header('Content-Type: application/json');
    http_response_code(401);
    die(json_encode(["error" => "Session expired. Please login again."]));
}
?>
