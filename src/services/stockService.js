import api from "./api";

/**
 * POST /api/v1/stock/add
 * @param {{ itemId: string, branchId: string, quantity: number, note?: string }} data
 */
export const addStock = (data) => api.post("/stock/add", data);

/**
 * GET /api/v1/stock
 * @param {{ branchId?: string }} params  — branchId required for admin, ignored for manager/cashier
 */
export const getStock = (params = {}) => api.get("/stock", { params });

/**
 * GET /api/v1/stock/movements
 * @param {{ branchId?: string, itemId?: string, page?: number, limit?: number }} params
 */
export const getMovements = (params = {}) => api.get("/stock/movements", { params });
