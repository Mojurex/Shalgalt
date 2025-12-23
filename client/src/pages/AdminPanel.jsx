import { useState, useEffect } from 'react';

export default function AdminPanel({ onBack }) {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersRes, statsRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/stats')
        ]);
        setUsers(await usersRes.json());
        setStats(await statsRes.json());
      } catch (err) {
        console.error('Admin load failed:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}>Ачаалж байна...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '20px' }}>
      <div className="container">
        <h1 style={{ marginBottom: '24px' }}>Админ Панел</h1>

        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Нийт тест</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366ea' }}>{stats.total}</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#6b7280' }}>Дундаж оноо</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6366ea' }}>{stats.avgScore}</div>
            </div>
          </div>
        )}

        <div className="card">
          <h2>Хэрэглэгчид</h2>
          {users.length === 0 ? (
            <p style={{ color: '#6b7280' }}>Хэрэглэгч олдсонгүй</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ textAlign: 'left', padding: '12px' }}>Нэр</th>
                    <th style={{ textAlign: 'left', padding: '12px' }}>Email</th>
                    <th style={{ textAlign: 'left', padding: '12px' }}>Утас</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px' }}>{u.name}</td>
                      <td style={{ padding: '12px' }}>{u.email}</td>
                      <td style={{ padding: '12px' }}>{u.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <button className="secondary" onClick={onBack} style={{ marginTop: '24px' }}>Буцах</button>
      </div>
    </div>
  );
}
