import { Navigate } from 'react-router-dom';

export default function RoleBasedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('accessToken');
  const userRole = localStorage.getItem('userRole');
  
  if (!token) {
    return <Navigate to="/login" />;
  }
  
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/products" />;
  }
  
  return children;
}