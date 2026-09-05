import api from "./api";

/**
 * POST /api/v1/login
 * @param {{ email: string, password: string }} credentials
 */
export const login = (credentials) => api.post("/login", credentials);

/**
 * POST /api/v1/signup
 * @param {{ firstName, lastName, email, password, organizationName }} data
 */
export const signup = (data) => api.post("/signup", data);
