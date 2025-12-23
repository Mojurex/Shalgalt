import dotenv from 'dotenv';
import { initStore, getAllTests, getQuestions, getQuestionsAdmin, upsertQuestion, deleteQuestion } from '../../src/store.node.js';

dotenv.config();
await initStore();

export const handler = async (event, context) => {
  const method = event.httpMethod;
  const pathParts = event.path.replace(/^\/api\//, '').split('/').filter(Boolean);
  const resource = pathParts[0];
  const id = pathParts[1];

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
      const tests = getAllTests().filter(t => t.finished_at);
      const total = tests.length;
      const avgScore = total > 0 ? (tests.reduce((sum, t) => sum + (t.score || 0), 0) / total).toFixed(1) : 0;
      const levels = {};
      tests.forEach(t => {
        if(t.level) levels[t.level] = (levels[t.level] || 0) + 1;
      });
      return { statusCode: 200, body: JSON.stringify({ total, avgScore, levels }) };
    }

    if (resource === 'tests' && pathParts[1] === 'all') {
      return { statusCode: 200, body: JSON.stringify(getAllTests()) };
    }

    return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) };
  } catch (err) {
    console.error('Error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
