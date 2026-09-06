import api from './api';

/**
 * GET /api/v1/categories
 * @param {{ includeInactive?: boolean }} params
 */
export const getCategories = (params = {}) => api.get('/categories', { params });

/**
 * POST /api/v1/categories
 * @param {{ name: string }} data
 */
export const createCategory = (data) => api.post('/categories', data);

/**
 * PUT /api/v1/categories/:id
 * @param {string} id
 * @param {{ name?: string, isActive?: boolean }} data
 */
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data);

/**
 * DELETE /api/v1/categories/:id  (soft-delete)
 * @param {string} id
 */
export const deactivateCategory = (id) => api.delete(`/categories/${id}`);
