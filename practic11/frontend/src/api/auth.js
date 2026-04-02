import apiClient from './index';

export const register = (userData) => apiClient.post('/auth/register', userData);
export const login = (credentials) => apiClient.post('/auth/login', credentials);
export const getCurrentUser = () => apiClient.get('/auth/me');