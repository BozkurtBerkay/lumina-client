import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import api from '../services/api';

interface Course {
  id: string;
  title: string;
}

interface Unit {
  id: string;
  title: string;
  description: string;
  orderIndex: number;
}

const CourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newUnit, setNewUnit] = useState({
    title: '',
    description: '',
    orderIndex: 0
  });

  const fetchCourseAndUnits = useCallback(async () => {
    setLoading(true);
    try {
      const [courseRes, unitsRes] = await Promise.all([
        api.get(`/courses/${id}`),
        api.get(`/units?courseId=${id}`)
      ]);
      setCourse(courseRes.data);
      setUnits(unitsRes.data);
    } catch (err) {
      console.error('Error fetching course details:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCourseAndUnits();
  }, [fetchCourseAndUnits]);

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setNewUnit({ title: '', description: '', orderIndex: units.length });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...newUnit,
        courseId: id
      };

      if (editingId) {
        await api.put(`/units/${editingId}`, payload);
      } else {
        await api.post('/units', payload);
      }

      resetForm();
      fetchCourseAndUnits();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const details = err.response?.data?.details;
        if (details && Array.isArray(details)) {
          alert(`Doğrulama Hatası: ${details.map((d: { message: string }) => d.message).join(', ')}`);
        } else {
          console.error(err);
          alert('Ünite kaydedilirken hata oluştu.');
        }
      } else {
        console.error(err);
        alert('Beklenmedik bir hata oluştu.');
      }
    }
  };

  const handleEdit = (unit: Unit) => {
    setNewUnit({
      title: unit.title,
      description: unit.description || '',
      orderIndex: unit.orderIndex
    });
    setEditingId(unit.id);
    setIsAdding(true);
  };

  const handleDelete = async (unitId: string) => {
    if (!window.confirm('Bu üniteyi silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/units/${unitId}`);
      fetchCourseAndUnits();
    } catch (err) {
      console.error(err);
      alert('Ünite silinemedi.');
    }
  };

  const handleDownloadResults = async (unitId: string, unitTitle: string) => {
    try {
      const response = await api.get(`/results/export/${unitId}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${unitTitle}-sonuclari.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error downloading results:', err);
      alert('Sonuçlar indirilemedi.');
    }
  };

  if (loading && units.length === 0) return <div>Yükleniyor...</div>;
  if (!course) return <div>Ders bulunamadı.</div>;

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>← Geri Dön</Link>
        <h1 style={{ marginTop: '1rem' }}>{course.title} — Üniteler</h1>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        {!isAdding ? (
          <button className="btn btn-primary" onClick={() => setIsAdding(true)}>+ Yeni Ünite Ekle</button>
        ) : (
          <div className="card">
            <h3>{editingId ? 'Üniteyi Düzenle' : 'Yeni Ünite Ekle'}</h3>
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                <div>
                  <label>Ünite Başlığı</label>
                  <input 
                    type="text" 
                    value={newUnit.title} 
                    onChange={e => setNewUnit({...newUnit, title: e.target.value})} 
                    required 
                  />
                </div>
                <div>
                  <label>Sıralama (Order)</label>
                  <input 
                    type="number" 
                    value={newUnit.orderIndex} 
                    onChange={e => setNewUnit({...newUnit, orderIndex: parseInt(e.target.value) || 0})} 
                  />
                </div>
              </div>

              <div style={{ marginTop: '10px' }}>
                <label>Açıklama</label>
                <textarea 
                  value={newUnit.description} 
                  onChange={e => setNewUnit({...newUnit, description: e.target.value})} 
                  style={{ height: '80px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className="btn btn-primary">{editingId ? 'Güncelle' : 'Kaydet'}</button>
                <button type="button" className="btn" onClick={resetForm}>İptal</button>
              </div>
            </form>
          </div>
        )}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Sıra</th>
              <th>Ünite Başlığı</th>
              <th>Açıklama</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {units.sort((a,b) => a.orderIndex - b.orderIndex).map((unit) => (
              <tr key={unit.id}>
                <td>{unit.orderIndex}</td>
                <td style={{ fontWeight: 'bold' }}>{unit.title}</td>
                <td style={{ color: 'var(--text-muted)' }}>{unit.description}</td>
                <td>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <Link to={`/unit/${unit.id}`} style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 'bold' }}>
                      Soruları Yönet
                    </Link>
                    <button 
                      onClick={() => handleEdit(unit)} 
                      style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Düzenle
                    </button>
                    <button 
                      onClick={() => handleDelete(unit.id)} 
                      style={{ background: 'none', border: 'none', color: 'var(--error-color)', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Sil
                    </button>
                    <button 
                      onClick={() => handleDownloadResults(unit.id, unit.title)}
                      style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontWeight: 'bold' }}
                      title="Sonuçları İndir (CSV)"
                    >
                      📥 Sonuçlar
                    </button>
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

export default CourseDetail;
