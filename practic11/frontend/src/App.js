import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import Login from './pages/Login';
import Register from './pages/Register';
import ProductsList from './pages/ProductsList';
import ProductForm from './pages/ProductForm';
import UsersList from './pages/UsersList';
import PrivateRoute from './components/PrivateRoute';
import RoleBasedRoute from './components/RoleBasedRoute';
import './App.css';

function App() {
  // Функция обновления роли из токена
  const updateRoleFromToken = () => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const currentRole = localStorage.getItem('userRole');
        if (currentRole !== decoded.role) {
          console.log(`Роль обновлена: ${currentRole} → ${decoded.role}`);
          localStorage.setItem('userRole', decoded.role);
        }
        return decoded.role;
      } catch (err) {
        console.error('Invalid token:', err);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userRole');
      }
    }
    return null;
  };

  // Обновляем роль при загрузке приложения
  useEffect(() => {
    updateRoleFromToken();
  }, []);

  return (
    <BrowserRouter>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/products" element={
            <PrivateRoute>
              <ProductsList />
            </PrivateRoute>
          } />
          
          <Route path="/products/new" element={
            <RoleBasedRoute allowedRoles={['seller', 'admin']}>
              <ProductForm />
            </RoleBasedRoute>
          } />
          
          <Route path="/products/:id" element={
            <PrivateRoute>
              <ProductForm />
            </PrivateRoute>
          } />
          
          <Route path="/products/:id/edit" element={
            <RoleBasedRoute allowedRoles={['seller', 'admin']}>
              <ProductForm />
            </RoleBasedRoute>
          } />
          
          <Route path="/users" element={
            <RoleBasedRoute allowedRoles={['admin']}>
              <UsersList />
            </RoleBasedRoute>
          } />
          
          <Route path="/" element={<Navigate to="/products" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;