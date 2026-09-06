import api from './api';

// ── Legacy endpoint (used by branches page for superAdmin) ─────────────────
export const getOrganizations = () => api.get('/organizations');

// ── New superAdmin admin endpoints ─────────────────────────────────────────
export const getPlatformStats = () => api.get('/admin/stats');
export const getAdminOrganizations = (params = {}) => api.get('/admin/organizations', { params });
export const getOrganizationDetail = (id) => api.get(`/admin/organizations/${id}`);
export const toggleOrganizationStatus = (id) =>
  api.patch(`/admin/organizations/${id}/toggle-status`);
export const updateOrganizationPlan = (id, data) =>
  api.patch(`/admin/organizations/${id}/plan`, data);
export const getSignupTrend = (params = {}) => api.get('/admin/signup-trend', { params });
export const getMostActiveOrgs = (params = {}) =>
  api.get('/admin/active-organizations', { params });
export const getAllUsers = (params = {}) => api.get('/admin/users', { params });
