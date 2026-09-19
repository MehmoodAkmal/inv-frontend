import api from './api';

/**
 * GET /api/v1/account/profile
 * Fetches the currently authenticated user's profile, branch, organization, and employee metadata.
 */
export const getAccountProfile = () => api.get('/account/profile');

/**
 * PUT /api/v1/account/profile
 * Updates the current user's name, email, and phone.
 * @param {{ firstName: string, lastName: string, email: string, phone?: string }} data
 */
export const updateAccountProfile = (data) => api.put('/account/profile', data);

/**
 * PUT /api/v1/account/change-password
 * Changes the current user's password after verifying their current password.
 * @param {{ currentPassword: string, newPassword: string, confirmPassword: string }} data
 */
export const changePassword = (data) => api.put('/account/change-password', data);

/**
 * PUT /api/v1/account/organization
 * Admin-only: Updates organization name and currency settings.
 * @param {{ name: string, currency?: { code?: string, symbol?: string }, currencyCode?: string, currencySymbol?: string }} data
 */
export const updateOrganizationSettings = (data) => api.put('/account/organization', data);
