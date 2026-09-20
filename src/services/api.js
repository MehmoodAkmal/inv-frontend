import axios from 'axios';

// Dynamically normalize API base URL (supports full backend URL or relative path)
const getBaseURL = () => {
  const url = import.meta.env.VITE_API_URL?.trim();
  if (!url) return '/api/v1';
  const cleanUrl = url.replace(/\/+$/, '');
  if (cleanUrl.endsWith('/api/v1')) {
    return cleanUrl;
  }
  return `${cleanUrl}/api/v1`;
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const AUTH_ERRORS = [
  'jwt malformed',
  'jwt expired',
  'invalid signature',
  'invalid token',
  'Authentication token is required',
  'Invalid authentication token',
];

const isAuthError = (error) => {
  const status = error.response?.status;
  const message = error.response?.data?.message ?? '';
  if (status === 401) return true;
  if (status === 400 && AUTH_ERRORS.some((m) => message.toLowerCase().includes(m.toLowerCase())))
    return true;
  return false;
};

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (isAuthError(error)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    return Promise.reject(error);
  }
);

export default api;
