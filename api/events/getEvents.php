<?php
use api\config\Database;

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include_once '../config/database.php';

$database = new Database();
$db = $database->getConnection();
if (isset($_GET['id'])){
    $id = $_GET['id'];
    $query = "SELECT e.*, c.name, c.id as category_name 
          FROM events e 
          LEFT JOIN categories c ON e.category_id = c.id 
          WHERE e.is_active = 1 and e.id = :id";
$stmt = $db->prepare($query);
$stmt->bindParam(":id", $id);
$stmt->execute();

if($stmt->rowCount() > 0) {
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    $event = array(
        "id" => $row['id'],
        "title" => $row['title'],
        "description" => $row['description'],
        "date" => $row['date'],
        "location" => $row['location'],
        "price" => $row['price'],
        "capacity" => $row['capacity'],
        "remaining_capacity" => $row['remaining_capacity'],
        "image" => $row['image'],
        "category" => $row['category_name'],
        "category_id" => $row['category_id']
    );
}
    http_response_code(200);
    echo json_encode(array(
        "success" => true,
        "events" => $event
    ));
    return;
}
$query = "SELECT e.*, c.name as category_name 
          FROM events e 
          LEFT JOIN categories c ON e.category_id = c.id 
          WHERE e.is_active = 1 
          ORDER BY e.created_at ASC";

$stmt = $db->prepare($query);
$stmt->execute();

if($stmt->rowCount() > 0&&!isset($_GET['id'])) {
    $events = array();
    
    while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $event = array(
            "id" => $row['id'],
            "title" => $row['title'],
            "description" => $row['description'],
            "date" => $row['date'],
            "location" => $row['location'],
            "price" => $row['price'],
            "capacity" => $row['capacity'],
            "remaining_capacity" => $row['remaining_capacity'],
            "image" => $row['image'],
            "category" => $row['category_name']
        );
        
        $events[] = $event;
    }
    
    http_response_code(200);
    echo json_encode(array(
        "success" => true,
        "events" => $events
    ));
} else {
    http_response_code(404);
    echo json_encode(array(
        "success" => false,
        "message" => "Etkinlik bulunamadı."
    ));
}
?> 