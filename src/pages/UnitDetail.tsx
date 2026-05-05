import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import api from '../services/api';

// --- Types ---

interface QuestionOption {
  text: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
}

// Geriye dönük uyumluluk: eski format düz string, yeni format nesne
type OptionValue = string | QuestionOption;

interface Question {
  id: string;
  content: string;
  type: string;
  imageUrl: string | null;
  imageAlt: string | null;
  options: Record<string, OptionValue> | null;
  correctAnswer: string;
  orderIndex: number;
}

/** Hem düz string hem nesne formatını normalize eder */
const normalizeOption = (val: OptionValue): QuestionOption => {
  if (typeof val === 'string') return { text: val, imageUrl: null, imageAlt: null };
  return { text: val.text ?? '', imageUrl: val.imageUrl ?? null, imageAlt: val.imageAlt ?? null };
};

// --- Form State Types ---

interface OptionFormState {
  text: string;
  imageUrl: string;
  imageAlt: string;
}

const emptyOption = (): OptionFormState => ({ text: '', imageUrl: '', imageAlt: '' });

interface FormState {
  content: string;
  type: string;
  imageUrl: string;
  imageAlt: string;
  options: OptionFormState[]; // [A, B, C, D]
  correctAnswer: string;
}

const defaultForm = (): FormState => ({
  content: '',
  type: 'MULTIPLE_CHOICE',
  imageUrl: '',
  imageAlt: '',
  options: [emptyOption(), emptyOption(), emptyOption(), emptyOption()],
  correctAnswer: '',
});

// --- Component ---

const UnitDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [unitTitle, setUnitTitle] = useState('');
  const [courseId, setCourseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm());

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

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setForm(defaultForm());
  };

  // --- Form helpers ---

  const updateOption = (idx: number, field: keyof OptionFormState, value: string) => {
    const updated = [...form.options];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm({ ...form, options: updated });
  };

  /** Formdaki şıkları API'nin beklediği formata çevirir */
  const buildOptionsPayload = () => {
    if (form.type !== 'MULTIPLE_CHOICE') return null;
    const result: Record<string, OptionValue> = {};
    ['A', 'B', 'C', 'D'].forEach((key, idx) => {
      const opt = form.options[idx];
      const hasImage = opt.imageUrl.trim() !== '';
      // Görsel varsa zengin nesne, yoksa düz metin
      result[key] = hasImage
        ? { text: opt.text, imageUrl: opt.imageUrl.trim() || null, imageAlt: opt.imageAlt.trim() || null }
        : opt.text;
    });
    return result;
  };

  // --- CRUD ---

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        content: form.content,
        type: form.type,
        imageUrl: form.imageUrl || undefined,
        imageAlt: form.imageAlt || undefined,
        correctAnswer: form.correctAnswer,
        options: buildOptionsPayload(),
        unitId: id,
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
          alert(err.response?.data?.error || 'Soru kaydedilirken hata oluştu.');
        }
      } else {
        alert('Beklenmeyen bir hata oluştu.');
      }
    }
  };

  const handleEdit = (q: Question) => {
    const optionsArr: OptionFormState[] = ['A', 'B', 'C', 'D'].map(key => {
      if (!q.options || !q.options[key]) return emptyOption();
      const norm = normalizeOption(q.options[key]);
      return {
        text: norm.text,
        imageUrl: norm.imageUrl ?? '',
        imageAlt: norm.imageAlt ?? '',
      };
    });

    setForm({
      content: q.content,
      type: q.type,
      imageUrl: q.imageUrl ?? '',
      imageAlt: q.imageAlt ?? '',
      options: optionsArr,
      correctAnswer: q.correctAnswer ?? '',
    });
    setEditingId(q.id);
    setIsAdding(true);
  };

  const handleDelete = async (qId: string) => {
    if (!window.confirm('Bu soruyu silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/questions/${qId}`);
      fetchData();
    } catch {
      alert('Soru silinemedi.');
    }
  };

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newQuestions.length) return;

    [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
    const reordered = newQuestions.map((q, i) => ({ ...q, orderIndex: i }));
    setQuestions(reordered);

    try {
      setReordering(true);
      await api.patch('/questions/reorder', {
        questions: reordered.map(({ id: qId, orderIndex }) => ({ id: qId, orderIndex }))
      });
    } catch {
      alert('Sıralama kaydedilemedi.');
      fetchData();
    } finally {
      setReordering(false);
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

      {/* ====== FORM ====== */}
      <div style={{ marginBottom: '2rem' }}>
        {!isAdding ? (
          <button className="btn btn-primary" onClick={() => setIsAdding(true)}>+ Yeni Soru Ekle</button>
        ) : (
          <div className="card">
            <h3>{editingId ? 'Soruyu Düzenle' : 'Yeni Soru Ekle'}</h3>
            <form onSubmit={handleSave}>

              {/* Soru Metni */}
              <label>Soru Metni</label>
              <textarea
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                required
                style={{ height: '100px' }}
              />

              {/* Tip + Doğru Cevap */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label>Soru Tipi</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option value="MULTIPLE_CHOICE">Çoktan Seçmeli</option>
                    <option value="TRUE_FALSE">Doğru / Yanlış</option>
                    <option value="OPEN_ENDED">Açık Uçlu</option>
                  </select>
                </div>
                <div>
                  <label>Doğru Cevap</label>
                  <select
                    value={form.correctAnswer}
                    onChange={e => setForm({ ...form, correctAnswer: e.target.value })}
                    required
                  >
                    <option value="">Seçiniz...</option>
                    {form.type === 'MULTIPLE_CHOICE' ? (
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

              {/* Soru Görseli */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
                <div>
                  <label>Soru Görseli URL (Opsiyonel)</label>
                  <input
                    type="text"
                    value={form.imageUrl}
                    onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label>Soru Görseli Betimlemesi</label>
                  <input
                    type="text"
                    value={form.imageAlt}
                    onChange={e => setForm({ ...form, imageAlt: e.target.value })}
                    placeholder="Resimde ne görünüyor?"
                  />
                </div>
              </div>

              {/* Şıklar */}
              {form.type === 'MULTIPLE_CHOICE' && (
                <div style={{ marginTop: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '12px', fontWeight: 'bold' }}>Şıklar</label>
                  {['A', 'B', 'C', 'D'].map((key, idx) => (
                    <div
                      key={key}
                      style={{
                        background: 'var(--card-bg, rgba(255,255,255,0.03))',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '14px',
                        marginBottom: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <span style={{
                          fontWeight: 'bold',
                          color: 'var(--primary-color)',
                          fontSize: '1.1rem',
                          minWidth: '24px'
                        }}>
                          {key}
                        </span>
                        <input
                          type="text"
                          value={form.options[idx].text}
                          onChange={e => updateOption(idx, 'text', e.target.value)}
                          placeholder={`${key} şıkkının metni`}
                          style={{ flex: 1 }}
                        />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingLeft: '34px' }}>
                        <div>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Şık Görseli URL (Opsiyonel)
                          </label>
                          <input
                            type="text"
                            value={form.options[idx].imageUrl}
                            onChange={e => updateOption(idx, 'imageUrl', e.target.value)}
                            placeholder="https://..."
                            style={{ fontSize: '0.85rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Şık Görseli Betimlemesi
                          </label>
                          <input
                            type="text"
                            value={form.options[idx].imageAlt}
                            onChange={e => updateOption(idx, 'imageAlt', e.target.value)}
                            placeholder="Görseli açıklayın..."
                            style={{ fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>
                      {/* Görsel Önizleme */}
                      {form.options[idx].imageUrl && (
                        <div style={{ marginTop: '8px', paddingLeft: '34px' }}>
                          <img
                            src={form.options[idx].imageUrl}
                            alt={form.options[idx].imageAlt || key}
                            style={{ height: '60px', borderRadius: '6px', objectFit: 'cover' }}
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
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

      {/* ====== TABLO ====== */}
      <div className="card">
        {reordering && (
          <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Sıralama kaydediliyor...
          </div>
        )}
        <table>
          <thead>
            <tr>
              <th style={{ width: '80px' }}>Sıra</th>
              <th>Görsel</th>
              <th>Soru</th>
              <th>Şıklar</th>
              <th>Tip</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q, index) => (
              <tr key={q.id}>
                {/* Sıra + Butonlar */}
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      {index + 1}
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => handleReorder(index, 'up')}
                        disabled={index === 0 || reordering}
                        style={{
                          background: 'none', border: '1px solid var(--border-color)',
                          borderRadius: '4px', cursor: index === 0 ? 'not-allowed' : 'pointer',
                          padding: '2px 6px', opacity: index === 0 ? 0.3 : 1,
                          fontSize: '0.75rem', lineHeight: 1, color: 'var(--text-color)'
                        }}
                        title="Yukarı taşı"
                      >↑</button>
                      <button
                        onClick={() => handleReorder(index, 'down')}
                        disabled={index === questions.length - 1 || reordering}
                        style={{
                          background: 'none', border: '1px solid var(--border-color)',
                          borderRadius: '4px', cursor: index === questions.length - 1 ? 'not-allowed' : 'pointer',
                          padding: '2px 6px', opacity: index === questions.length - 1 ? 0.3 : 1,
                          fontSize: '0.75rem', lineHeight: 1, color: 'var(--text-color)'
                        }}
                        title="Aşağı taşı"
                      >↓</button>
                    </div>
                  </div>
                </td>

                {/* Soru Görseli */}
                <td>
                  {q.imageUrl ? (
                    <img src={q.imageUrl} alt={q.imageAlt || ''} style={{ width: '80px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                  )}
                </td>

                {/* Soru Metni */}
                <td>
                  <div style={{ fontWeight: 'bold' }}>{q.content}</div>
                  {q.imageAlt && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--primary-color)', marginTop: '4px' }}>
                      🔊 {q.imageAlt}
                    </div>
                  )}
                </td>

                {/* Şıklar Önizleme */}
                <td style={{ minWidth: '200px' }}>
                  {q.options ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {Object.entries(q.options).sort(([a], [b]) => a.localeCompare(b)).map(([key, val]) => {
                        const opt = normalizeOption(val);
                        const isCorrect = key === q.correctAnswer;
                        return (
                          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              fontWeight: 'bold',
                              color: isCorrect ? 'var(--success-color, #22c55e)' : 'var(--text-muted)',
                              minWidth: '18px', fontSize: '0.85rem'
                            }}>
                              {key}{isCorrect ? '✓' : ''}
                            </span>
                            {opt.imageUrl && (
                              <img
                                src={opt.imageUrl}
                                alt={opt.imageAlt || key}
                                style={{ width: '36px', height: '28px', borderRadius: '4px', objectFit: 'cover' }}
                              />
                            )}
                            <span style={{ fontSize: '0.82rem' }}>{opt.text}</span>
                            {opt.imageAlt && (
                              <span title={`Betimleme: ${opt.imageAlt}`} style={{ color: 'var(--primary-color)', fontSize: '0.75rem' }}>🔊</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                  )}
                </td>

                {/* Tip */}
                <td><span style={{ fontSize: '0.82rem' }}>{q.type}</span></td>

                {/* İşlemler */}
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
