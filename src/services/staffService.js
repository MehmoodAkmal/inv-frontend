import api from "./api";

/**
 * GET /api/v1/staff
 * @param {{ branchId?: string }} params
 */
export const getStaff = (params = {}) => api.get("/staff", { params });

/**
 * POST /api/v1/staff
 * @param {{ firstName, lastName, email, password, role, branchId }} data
 */
export const createStaff = (data) => api.post("/staff", data);

/**
 * PUT /api/v1/staff/:id
 * @param {string} id
 * @param {{ firstName?, lastName?, branchId?, isActive? }} data
 */
export const updateStaff = (id, data) => api.put(`/staff/${id}`, data);

/**
 * DELETE /api/v1/staff/:id  (soft-delete)
 * @param {string} id
 */
export const deactivateStaff = (id) => api.delete(`/staff/${id}`);

export const getStaffPermissions = (id) => api.get(`/permissions/users/${id}`);
export const updateStaffPermissions = (id, permissions) =>
  api.put(`/permissions/users/${id}`, { permissions });
export const resetStaffPermissions = (id) => api.delete(`/permissions/users/${id}`);
