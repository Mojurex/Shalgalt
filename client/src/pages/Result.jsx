import { useState, useEffect } from 'react';

export default function Result({ testId, onHome }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const res = await fetch(`/api/tests/${testId}/result`);
        const data = await res.json();
        setResult(data);
      } catch (err) {
        console.error('Result fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchResult();
  }, [testId]);

  if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}>Ачаалж байна...</div>;
  if (!result) return <div style={{ textAlign: 'center', padding: '40px' }}>Үр дүн олдсонгүй</div>;

  const isSAT = (result.exam_type || 'placement').toLowerCase() === 'sat';

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 20px' }}>
      <main className="container" style={{ maxWidth: '600px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '32px', marginBottom: '12px', color: '#6366ea' }}>{result.level}</h2>
          <p style={{ fontSize: '18px', color: '#6b7280', marginBottom: '24px' }}>Түвшний үр дүн</p>

          {isSAT ? (
            <>
              <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
                <p style={{ color: '#6b7280', marginBottom: '8px' }}>SAT оноо</p>
                <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#6366ea' }}>{result.score} / 800</p>
                <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>200 - 800 шатлалаар</p>
              </div>
              <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '20px', borderRadius: '8px' }}>
                <p style={{ color: '#6b7280', marginBottom: '8px' }}>Зөв хариулт</p>
                <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#6366ea' }}>{result.score_raw} / {result.total_questions}</p>
              </div>
            </>
          ) : (
            <>
              <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
                <p style={{ color: '#6b7280', marginBottom: '8px' }}>Нийт оноо</p>
                <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#6366ea' }}>{result.score} / 30</p>
              </div>
            </>
          )}

          <div style={{ marginTop: '32px' }}>
            <button className="primary" onClick={onHome} style={{ width: '100%', padding: '12px' }}>Эхлэл рүү буцах</button>
          </div>
        </div>

        <section style={{ background: '#fff', padding: '24px', borderRadius: '8px', marginTop: '24px', textAlign: 'center', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎓</div>
          <h3>Та манай сургалтын талаар дэлгэрэнгүй мэдээлэл авахыг хүсч байна уу?</h3>
          <p style={{ color: '#6b7280', margin: '12px 0' }}>Мэргэжлийн багштай холбогдож, өөрт тохирсон сургалтын талаарх лавлагааг аваарай.</p>
          <a href="https://www.facebook.com/indra.cyber.school" target="_blank" rel="noopener" className="primary" style={{ display: 'inline-block', padding: '12px 32px', textDecoration: 'none', color: 'white' }}>
            ✨ ЭНД ДАРААД МЭДЭЭЛЭЛ АВААРАЙ ✨
          </a>
        </section>
      </main>
    </div>
  );
}
