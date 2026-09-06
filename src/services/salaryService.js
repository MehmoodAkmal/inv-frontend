import api from './api';

export const recordSalaryPayment = (data) => api.post('/salary', data);
export const getSalaryPayments = (params = {}) => api.get('/salary', { params });
