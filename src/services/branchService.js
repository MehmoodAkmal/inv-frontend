import api from "./api";

/**
 * GET /api/v1/branches
 * @param {{ includeInactive?: boolean, organizationId?: string }} params
 */
export const getBranches = (params = {}) => api.get("/branches", { params });

/**
 * GET /api/v1/branches/:id
 * @param {string} id
 */
export const getBranchById = (id) => api.get(`/branches/${id}`);

export const createBranch = (data) => api.post("/branches", data);

/**
 * PUT /api/v1/branches/:id
 * @param {string} id
 * @param {{ name?: string, address?: string }} data
 */
export const updateBranch = (id, data) => api.put(`/branches/${id}`, data);

/**
 * DELETE /api/v1/branches/:id  (soft-delete)
 * @param {string} id
 */
export const deactivateBranch = (id) => api.delete(`/branches/${id}`);
