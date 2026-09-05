import api from "./api";

/**
 * GET /api/v1/items
 * @param {{ categoryId?: string, includeInactive?: boolean }} params
 */
export const getItems = (params = {}) => api.get("/items", { params });

/**
 * POST /api/v1/items
 * @param {{ categoryId, name, sku?, unit, costPrice, sellingPrice, reorderLevel? }} data
 */
export const createItem = (data) => api.post("/items", data);

/**
 * PUT /api/v1/items/:id
 * @param {string} id
 * @param {object} data
 */
export const updateItem = (id, data) => api.put(`/items/${id}`, data);

/**
 * DELETE /api/v1/items/:id  (soft-delete)
 * @param {string} id
 */
export const deactivateItem = (id) => api.delete(`/items/${id}`);
