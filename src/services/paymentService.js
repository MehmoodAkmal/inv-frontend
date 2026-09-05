import api from "./api";

export const recordPayment        = (data)          => api.post("/payments", data);
export const getCustomerLedger    = (customerId, params = {}) => api.get(`/payments/customer/${customerId}`, { params });
export const getOutstandingBalance = (params = {})  => api.get("/payments/outstanding", { params });
