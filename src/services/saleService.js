import api from './api';

/**
 * POST /api/v1/sales
 * @param {{ branchId, paymentType, customerId?, items, amountPaid, discount?, note? }} data
 */
export const createSale = (data) => api.post('/sales', data);

/**
 * GET /api/v1/sales
 * @param {{ branchId?, startDate?, endDate?, paymentType?, customerId?, page?, limit? }} params
 */
export const getSales = (params = {}) => api.get('/sales', { params });

/**
 * GET /api/v1/sales/:id
 * @param {string} id
 */
export const getSaleById = (id) => api.get(`/sales/${id}`);
