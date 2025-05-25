<?php

namespace api\config;

use PDO;
use PDOException;

class Database
{
    private $host = "localhost"; // MySQL sunucu adresi
    private $db_name = "etkinlik_sistemi";
    private $username = "root"; // MySQL kullanıcı adı
    private $password = ""; // MySQL şifresi
    public $conn;

    public function getConnection()
    {
        $this->conn = null;

        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8",
                $this->username,
                $this->password
            );
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch (PDOException $e) {
            echo "Bağlantı hatası: " . $e->getMessage();
        }

        return $this->conn;
    }
}
?> 