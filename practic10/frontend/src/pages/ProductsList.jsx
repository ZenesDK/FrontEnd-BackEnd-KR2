import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProducts, deleteProduct } from '../api/products';

export default function ProductsList() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
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
      await deleteProduct(id);
      fetchProducts();
    }
  };

  return (
    <div className="container">
      <h2>Товары</h2>
      <Link to="/products/new">➕ Добавить товар</Link>
      <ul>
        {products.map((p) => (
          <li key={p.id}>
            <Link to={`/products/${p.id}`}>{p.title}</Link> {p.price} руб.
            <button onClick={() => handleDelete(p.id)}>Удалить</button>
          </li>
        ))}
      </ul>
    </div>
  );
}