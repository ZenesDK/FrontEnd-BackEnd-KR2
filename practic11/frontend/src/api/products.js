import apiClient from './index';

export const getProducts = () => apiClient.get('/products');

export const getProduct = (id) => apiClient.get(`/products/${id}`);

export const createProduct = (formData) => apiClient.post('/products', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

export const updateProduct = (id, formData) => apiClient.put(`/products/${id}`, formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

export const deleteProduct = (id) => apiClient.delete(`/products/${id}`);