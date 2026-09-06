import api from "./api";

export const getMyPermissions = () => api.get("/permissions/me");
export const getRolePermissions = (role) => api.get(`/permissions/roles/${role}`);
export const updateRolePermissions = (role, permissions) => api.put(`/permissions/roles/${role}`, { permissions });
