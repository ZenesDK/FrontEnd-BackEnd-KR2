import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Функция обновления роли из токена
function updateRoleFromToken(token) {
  if (!token) return null;
  try {
    const decoded = JSON.parse(atob(token.split('.')[1]));
    localStorage.setItem('userRole', decoded.role);
    return decoded.role;
  } catch (err) {
    console.error('Error decoding token:', err);
    return null;
  }
}

// Перехватчик запросов: добавляем токен и обновляем роль
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      // Обновляем роль перед каждым запросом
      updateRoleFromToken(token);
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Перехватчик ответов: обрабатываем 401 и обновляем токен
apiClient.interceptors.response.use(
  (response) => {
    // При успешном обновлении токена обновляем роль
    if (response.config.url === '/auth/refresh' && response.data.accessToken) {
      updateRoleFromToken(response.data.accessToken);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userRole');
        window.location.href = '/login';
        return Promise.reject(error);
      }
      
      try {
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        
        // Обновляем роль из нового токена
        updateRoleFromToken(accessToken);
        
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userRole');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;