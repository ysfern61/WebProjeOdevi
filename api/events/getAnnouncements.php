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


// Fetch announcements from the database
$query = "SELECT id, title, content, created_at FROM announcements ORDER BY created_at DESC";
$stmt = $db->prepare($query);
$stmt->execute();

$announcements = array();

while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $announcements[] = $row;
}

// Return announcements list
http_response_code(200);
echo json_encode($announcements);
?>
