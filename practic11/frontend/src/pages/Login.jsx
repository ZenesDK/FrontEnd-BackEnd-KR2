import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api/auth';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const response = await login(form);
      const { accessToken, refreshToken } = response.data;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      const decoded = JSON.parse(atob(accessToken.split('.')[1]));
      localStorage.setItem('userRole', decoded.role);
      
      console.log('Успешный вход. Роль:', decoded.role);
      
      navigate('/products');
    } catch (err) {
      console.error('Ошибка входа:', err);
      setError(err.response?.data?.error || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="auth-card">
        <h2>Вход</h2>
        
        {error && <div className="error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            disabled={loading}
          />
          
          <input
            type="password"
            placeholder="Пароль"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            disabled={loading}
          />
          
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
        
        <div className="auth-footer">
          <span className="auth-footer__text">Нет аккаунта?</span>
          <Link to="/register" className="auth-footer__link">Зарегистрироваться</Link>
        </div>
      </div>
    </div>
  );
}