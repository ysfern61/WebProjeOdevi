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

// Get announcement data from request
$data = json_decode(file_get_contents("php://input"));

// Validate announcement data
if (!empty($data->title) && !empty($data->content)) {
    // Insert announcement into database
    $query = "INSERT INTO announcements (title, content) VALUES (:title, :content)";
    $stmt = $db->prepare($query);
    $stmt->bindParam(":title", $data->title);
    $stmt->bindParam(":content", $data->content);

    if ($stmt->execute()) {
        http_response_code(201);
        echo json_encode(array(
            "success" => true,
            "message" => "Duyuru başarıyla oluşturuldu.",
        ));
    } else {
        http_response_code(503);
        echo json_encode(array(
            "success" => false,
            "message" => "Duyuru oluşturulamadı.",
        ));
    }
} else {
    http_response_code(400);
    echo json_encode(array(
        "success" => false,
        "message" => "Duyuru oluşturulamadı. Veriler eksik.",
    ));
}
