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

// Verify token and get user ID
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

// Get payment data from request
$data = json_decode(file_get_contents("php://input"));

// Validate payment data
if (empty($data->payment_type) || empty($data->cart) || !is_array($data->cart) || count($data->cart) == 0) {
    http_response_code(400);
    echo json_encode(array(
        "success" => false,
        "message" => "Bilet oluşturulamadı. Ödeme verileri eksik veya geçersiz."
    ));
    exit();
}

// Start transaction
$db->beginTransaction();

try {
    // Process each event in the cart
    $tickets = array();

    foreach ($data->cart as $event_id) {
        // Get event details
        $query = "SELECT id, title, price FROM events WHERE id = :event_id AND is_active = TRUE";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":event_id", $event_id);
        $stmt->execute();

        if ($stmt->rowCount() == 0) {
            // Skip invalid events
            continue;
        }

        $event = $stmt->fetch(PDO::FETCH_ASSOC);

        // Check if there's remaining capacity
        $query = "SELECT remaining_capacity FROM events WHERE id = :event_id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":event_id", $event_id);
        $stmt->execute();
        $capacity = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($capacity['remaining_capacity'] <= 0) {
            // Skip events with no remaining capacity
            continue;
        }

        // Create ticket
        $query = "INSERT INTO tickets (user_id, event_id, total_price) 
                  VALUES (:user_id, :event_id, :price)";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":user_id", $user_id);
        $stmt->bindParam(":event_id", $event_id);
        $stmt->bindParam(":price", $event['price']);
        $stmt->execute();

        $ticket = $stmt->fetch(PDO::FETCH_ASSOC);

        // Update remaining capacity
        $query = "UPDATE events SET remaining_capacity = remaining_capacity - 1 WHERE id = :event_id";
        $stmt = $db->prepare($query);
        $stmt->bindParam(":event_id", $event_id);
        $stmt->execute();

        // Add ticket to response

    }

    // Commit transaction
    $db->commit();

    // Return success response
    http_response_code(201);
    echo json_encode(array(
        "success" => true,
        "message" => "Biletler başarıyla oluşturuldu.",
        "tickets" => $tickets
    ));

} catch (Exception $e) {
    // Rollback transaction on error
    $db->rollBack();

    http_response_code(503);
    echo json_encode(array(
        "success" => false,
        "message" => "Bilet oluşturulurken bir hata oluştu: " . $e->getMessage()
    ));
}
