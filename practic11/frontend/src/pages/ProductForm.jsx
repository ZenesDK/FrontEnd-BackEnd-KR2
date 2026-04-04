import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getProduct, createProduct, updateProduct } from '../api/products';

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [form, setForm] = useState({ 
    title: '', 
    category: '', 
    description: '', 
    price: '',
    image: null
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
      setForm({
        title: response.data.title,
        category: response.data.category,
        description: response.data.description,
        price: response.data.price,
        image: null
      });
      if (response.data.imageUrl) {
        setImagePreview(response.data.imageUrl);
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка загрузки товара');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm({ ...form, image: file });
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('category', form.category);
      formData.append('description', form.description);
      formData.append('price', form.price);
      if (form.image) {
        formData.append('image', form.image);
      }
      
      if (id) {
        await updateProduct(id, formData);
        alert('Товар обновлён');
      } else {
        await createProduct(formData);
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
      
      <form onSubmit={handleSubmit} className="product-form" encType="multipart/form-data">
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
        
        <div className="image-upload">
          <label className="image-upload__label">
            <span>📷 Выберите изображение</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              disabled={loading}
              className="image-upload__input"
            />
          </label>
          
          {imagePreview && (
            <div className="image-preview">
              <img src={imagePreview} alt="Предпросмотр" />
              <button 
                type="button"
                className="image-preview__remove"
                onClick={() => {
                  setImagePreview(null);
                  setForm({ ...form, image: null });
                }}
              >
                ✕
              </button>
            </div>
          )}
        </div>
        
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