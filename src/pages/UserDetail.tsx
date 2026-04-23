import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import userService from '../services/userService';
import type { UpdateUserDTO } from '../services/userService';
import axios from 'axios';

const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = id !== 'new';

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'STUDENT',
    schoolId: ''
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isEdit && id) {
      fetchUser(id);
    }
  }, [isEdit, id]);

  const fetchUser = async (userId: string) => {
    try {
      const user = await userService.getUserById(userId);
      setFormData({
        email: user.email,
        password: '', // Şifreyi güvenlik için boş bırakıyoruz
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        schoolId: user.schoolId || ''
      });
    } catch {
      setError('Kullanıcı bilgileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (isEdit && id) {
        const updateData: UpdateUserDTO = {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
        };
        
        if (formData.password) {
          updateData.passwordHash = formData.password;
        }
        await userService.updateUser(id, updateData);
      } else {
        await userService.createUser({
          ...formData,
          passwordHash: formData.password
        });
      }
      navigate('/users');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Kaydedilirken bir hata oluştu.');
      } else {
        setError('Beklenmedik bir hata oluştu.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Yükleniyor...</div>;

  return (
    <div className="user-detail-page">
      <div className="page-header">
        <h1>{isEdit ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı Ekle'}</h1>
        <button onClick={() => navigate('/users')} className="btn">Geri Dön</button>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-grid">
            <div className="form-group">
              <label>Ad</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Soyad</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>E-posta</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Şifre {isEdit && '(Değiştirmek istemiyorsanız boş bırakın)'}</label>
              <input
                type="password"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                required={!isEdit}
              />
            </div>

            <div className="form-group">
              <label>Rol</label>
              <select
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="ADMIN">Admin</option>
                <option value="TEACHER">Öğretmen</option>
                <option value="STUDENT">Öğrenci</option>
                <option value="PARENT">Veli</option>
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserDetail;
