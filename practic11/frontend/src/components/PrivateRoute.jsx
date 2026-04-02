import { Navigate } from 'react-router-dom';

export default function PrivateRoute({ children }) {
  const token = localStorage.getItem('accessToken');
  
  // Добавим логирование для отладки
  console.log('PrivateRoute check - token exists:', !!token);
  
  if (!token) {
    console.log('No token, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  return children;
}