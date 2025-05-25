<?php
use api\config\Database;

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: DELETE, GET, POST");
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

// Get announcement ID from request
$data = json_decode(file_get_contents("php://input"));

// If no data was sent, try to get announcement ID from URL
if (isset($_GET['id'])) {
    $announcement_id = $_GET['id'];
} elseif (isset($data->id)) {
    $announcement_id = $data->id;
} else {
    // Extract announcement ID from URL if it exists
    $request_uri = $_SERVER['REQUEST_URI'];
    if (preg_match('/\/deleteAnnouncement\.php\?id=(\d+)/', $request_uri, $matches)) {
        $announcement_id = $matches[1];
    } elseif (preg_match('/\/announcements\/(\d+)/', $request_uri, $matches)) {
        $announcement_id = $matches[1];
    } else {
        http_response_code(400);
        echo json_encode(array(
            "success" => false,
            "message" => "Duyuru ID'si belirtilmedi."
        ));
        exit();
    }
}

// Check if announcement exists
$query = "SELECT id, title FROM announcements WHERE id = :id";
$stmt = $db->prepare($query);
$stmt->bindParam(":id", $announcement_id);
$stmt->execute();

if ($stmt->rowCount() == 0) {
    http_response_code(404);
    echo json_encode(array(
        "success" => false,
        "message" => "Duyuru bulunamadı."
    ));
    exit();
}

$announcement = $stmt->fetch(PDO::FETCH_ASSOC);

// Delete announcement
$query = "DELETE FROM announcements WHERE id = :id";
$stmt = $db->prepare($query);
$stmt->bindParam(":id", $announcement_id);

if ($stmt->execute()) {
    http_response_code(200);
    echo json_encode(array(
        "success" => true,
        "message" => "Duyuru başarıyla silindi.",
    ));
} else {
    http_response_code(500);
    echo json_encode(array(
        "success" => false,
        "message" => "Duyuru silinirken bir hata oluştu.",
    ));
}
