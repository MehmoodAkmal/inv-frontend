import api from './api';

export const getProfitLoss = (params) => api.get('/reports/profit-loss', { params });
export const getBranchComparison = (params) => api.get('/reports/branch-comparison', { params });
export const getLowStock = (params = {}) => api.get('/reports/low-stock', { params });
export const getDashboardSummary = (params = {}) =>
  api.get('/reports/dashboard-summary', { params });
export const getComprehensiveReport = (params = {}) =>
  api.get('/reports/comprehensive', { params });
