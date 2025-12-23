import { useState, useEffect } from 'react';
import Home from './pages/Home';
import Test from './pages/Test';
import Result from './pages/Result';
import AdminPanel from './pages/AdminPanel';

export default function App() {
  const [page, setPage] = useState('home');
  const [userId, setUserId] = useState(null);
  const [testId, setTestId] = useState(null);
  const [examType, setExamType] = useState('placement');

  useEffect(() => {
    const stored = localStorage.getItem('userId');
    if (stored) setUserId(parseInt(stored));
    const storedTest = localStorage.getItem('testId');
    if (storedTest) setTestId(parseInt(storedTest));
  }, []);

  const handleStartTest = (uid, type) => {
    setUserId(uid);
    setExamType(type);
    localStorage.setItem('userId', uid);
    localStorage.setItem('examType', type);
    setPage('test');
  };

  const handleTestFinish = (tid) => {
    setTestId(tid);
    localStorage.setItem('testId', tid);
    setPage('result');
  };

  const handleLogout = () => {
    localStorage.clear();
    setPage('home');
    setUserId(null);
    setTestId(null);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {page === 'home' && <Home onStartTest={handleStartTest} onAdminClick={() => setPage('admin')} />}
      {page === 'test' && userId && <Test userId={userId} examType={examType} onFinish={handleTestFinish} onLogout={handleLogout} />}
      {page === 'result' && testId && <Result testId={testId} onHome={handleLogout} />}
      {page === 'admin' && <AdminPanel onBack={() => setPage('home')} />}
    </div>
  );
}
