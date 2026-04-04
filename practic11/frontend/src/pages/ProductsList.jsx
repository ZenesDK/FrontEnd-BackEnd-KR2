import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { getProducts, deleteProduct } from '../api/products';

export default function ProductsList() {
  const [products, setProducts] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [imageErrors, setImageErrors] = useState({});
  const navigate = useNavigate();

  const updateRole = () => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        const role = decoded.role;
        localStorage.setItem('userRole', role);
        setUserRole(role);
      } catch (err) {
        console.error('Ошибка декодирования токена:', err);
      }
    }
  };

  useEffect(() => {
    updateRole();
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await getProducts();
      setProducts(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Удалить товар?')) {
      try {
        await deleteProduct(id);
        fetchProducts();
      } catch (err) {
        console.error(err);
        alert('Ошибка удаления товара');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  const toggleDescription = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleImageError = (productId) => {
    setImageErrors(prev => ({ ...prev, [productId]: true }));
  };

  const isAdmin = userRole === 'admin';
  const isSeller = userRole === 'seller' || isAdmin;

  if (userRole === null) {
    return (
      <div className="container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header-with-logout">
        <h2>Мир чая</h2>
        <div>
          <span className="user-role-badge">
            {userRole === 'admin' ? 'Администратор' : userRole === 'seller' ? 'Продавец' : 'Пользователь'}
          </span>
          <button onClick={handleLogout} className="btn-logout">Выйти</button>
        </div>
      </div>
      
      <div className="toolbar">
        {isSeller && (
          <Link to="/products/new" className="btn-primary">Добавить товар</Link>
        )}
        {isAdmin && (
          <Link to="/users" className="btn-admin">Управление пользователями</Link>
        )}
      </div>
      
      {products.length === 0 ? (
        <div className="empty">
          <p>Нет товаров. {isSeller && 'Нажмите "Добавить товар" чтобы создать первый.'}</p>
        </div>
      ) : (
        <div className="products-grid">
          {products.map((p) => (
            <div key={p.id} className="product-card">
              {/* Изображение товара */}
              {p.imageUrl && !imageErrors[p.id] && (
                <div className="product-image">
                  <img 
                    src={`http://localhost:3000${p.imageUrl}`} 
                    alt={p.title}
                    onError={() => handleImageError(p.id)}
                    loading="lazy"
                  />
                </div>
              )}
              
              {/* Заглушка если нет изображения или ошибка загрузки */}
              {(!p.imageUrl || imageErrors[p.id]) && (
                <div className="product-image product-image--placeholder">
                  <span></span>
                  <span>Нет изображения</span>
                </div>
              )}
              
              <div className="product-card-header">
                <h3 className="product-title">{p.title}</h3>
                <span className="product-category">{p.category}</span>
              </div>
              
              <div className="product-price">
                {p.price.toLocaleString()} ₽
              </div>
              
              <div className="product-description">
                <p className={expandedId === p.id ? 'expanded' : 'collapsed'}>
                  {p.description}
                </p>
                {p.description && p.description.length > 100 && (
                  <button 
                    className="toggle-description"
                    onClick={() => toggleDescription(p.id)}
                  >
                    {expandedId === p.id ? 'Свернуть' : 'Читать далее'}
                  </button>
                )}
              </div>
              
              <div className="product-card-actions">
                {isSeller && (
                  <Link to={`/products/${p.id}/edit`} className="btn-edit" title="Редактировать">
                    Редактировать
                  </Link>
                )}
                {isAdmin && (
                  <button onClick={() => handleDelete(p.id)} className="btn-delete" title="Удалить">
                    Удалить
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}