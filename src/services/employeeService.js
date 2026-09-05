import api from "./api";

export const getEmployees      = (params = {}) => api.get("/employees", { params });
export const createEmployee    = (data)        => api.post("/employees", data);
export const updateEmployee    = (id, data)    => api.put(`/employees/${id}`, data);
export const deactivateEmployee = (id)         => api.delete(`/employees/${id}`);
