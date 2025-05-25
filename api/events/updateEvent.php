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

// Get data from request
$data = json_decode(file_get_contents("php://input"));

// Check if required data is provided
if(
    !isset($data->id) ||
    !isset($data->title) ||
    !isset($data->description) ||
    !isset($data->date) ||
    !isset($data->location) ||
    !isset($data->price) ||
    !isset($data->capacity) ||
    !isset($data->category_id)
) {
    http_response_code(400);
    echo json_encode(array(
        "success" => false,
        "message" => "Etkinlik güncellenemedi. Veriler eksik."
    ));
    exit();
}

// Check if event exists
$check_query = "SELECT id, remaining_capacity, capacity FROM events WHERE id = :id";
$check_stmt = $db->prepare($check_query);
$check_stmt->bindParam(":id", $data->id);
$check_stmt->execute();

if ($check_stmt->rowCount() == 0) {
    http_response_code(404);
    echo json_encode(array(
        "success" => false,
        "message" => "Etkinlik bulunamadı."
    ));
    exit();
}

$event = $check_stmt->fetch(PDO::FETCH_ASSOC);
$sold_tickets = $event['capacity'] - $event['remaining_capacity'];

// Check if new capacity is less than sold tickets
if ($data->capacity < $sold_tickets) {
    http_response_code(400);
    echo json_encode(array(
        "success" => false,
        "message" => "Kapasite, satılan bilet sayısından az olamaz."
    ));
    exit();
}

// Calculate new remaining capacity
$new_remaining_capacity = $data->capacity - $sold_tickets;

// Update event
$query = "UPDATE events SET 
            title = :title, 
            description = :description, 
            date = :date, 
            location = :location, 
            price = :price, 
            capacity = :capacity,
            remaining_capacity = :remaining_capacity,
            category_id = :category_id
          WHERE id = :id";

$stmt = $db->prepare($query);

$stmt->bindParam(":id", $data->id);
$stmt->bindParam(":title", $data->title);
$stmt->bindParam(":description", $data->description);
$stmt->bindParam(":date", $data->date);
$stmt->bindParam(":location", $data->location);
$stmt->bindParam(":price", $data->price);
$stmt->bindParam(":capacity", $data->capacity);
$stmt->bindParam(":remaining_capacity", $new_remaining_capacity);
$stmt->bindParam(":category_id", $data->category_id);

if($stmt->execute()) {
    http_response_code(200);
    echo json_encode(array(
        "success" => true,
        "message" => "Etkinlik başarıyla güncellendi."
    ));
} else {
    http_response_code(503);
    echo json_encode(array(
        "success" => false,
        "message" => "Etkinlik güncellenemedi."
    ));
}
?>
