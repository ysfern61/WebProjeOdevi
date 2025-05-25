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
$query = "SELECT id, email FROM users WHERE token = :token";
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

// Get data from request
$data = json_decode(file_get_contents("php://input"));

// Check if required data is provided
if (!isset($data->email) || empty($data->email)) {
    http_response_code(400);
    echo json_encode(array(
        "success" => false,
        "message" => "Email adresi gereklidir."
    ));
    exit();
}

// Validate email format
if (!filter_var($data->email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(array(
        "success" => false,
        "message" => "Geçerli bir email adresi giriniz."
    ));
    exit();
}

// Check if email already exists (if it's different from current email)
if ($data->email !== $user['email']) {
    $query = "SELECT id FROM users WHERE email = :email AND id != :user_id";
    $stmt = $db->prepare($query);
    $stmt->bindParam(":email", $data->email);
    $stmt->bindParam(":user_id", $user_id);
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
        http_response_code(400);
        echo json_encode(array(
            "success" => false,
            "message" => "Bu email adresi zaten kullanılıyor."
        ));
        exit();
    }
}

// Prepare interests data
$interests = isset($data->interests) ? $data->interests : "";

// Update user profile
$query = "UPDATE users SET email = :email WHERE id = :user_id";
$stmt = $db->prepare($query);
$stmt->bindParam(":email", $data->email);
$stmt->bindParam(":user_id", $user_id);

if ($stmt->execute()) {
    http_response_code(200);
    echo json_encode(array(
        "success" => true,
        "message" => "Profil bilgileriniz başarıyla güncellendi."
    ));
} else {
    http_response_code(500);
    echo json_encode(array(
        "success" => false,
        "message" => "Profil güncellenirken bir hata oluştu."
    ));
}
?>
