import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api/v1",
  headers: { "Content-Type": "application/json" },
});

// Attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth error messages from this backend's authentication middleware
const AUTH_ERRORS = [
  "jwt malformed",
  "jwt expired",
  "invalid signature",
  "invalid token",
  "Authentication token is required",
  "Invalid authentication token",
];

const isAuthError = (error) => {
  const status  = error.response?.status;
  const message = error.response?.data?.message ?? "";
  // 401 is the standard; this backend also returns 400 for token errors
  if (status === 401) return true;
  if (status === 400 && AUTH_ERRORS.some((m) => message.toLowerCase().includes(m.toLowerCase()))) return true;
  return false;
};

// Redirect to login when the token is missing, expired, or malformed
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (isAuthError(error)) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
