import dotenv from 'dotenv';
import { initStore, getAllTests, getQuestions, getQuestionsAdmin, upsertQuestion, deleteQuestion } from '../../src/store.node.js';

dotenv.config();

let storeInitialized = false;

export const handler = async (event, context) => {
  if (!storeInitialized) {
    await initStore();
    storeInitialized = true;
  }
  const method = event.httpMethod;
  const rawPath = event.path || event.rawUrl || '';
  // Normalize path to extract after /.netlify/functions/ or /api/
  let fnPath = rawPath.split('/.netlify/functions/')[1] || rawPath.split('/api/')[1] || '';
  const parts = fnPath.split('/').filter(Boolean);
  // When redirects map to /.netlify/functions/queries/:splat, first segment is 'queries'
  const base = parts[0];
  const resource = base === 'queries' ? parts[1] : base;
  const id = base === 'queries' ? parts[2] : parts[1];

  try {
    if (resource === 'questions') {
      if (method === 'GET' && event.path.includes('/admin')) {
        return { statusCode: 200, body: JSON.stringify(getQuestionsAdmin()) };
      }
      if (method === 'GET') {
        return { statusCode: 200, body: JSON.stringify(getQuestions()) };
      }
      if (method === 'POST') {
        const { id, text, image, chart, options, correct_index } = JSON.parse(event.body || '{}');
        if (!id || !text || !options || correct_index == null) {
          return { statusCode: 400, body: JSON.stringify({ error: 'Invalid data' }) };
        }
        const q = upsertQuestion({ id, text, image, chart, options, correct_index });
        return { statusCode: 200, body: JSON.stringify(q) };
      }
      if (method === 'DELETE' && id) {
        deleteQuestion(Number(id));
        return { statusCode: 200, body: JSON.stringify({ ok: true }) };
      }
    }

    if (resource === 'stats') {
      const tests = (await getAllTests()).filter(t => t.finished_at || t.status === 'completed');
      const total = tests.length;
      const avgScore = total > 0 ? (tests.reduce((sum, t) => sum + (t.score || 0), 0) / total).toFixed(1) : 0;
      const levels = {};
      tests.forEach(t => {
        if(t.level) levels[t.level] = (levels[t.level] || 0) + 1;
      });
      return { statusCode: 200, body: JSON.stringify({ total, avgScore, levels }) };
    }

    if (resource === 'tests' && (id === 'all')) {
      return { statusCode: 200, body: JSON.stringify(await getAllTests()) };
    }

    return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) };
  } catch (err) {
    console.error('Error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
