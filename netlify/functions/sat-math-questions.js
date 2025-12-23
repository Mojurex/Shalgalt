import dotenv from 'dotenv';
import { initStore, getSATQuestions, getSATQuestionsAdmin, upsertSATQuestion, deleteSATQuestion } from '../../src/store.js';

dotenv.config();
initStore();

export const handler = async (event, context) => {
  const method = event.httpMethod;
  const pathParts = event.path.replace(/^\/api\//, '').split('/').filter(Boolean);
  const id = pathParts[1];

  try {
    if (method === 'GET' && event.path.includes('/admin')) {
      return { statusCode: 200, body: JSON.stringify(getSATQuestionsAdmin('math')) };
    }
    if (method === 'GET') {
      return { statusCode: 200, body: JSON.stringify(getSATQuestions('math')) };
    }
    if (method === 'POST') {
      const { id, text, image, chart, options, correct_index } = JSON.parse(event.body || '{}');
      if (!id || !text || !options || correct_index == null) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Invalid data' }) };
      }
      const q = upsertSATQuestion('math', { id, text, image, chart, options, correct_index });
      return { statusCode: 200, body: JSON.stringify(q) };
    }
    if (method === 'DELETE' && id) {
      deleteSATQuestion('math', Number(id));
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    console.error('Error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
