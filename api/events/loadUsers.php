<?php
use api\config\Database;

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");
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

// Verify token and check if user is admin
$query = "SELECT u.id, u.email, u.role FROM users u WHERE u.token = :token";
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

// Check if user is admin
if ($user['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(array(
        "success" => false,
        "message" => "Bu işlem için admin yetkisi gerekiyor."
    ));
    exit();
}

// User is admin, get all users
$query = "SELECT id, email, role as is_admin, is_approved FROM users";
$stmt = $db->prepare($query);
$stmt->execute();

$users = array();

while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    // Convert role to boolean is_admin for frontend compatibility
    $row['is_admin'] = ($row['is_admin'] === 'admin');

    $users[] = $row;
}

// Return users list
http_response_code(200);
echo json_encode($users);
?>
