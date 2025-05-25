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

if(!empty($data->email) && !empty($data->password)) {
    $query = "SELECT id, email, password, role, is_approved, is_first_login FROM users WHERE email = :email";
    
    $stmt = $db->prepare($query);
    $stmt->bindParam(":email", $data->email);
    $stmt->execute();
    
    if($stmt->rowCount() > 0) {
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if($row['is_approved'] == 0) {
            http_response_code(401);
            echo json_encode(array(
                "success" => false,
                "message" => "Hesabınız henüz onaylanmamış."
            ));
            exit();
        }
        
        if(password_verify($data->password, $row['password'])) {
            while (true){
            $token = bin2hex(random_bytes(32));
            $query = "SELECT id FROM users WHERE token = :token";
            $stmt = $db->prepare($query);
            $stmt->bindParam(":token", $token);
            $stmt->execute();
            if($stmt->rowCount() === 0) break;

            }
            $updateQuery = "UPDATE users SET token = :token WHERE id = :id";
            $updateStmt = $db->prepare($updateQuery);
            $updateStmt->bindParam(":token", $token);
            $updateStmt->bindParam(":id", $row['id']);
            $updateStmt->execute();
            
            http_response_code(200);
            echo json_encode(array(
                "success" => true,
                "message" => "Giriş başarılı.",
                "token" => $token,
                "user" => array(
                    "id" => $row['id'],
                    "email" => $row['email'],
                    "role" => $row['role'],
                    "is_first_login" => $row['is_first_login']
                )
            ));
        } else {
            http_response_code(401);
            echo json_encode(array(
                "success" => false,
                "message" => "Geçersiz şifre."
            ));
        }
    } else {
        http_response_code(401);
        echo json_encode(array(
            "success" => false,
            "message" => "Kullanıcı bulunamadı."
        ));
    }
} else {
    http_response_code(400);
    echo json_encode(array(
        "success" => false,
        "message" => "Giriş yapılamadı. Veriler eksik."
    ));
}
?> 