<?php
use api\config\Database;

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents("php://input"));

if(
    !empty($data->title) &&
    !empty($data->description) &&
    !empty($data->date) &&
    !empty($data->location) &&
    !empty($data->price) &&
    !empty($data->capacity) &&
    !empty($data->category_id)
) {
    $query = "INSERT INTO events 
              (title, description, date, location, price, capacity, remaining_capacity, category_id, is_active) 
              VALUES 
              (:title, :description, :date, :location, :price, :capacity, :capacity, :category_id, 1)";
    
    $stmt = $db->prepare($query);
    
    $stmt->bindParam(":title", $data->title);
    $stmt->bindParam(":description", $data->description);
    $stmt->bindParam(":date", $data->date);
    $stmt->bindParam(":location", $data->location);
    $stmt->bindParam(":price", $data->price);
    $stmt->bindParam(":capacity", $data->capacity);
    $stmt->bindParam(":category_id", $data->category_id);

    if($stmt->execute()) {
        http_response_code(201);
        echo json_encode(array(
            "success" => true,
            "message" => "Etkinlik başarıyla oluşturuldu."
        ));
    } else {
        http_response_code(503);
        echo json_encode(array(
            "success" => false,
            "message" => "Etkinlik oluşturulamadı."
        ));
    }
} else {
    http_response_code(400);
    echo json_encode(array(
        "success" => false,
        "message" => "Etkinlik oluşturulamadı. Veriler eksik."
    ));
}
?> 