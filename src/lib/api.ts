export const API_BASE = "http://localhost/focus-forge-os-main/php_backend/api.php";

export const getAuthHeaders = () => {
  const token = localStorage.getItem("ff_token");
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token ?? ""}`,
  };
};
