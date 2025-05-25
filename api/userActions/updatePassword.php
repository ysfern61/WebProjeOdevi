<?php
use api\config\Database;

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../config/database.php';

// Create database connection
$database = new Database();
$db = $database->getConnection();

// Get authorization header
$headers = getallheaders();
$auth_header = isset($headers['Authorization']) ? $headers['Authorization'] : '';

// Check if token exists
if (empty($auth_header) || !preg_match('/Bearer\s(\S+)/', $auth_header, $matches)) {
    http_response_code(401);
    echo json_encode(array(
        "success" => false,
        "message" => "Yetkisiz erişim. Token bulunamadı."
    ));
    exit();
}

// Extract token
$token = $matches[1];

// Verify token and get user information
$query = "SELECT id, email, password FROM users WHERE token = :token";
$stmt = $db->prepare($query);
$stmt->bindParam(":token", $token);
$stmt->execute();

if ($stmt->rowCount() == 0) {
    http_response_code(401);
    echo json_encode(array(
        "success" => false,
        "message" => "Geçersiz token."
    ));
    exit();
}

$user = $stmt->fetch(PDO::FETCH_ASSOC);
$user_id = $user['id'];
$current_password_hash = $user['password'];

// Get data from request
$data = json_decode(file_get_contents("php://input"));

// Check if this is a first login password change
$isFirstLogin = isset($data->isFirstLogin) && $data->isFirstLogin === true;

// Check if required data is provided
if (!$isFirstLogin && (!isset($data->currentPassword) || empty($data->currentPassword))) {
    http_response_code(400);
    echo json_encode(array(
        "success" => false,
        "message" => "Mevcut şifre gereklidir."
    ));
    exit();
}

if (!isset($data->newPassword) || empty($data->newPassword)) {
    http_response_code(400);
    echo json_encode(array(
        "success" => false,
        "message" => "Yeni şifre gereklidir."
    ));
    exit();
}

// Validate new password (minimum 6 characters)
if (strlen($data->newPassword) < 6) {
    http_response_code(400);
    echo json_encode(array(
        "success" => false,
        "message" => "Yeni şifre en az 6 karakter olmalıdır."
    ));
    exit();
}

// Verify current password (skip for first login)
if (!$isFirstLogin && !password_verify($data->currentPassword, $current_password_hash)) {
    http_response_code(400);
    echo json_encode(array(
        "success" => false,
        "message" => "Mevcut şifre yanlış."
    ));
    exit();
}

// Hash new password
$new_password_hash = password_hash($data->newPassword, PASSWORD_BCRYPT);

// Update password and first login flag if needed
$query = $isFirstLogin 
    ? "UPDATE users SET password = :password, is_first_login = 0 WHERE id = :user_id" 
    : "UPDATE users SET password = :password WHERE id = :user_id";

$stmt = $db->prepare($query);
$stmt->bindParam(":password", $new_password_hash);
$stmt->bindParam(":user_id", $user_id);

if ($stmt->execute()) {
    http_response_code(200);
    echo json_encode(array(
        "success" => true,
        "message" => "Şifreniz başarıyla güncellendi."
    ));
} else {
    http_response_code(500);
    echo json_encode(array(
        "success" => false,
        "message" => "Şifre güncellenirken bir hata oluştu."
    ));
}
?>
