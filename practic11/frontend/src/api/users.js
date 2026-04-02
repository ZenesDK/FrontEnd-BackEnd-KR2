import apiClient from './index';

export const getUsers = () => apiClient.get('/users');
export const getUser = (id) => apiClient.get(`/users/${id}`);
export const updateUser = (id, userData) => apiClient.put(`/users/${id}`, userData);
export const deleteUser = (id) => apiClient.delete(`/users/${id}`);