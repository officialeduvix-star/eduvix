<?php
// Suppress PHP warnings/notices so they never corrupt JSON output
error_reporting(0);
ini_set('display_errors', 0);
// config.php

// =============================================
// CORS — Allowed Origins
// Add your Cloudflare URL below after deploying
// =============================================
$allowed_origins = [
    "http://localhost:3000",            // React dev (CRA)
    "http://localhost:5173",            // Vite dev server
    "http://localhost:8788",            // Cloudflare Wrangler local
    "https://eduvix.pages.dev",         // Your Cloudflare Pages URL
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$is_allowed = false;

if (in_array($origin, $allowed_origins)) {
    $is_allowed = true;
} elseif (preg_match('/^https:\/\/[a-z0-9.-]+\.pages\.dev$/i', $origin) || preg_match('/^https:\/\/[a-z0-9.-]+\.workers\.dev$/i', $origin)) {
    $is_allowed = true;
}

if ($is_allowed) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    // If the origin is not explicitly allowed, default to the production site or don't set it for security
    header("Access-Control-Allow-Origin: https://eduvix.pages.dev");
}

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
function sendResponse(bool $success, string $message, $data = null): void {
    echo json_encode([
        "success" => $success,
        "message" => $message,
        "data" => $data
    ]);
    exit();
}
?>
