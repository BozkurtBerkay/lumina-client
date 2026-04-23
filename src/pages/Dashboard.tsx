import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import api from '../services/api';

interface Grade {
  id: string;
  name: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  gradeId: string;
}

const Dashboard = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCourse, setNewCourse] = useState({
    title: '',
    description: '',
    gradeId: ''
  });

  const fetchCoursesAndGrades = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: coursesData }, { data: gradesData }] = await Promise.all([
        api.get('/courses'),
        api.get('/grades')
      ]);
      setCourses(coursesData);
      setGrades(gradesData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoursesAndGrades();
  }, [fetchCoursesAndGrades]);

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setNewCourse({ title: '', description: '', gradeId: '' });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        // Update
        const payload = { title: newCourse.title, description: newCourse.description };
        await api.put(`/courses/${editingId}`, payload);
      } else {
        // Create
        if (!newCourse.gradeId) {
          alert('Lütfen bir sınıf (grade) seçiniz.');
          return;
        }
        await api.post('/courses', newCourse);
      }
      resetForm();
      fetchCoursesAndGrades();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const details = err.response?.data?.details;
        if (details && Array.isArray(details)) {
          alert(`Doğrulama Hatası: ${details.map((d: { message: string }) => d.message).join(', ')}`);
        } else {
          console.error(err);
          alert('Ders kaydedilirken hata oluştu.');
        }
      } else {
        console.error(err);
        alert('Beklenmedik bir hata oluştu.');
      }
    }
  };

  const handleEdit = (course: Course) => {
    setNewCourse({
      title: course.title,
      description: course.description || '',
      gradeId: course.gradeId
    });
    setEditingId(course.id);
    setIsAdding(true);
  };

  const handleDelete = async (courseId: string) => {
    if (!window.confirm('Bu dersi silmek istediğinize emin misiniz? Tüm ünite ve sorular silinecektir!')) return;
    try {
      await api.delete(`/courses/${courseId}`);
      fetchCoursesAndGrades();
    } catch (err) {
      console.error(err);
      alert('Ders silinemedi.');
    }
  };

  if (loading && courses.length === 0) return <div>Yükleniyor...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Tüm Dersler</h1>
        {!isAdding && (
          <button className="btn btn-primary" onClick={() => setIsAdding(true)}>+ Yeni Ders Ekle</button>
        )}
      </div>

      <div style={{ marginBottom: '2rem' }}>
        {isAdding && (
          <div className="card">
            <h3>{editingId ? 'Dersi Düzenle' : 'Yeni Ders Ekle'}</h3>
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label>Ders Adı</label>
                  <input 
                    type="text" 
                    value={newCourse.title} 
                    onChange={e => setNewCourse({...newCourse, title: e.target.value})} 
                    required 
                  />
                </div>
                {!editingId && (
                  <div>
                    <label>Sınıf (Grade)</label>
                    <select 
                      value={newCourse.gradeId} 
                      onChange={e => setNewCourse({...newCourse, gradeId: e.target.value})}
                      required
                      style={{ width: '100%', backgroundColor: 'var(--card-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '4px', height: '42px', padding: '0 10px' }}
                    >
                      <option value="">Seçiniz...</option>
                      {grades.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '10px' }}>
                <label>Açıklama</label>
                <textarea 
                  value={newCourse.description} 
                  onChange={e => setNewCourse({...newCourse, description: e.target.value})} 
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
              <th>Ders Adı</th>
              <th>Açıklama</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course.id}>
                <td style={{ fontWeight: 'bold' }}>{course.title}</td>
                <td style={{ color: 'var(--text-muted)' }}>{course.description}</td>
                <td>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <Link to={`/course/${course.id}`} style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 'bold' }}>
                      Detaylar
                    </Link>
                    <button 
                      onClick={() => handleEdit(course)} 
                      style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Düzenle
                    </button>
                    <button 
                      onClick={() => handleDelete(course.id)} 
                      style={{ background: 'none', border: 'none', color: 'var(--error-color)', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Sil
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

export default Dashboard;
