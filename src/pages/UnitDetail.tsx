import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import api from '../services/api';

interface Question {
  id: string;
  content: string;
  type: string;
  imageUrl: string | null;
  imageAlt: string | null;
  options: Record<string, string> | null;
  correctAnswer: string;
}


const UnitDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [unitTitle, setUnitTitle] = useState('');
  const [courseId, setCourseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newQuestion, setNewQuestion] = useState({
    content: '',
    type: 'MULTIPLE_CHOICE',
    imageUrl: '',
    imageAlt: '',
    options: ['', '', '', ''],
    correctAnswer: ''
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: questionsData }, { data: unitData }] = await Promise.all([
        api.get(`/questions?unitId=${id}`),
        api.get(`/units/${id}`)
      ]);
      setQuestions(questionsData);
      setUnitTitle(unitData.title);
      setCourseId(unitData.courseId);
    } catch (err: unknown) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setNewQuestion({
      content: '',
      type: 'MULTIPLE_CHOICE',
      imageUrl: '',
      imageAlt: '',
      options: ['', '', '', ''],
      correctAnswer: ''
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let formattedOptions = null;
      if (newQuestion.type === 'MULTIPLE_CHOICE') {
        formattedOptions = {
          A: newQuestion.options[0],
          B: newQuestion.options[1],
          C: newQuestion.options[2],
          D: newQuestion.options[3]
        };
      }

      const payload = {
        ...newQuestion,
        unitId: id,
        options: formattedOptions
      };


      if (editingId) {
        await api.put(`/questions/${editingId}`, payload);
      } else {
        await api.post('/questions', payload);
      }

      resetForm();
      fetchData();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const details = err.response?.data?.details;
        if (Array.isArray(details)) {
          alert(`Doğrulama Hatası: ${details.map((d: { message: string }) => d.message).join(', ')}`);
        } else {
          console.error('Save error:', err);
          alert('Soru kaydedilirken hata oluştu.');
        }
      } else {
        console.error('Unexpected error:', err);
        alert('Beklenmeyen bir hata oluştu.');
      }
    }
  };

  const handleEdit = (q: Question) => {
    let optionsArray = ['', '', '', ''];
    if (q.options) {
      optionsArray = [
        q.options.A || '',
        q.options.B || '',
        q.options.C || '',
        q.options.D || ''
      ];
    }

    setNewQuestion({
      content: q.content,
      type: q.type,
      imageUrl: q.imageUrl || '',
      imageAlt: q.imageAlt || '',
      options: optionsArray,
      correctAnswer: q.correctAnswer || '' 
    });
    setEditingId(q.id);
    setIsAdding(true);
  };


  const handleDelete = async (qId: string) => {
    if (!window.confirm('Bu soruyu silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/questions/${qId}`);
      fetchData();
    } catch (err: unknown) {
      console.error('Delete error:', err);
      alert('Soru silinemedi.');
    }
  };

  if (loading && questions.length === 0) return <div>Yükleniyor...</div>;

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <Link to={courseId ? `/course/${courseId}` : '/'} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
          ← Ünitelere Dön
        </Link>
        <h1 style={{ marginTop: '1rem' }}>{unitTitle} — Sorular</h1>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        {!isAdding ? (
          <button className="btn btn-primary" onClick={() => setIsAdding(true)}>+ Yeni Soru Ekle</button>
        ) : (
          <div className="card">
            <h3>{editingId ? 'Soruyu Düzenle' : 'Yeni Soru Ekle'}</h3>
            <form onSubmit={handleSave}>
              <label>Soru Metni</label>
              <textarea 
                value={newQuestion.content} 
                onChange={e => setNewQuestion({...newQuestion, content: e.target.value})} 
                required 
                style={{ height: '100px' }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label>Soru Tipi</label>
                  <select value={newQuestion.type} onChange={e => setNewQuestion({...newQuestion, type: e.target.value})}>
                    <option value="MULTIPLE_CHOICE">Çoktan Seçmeli</option>
                    <option value="TRUE_FALSE">Doğru / Yanlış</option>
                    <option value="OPEN_ENDED">Açık Uçlu (Kaldırılmıştı ama sistemde olabilir)</option>
                  </select>
                </div>
                <div>
                  <label>Doğru Cevap</label>
                  <select 
                    value={newQuestion.correctAnswer} 
                    onChange={e => setNewQuestion({...newQuestion, correctAnswer: e.target.value})}
                    required
                  >
                    <option value="">Seçiniz...</option>
                    {newQuestion.type === 'MULTIPLE_CHOICE' ? (
                      <>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                        <option value="D">D</option>
                      </>
                    ) : (
                      <>
                        <option value="true">Doğru (True)</option>
                        <option value="false">Yanlış (False)</option>
                      </>
                    )}
                  </select>
                </div>

              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
                <div>
                  <label>Görsel URL (Opsiyonel)</label>
                  <input 
                    type="text" 
                    value={newQuestion.imageUrl} 
                    onChange={e => setNewQuestion({...newQuestion, imageUrl: e.target.value})} 
                    placeholder="https://-static.eodev.com/..."
                  />
                </div>
                <div>
                  <label>Görsel Betimlemesi (Görmeyen Öğrenciler İçin)</label>
                  <input 
                    type="text" 
                    value={newQuestion.imageAlt} 
                    onChange={e => setNewQuestion({...newQuestion, imageAlt: e.target.value})} 
                    placeholder="Resimde ne görünüyor? Detaylı anlatın."
                  />
                </div>
              </div>

              {newQuestion.type === 'MULTIPLE_CHOICE' && (
                <div style={{ marginTop: '20px' }}>
                  <label>Şıklar</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    {['A', 'B', 'C', 'D'].map((label, idx) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>{label}:</span>
                        <input 
                          type="text" 
                          value={newQuestion.options[idx]} 
                          onChange={e => {
                            const newOpts = [...newQuestion.options];
                            newOpts[idx] = e.target.value;
                            setNewQuestion({...newQuestion, options: newOpts});
                          }}
                          placeholder={`${label} Şıkkı`}
                          style={{ flex: 1 }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}


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
              <th>Görsel</th>
              <th>Soru</th>
              <th>Tip</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q) => (
              <tr key={q.id}>
                <td>
                  {q.imageUrl ? (
                    <img src={q.imageUrl} alt={q.imageAlt || ''} style={{ width: '80px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>Yok</span>
                  )}
                </td>
                <td>
                  <div style={{ fontWeight: 'bold' }}>{q.content}</div>
                  {q.imageAlt && <div style={{ fontSize: '0.8rem', color: 'var(--primary-color)', marginTop: '4px' }}>Betimleme: {q.imageAlt}</div>}
                </td>
                <td>{q.type}</td>
                <td>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      onClick={() => handleEdit(q)} 
                      style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Düzenle
                    </button>
                    <button 
                      onClick={() => handleDelete(q.id)} 
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

export default UnitDetail;
