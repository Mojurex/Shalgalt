import dotenv from 'dotenv';
import { initStore, upsertUser, listUsers, updateUser, deleteUser, getBackend } from '../../src/store.node.js';

dotenv.config();
await initStore();

export const handler = async (event, context) => {
  const method = event.httpMethod;
  const fnPath = (event.path || '').split('/.netlify/functions/')[1] || '';
  const remainder = fnPath.replace(/^users\/?/, '');
  const id = remainder.split('/')[0] || '';

  // Always allow status check regardless of id parsing quirks
  if (method === 'GET' && fnPath.startsWith('users/status')) {
    return { statusCode: 200, body: JSON.stringify({ backend: await getBackend() }) };
  }

  try {
    if (method === 'POST' && !id) {
      const { name, age, email, phone } = JSON.parse(event.body || '{}');
      if (!name || !age || !email || !phone) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Incomplete user info' }) };
      }
      const user = await upsertUser({ name, age, email, phone });
      return { statusCode: 200, body: JSON.stringify(user) };
    }

    if (method === 'GET' && !id) {
      return { statusCode: 200, body: JSON.stringify(await listUsers()) };
    }

    if (method === 'PUT' && id) {
      const { name, age, email, phone } = JSON.parse(event.body || '{}');
      const user = await updateUser(Number(id), { name, age, email, phone });
      if (!user) return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) };
      return { statusCode: 200, body: JSON.stringify(user) };
    }

    if (method === 'DELETE' && id) {
      await deleteUser(Number(id));
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    console.error('Error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
