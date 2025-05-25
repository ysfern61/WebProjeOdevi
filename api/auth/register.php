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
    !empty($data->email) &&
    !empty($data->password)
) {
    $query = "SELECT id FROM users WHERE email = :email";
    $stmt = $db->prepare($query);
    $stmt->bindParam(":email", $data->email);
    $stmt->execute();
    if ($stmt->rowCount()!==0){
        http_response_code(404);
        echo json_encode(array(
            "success" => false,
            "message" => "Bu email' e sahip başka bir kullanıcı var"
        ));
        return;
    }
    $query = "INSERT INTO users (email, password, role, is_approved) VALUES (:email, :password, 'user', 0)";

    $stmt = $db->prepare($query);

    $password_hash = password_hash($data->password, PASSWORD_BCRYPT);

    $stmt->bindParam(":email", $data->email);
    $stmt->bindParam(":password", $password_hash);

    if($stmt->execute()) {
        http_response_code(201);
        echo json_encode(array(
            "success" => true,
            "message" => "Kullanıcı başarıyla oluşturuldu."
        ));
    } else {
        http_response_code(503);
        echo json_encode(array(
            "success" => false,
            "message" => "Kullanıcı oluşturulamadı."
        ));
    }
} else {
    http_response_code(400);
    echo json_encode(array(
        "success" => false,
        "message" => "Kullanıcı oluşturulamadı. Veriler eksik."
    ));
}
?>