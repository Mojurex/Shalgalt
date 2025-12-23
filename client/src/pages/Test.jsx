import { useState, useEffect } from 'react';

export default function Test({ userId, examType, onFinish, onLogout }) {
  const [questions, setQuestions] = useState([]);
  const [page, setPage] = useState(1);
  const [selections, setSelections] = useState({});
  const [textAnswers, setTextAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(examType === 'sat' ? 70 * 60 : 60 * 60);
  const [loading, setLoading] = useState(true);
  const [testId, setTestId] = useState(null);

  useEffect(() => {
    const startTest = async () => {
      try {
        const res = await fetch('/api/tests/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, examType })
        });
        const test = await res.json();
        setTestId(test.id);
        localStorage.setItem('testId', test.id);

        const qRes = await fetch(`/api/tests/${test.id}/questions`);
        const qs = await qRes.json();
        setQuestions(qs);
        setLoading(false);
      } catch (err) {
        console.error('Test start failed:', err);
      }
    };
    startTest();
  }, [userId, examType]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(interval);
          handleFinish();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  const getPageSize = () => {
    if (examType === 'sat') {
      if (page === 1 || page === 2) return 10;
      if (page === 3) return 7;
      return 10;
    }
    return 10;
  };

  const getPageStart = () => {
    if (examType !== 'sat') return (page - 1) * 10;
    if (page === 1) return 0;
    if (page === 2) return 10;
    if (page === 3) return 20;
    return 27 + (page - 4) * 10;
  };

  const pageSize = getPageSize();
  const start = getPageStart();
  const pageQuestions = questions.slice(start, start + pageSize);

  const handleSaveAnswers = async () => {
    if (!testId) return;
    const answers = [];
    pageQuestions.forEach(q => {
      if (q.type === 'text') {
        const val = (textAnswers[q.id] || '').trim();
        if (val) answers.push({ questionId: q.id, textAnswer: val });
      } else {
        const si = selections[q.id];
        if (typeof si === 'number') {
          answers.push({ questionId: q.id, selectedIndex: si });
        }
      }
    });
    await fetch(`/api/tests/${testId}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers })
    });
  };

  const handleNext = async () => {
    await handleSaveAnswers();
    const totalPages = examType === 'sat' ? 6 : Math.ceil(questions.length / 10);
    if (page < totalPages) {
      setPage(page + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    if (!testId) return;
    await handleSaveAnswers();
    await fetch(`/api/tests/${testId}/finish-answers`, { method: 'POST' });
    await fetch(`/api/tests/${testId}/finish`, { method: 'POST' });
    onFinish(testId);
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '40px' }}>Ачаалж байна...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', paddingBottom: '40px' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Тест</h2>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: timeLeft < 300 ? '#dc2626' : '#333' }}>
              ⏱️ {formatTime(timeLeft)}
            </div>
            <button className="secondary" onClick={onLogout} style={{ padding: '6px 12px' }}>Гарах</button>
          </div>
        </div>
      </header>

      <main className="container">
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>Ахиц</span>
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{Math.round((start + pageSize) / questions.length * 100)}%</span>
          </div>
          <div style={{ background: '#e5e7eb', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              background: '#6366ea',
              height: '100%',
              width: `${(start + pageSize) / questions.length * 100}%`,
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        <div className="card">
          {pageQuestions.map((q, idx) => (
            <div key={q.id} style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #e5e7eb' }}>
              <h3>{start + idx + 1}. {q.text}</h3>
              {q.image && <img src={q.image} alt="question" style={{ maxWidth: '100%', height: 'auto', margin: '12px 0' }} />}
              {q.type === 'text' ? (
                <input
                  type="text"
                  placeholder="Хариугаа оруулна уу"
                  value={textAnswers[q.id] || ''}
                  onChange={(e) => setTextAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                />
              ) : (
                (q.options || []).map((opt, i) => (
                  <label key={i} style={{ display: 'block', marginBottom: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name={`q_${q.id}`}
                      value={i}
                      checked={selections[q.id] === i}
                      onChange={() => setSelections(prev => ({ ...prev, [q.id]: i }))}
                      style={{ marginRight: '8px' }}
                    />
                    {opt}
                  </label>
                ))
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button className="secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Өмнөх</button>
          <button className="primary" onClick={handleNext}>{page === (examType === 'sat' ? 6 : Math.ceil(questions.length / 10)) ? 'Дуусгах' : 'Дараах'}</button>
        </div>
      </main>
    </div>
  );
}
