import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import userService from '../services/userService';
import type { User } from '../services/userService';

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await userService.getAllUsers();
      setUsers(data);
    } catch (err: any) {
      setError('Kullanıcılar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) {
      try {
        await userService.deleteUser(id);
        setUsers(users.filter(u => u.id !== id));
      } catch (err: any) {
        alert('Kullanıcı silinirken bir hata oluştu.');
      }
    }
  };

  if (loading) return <div className="loading">Yükleniyor...</div>;

  return (
    <div className="users-page">
      <div className="page-header">
        <h1>Kullanıcı Yönetimi</h1>
        <Link to="/users/new" className="btn btn-primary">Yeni Kullanıcı Ekle</Link>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Ad Soyad</th>
              <th>E-posta</th>
              <th>Rol</th>
              <th>Olusturulma</th>
              <th>Aksiyonlar</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.firstName} {user.lastName}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge ${user.role.toLowerCase()}`}>
                    {user.role}
                  </span>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString('tr-TR')}</td>
                <td>
                  <div className="actions">
                    <Link to={`/users/${user.id}`} className="btn-icon edit" title="Düzenle">✏️</Link>
                    <button onClick={() => handleDelete(user.id)} className="btn-icon delete" title="Sil">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;
