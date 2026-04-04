import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getProduct, createProduct, updateProduct } from '../api/products';

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ 
    title: '', 
    category: '', 
    description: '', 
    price: '' 
  });

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await getProduct(id);
      setForm(response.data);
    } catch (err) {
      console.error(err);
      alert('Ошибка загрузки товара');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (id) {
        await updateProduct(id, form);
        alert('Товар обновлён');
      } else {
        await createProduct(form);
        alert('Товар создан');
      }
      navigate('/products');
    } catch (err) {
      console.error(err);
      alert('Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h2>{id ? 'Редактировать товар' : 'Новый товар'}</h2>
      
      <form onSubmit={handleSubmit} className="product-form">
        <input
          type="text"
          placeholder="Название"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
          disabled={loading}
        />
        
        <input
          type="text"
          placeholder="Категория"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          required
          disabled={loading}
        />
        
        <textarea
          placeholder="Описание"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
          disabled={loading}
        />
        
        <input
          type="number"
          placeholder="Цена"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          required
          disabled={loading}
        />
        
        <div className="form-buttons">
          <button type="submit" className="form-btn form-btn--submit" disabled={loading}>
            {loading ? 'Сохранение...' : 'Сохранить'}
          </button>
          <button 
            type="button" 
            className="form-btn form-btn--cancel"
            onClick={() => navigate('/products')}
            disabled={loading}
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}