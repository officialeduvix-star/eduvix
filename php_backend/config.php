<?php
// Suppress PHP warnings/notices so they never corrupt JSON output
error_reporting(0);
ini_set('display_errors', 0);
// config.php
// CORS Headers for React Frontend
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

$db_host = "sql213.infinityfree.com";
$db_user = "if0_42052077"; // Default XAMPP user
$db_pass = "Pu43QIZkYKp";     // Default XAMPP password is empty
$db_name = "if0_42052077_focus_forge";

// Create Connection
$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);

// Check Connection
if ($conn->connect_error) {
    die(json_encode(["error" => true, "message" => "Database connection failed: " . $conn->connect_error]));
}

// Function to send JSON response
function sendResponse($success, $message, $data = null) {
    echo json_encode([
        "success" => $success,
        "message" => $message,
        "data" => $data
    ]);
    exit();
}
?>
