import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { getUsers, updateUser, deleteUser } from '../api/users';
import apiClient from '../api/index';

export default function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setCurrentUserId(decoded.sub);
      } catch (err) {
        console.error(err);
      }
    }
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await getUsers();
      setUsers(response.data);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        handleForceLogout();
      } else {
        alert('Ошибка загрузки пользователей');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForceLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userRole');
    alert('Ваши права были изменены. Пожалуйста, войдите заново.');
    navigate('/login');
  };

  const handleBlockUser = async (id) => {
    if (window.confirm('Заблокировать пользователя?')) {
      try {
        await deleteUser(id);
        if (currentUserId === id) {
          handleForceLogout();
        } else {
          fetchUsers();
          alert('Пользователь заблокирован');
        }
      } catch (err) {
        alert('Ошибка блокировки пользователя');
      }
    }
  };

  const handleUnblockUser = async (id) => {
    if (window.confirm('Разблокировать пользователя?')) {
      try {
        await apiClient.patch(`/users/${id}/unblock`);
        fetchUsers();
        alert('Пользователь разблокирован');
      } catch (err) {
        console.error(err);
        alert('Ошибка разблокировки пользователя');
      }
    }
  };

  const handleRoleChange = async (id, newRole) => {
    try {
      await updateUser(id, { role: newRole });
      if (currentUserId === id) {
        handleForceLogout();
      } else {
        alert(`Роль пользователя изменена на "${newRole}"`);
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
      alert('Ошибка изменения роли');
    }
  };

  if (loading) return <div className="container">Загрузка...</div>;

  return (
    <div className="container">
      <div className="header-with-logout">
        <h2>Управление пользователями</h2>
        <button onClick={() => navigate('/products')} className="btn-back">← Назад к товарам</button>
      </div>
      
      <div className="table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Имя</th>
              <th>Фамилия</th>
              <th>Роль</th>
              <th>Статус</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isSelf = currentUserId === user.id;
              const isProtectedAdmin = user.email === 'admin@example.com';
              
              return (
                <tr key={user.id} className={isSelf ? 'current-user' : ''}>
                  <td>{user.email}</td>
                  <td>{user.first_name}</td>
                  <td>{user.last_name}</td>
                  <td>
                    <select 
                      value={user.role} 
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      disabled={isProtectedAdmin || isSelf}
                    >
                      <option value="user">Пользователь</option>
                      <option value="seller">Продавец</option>
                      <option value="admin">Администратор</option>
                    </select>
                    {isSelf && <span className="self-badge">(вы)</span>}
                  </td>
                  <td className={user.isBlocked ? 'blocked' : 'active'}>
                    {user.isBlocked ? 'Заблокирован' : 'Активен'}
                  </td>
                  <td>
                    {!user.isBlocked ? (
                      <button 
                        onClick={() => handleBlockUser(user.id)}
                        disabled={isProtectedAdmin || isSelf}
                        className="btn-block"
                      >
                        Заблокировать
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleUnblockUser(user.id)}
                        className="btn-unblock"
                      >
                        Разблокировать
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="warning-note">
        ⚠️ <strong>Внимание:</strong>
        <ul>
          <li>При изменении своей роли или блокировке самого себя сессия завершится</li>
          <li>Разблокировка пользователя не требует перелогина</li>
        </ul>
      </div>
    </div>
  );
}