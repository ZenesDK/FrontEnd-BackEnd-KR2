import apiClient from './index';

export const getProducts = () => apiClient.get('/products');
export const getProduct = (id) => apiClient.get(`/products/${id}`);
export const createProduct = (product) => apiClient.post('/products', product);
export const updateProduct = (id, product) => apiClient.put(`/products/${id}`, product);
export const deleteProduct = (id) => apiClient.delete(`/products/${id}`);