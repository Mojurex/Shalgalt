import { useState } from 'react';

export default function Home({ onStartTest, onAdminClick }) {
  const [form, setForm] = useState({ name: '', age: '', email: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.age || !form.email || !form.phone) {
      setError('Бүх талбарыг бөглөнө үү');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('User creation failed');
      const user = await res.json();
      onStartTest(user.id, 'placement');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSAT = async (e) => {
    e.preventDefault();
    if (!form.name || !form.age || !form.email || !form.phone) {
      setError('Бүх талбарыг бөглөнө үү');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('User creation failed');
      const user = await res.json();
      onStartTest(user.id, 'sat');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '20px' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '24px' }}>🎓 Англи хэлний түвшин</h1>
          <button className="secondary" onClick={onAdminClick} style={{ padding: '8px 16px' }}>Админ</button>
        </div>
      </header>

      <main className="container" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="card" style={{ maxWidth: '500px', width: '100%' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>Хэрэглэгчийн мэдээлэл</h2>

          {error && <div style={{ color: '#dc2626', marginBottom: '12px', padding: '12px', background: '#fee2e2', borderRadius: '6px' }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <input type="text" name="name" placeholder="Нэр" value={form.name} onChange={handleChange} required />
            <input type="number" name="age" placeholder="Нас" value={form.age} onChange={handleChange} required />
            <input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} required />
            <input type="tel" name="phone" placeholder="Утас" value={form.phone} onChange={handleChange} required />

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className="primary" disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Ачаалж байна...' : 'Placement тест'}
              </button>
              <button type="button" onClick={handleSAT} className="primary" disabled={loading} style={{ flex: 1 }}>
                {loading ? 'Ачаалж байна...' : 'SAT тест'}
              </button>
            </div>
          </form>

          <p style={{ textAlign: 'center', marginTop: '16px', color: '#6b7280', fontSize: '14px' }}>
            Мэдээлэл дутуу бол дээр анхааруулга гарна.
          </p>
        </div>
      </main>
    </div>
  );
}
