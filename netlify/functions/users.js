import dotenv from 'dotenv';
import { initStore, upsertUser, listUsers, updateUser, deleteUser, getBackend } from '../../src/store.node.js';

dotenv.config();

let storeInitialized = false;

export const handler = async (event, context) => {
  if (!storeInitialized) {
    await initStore();
    storeInitialized = true;
  }

  const method = event.httpMethod;
  const fullPath = event.path || '';
  const rawUrl = event.rawUrl || '';
  const fnPath = fullPath.split('/.netlify/functions/')[1] || '';
  const remainder = fnPath.replace(/^users\/?/, '');
  const id = remainder.split('/')[0] || '';

  // Always allow status check early (any method, any path containing status)
  const qs = event.queryStringParameters || {};
  const isStatusRoute = (fnPath.includes('status') || remainder.startsWith('status') || fullPath.includes('status') || rawUrl.includes('status') || qs.status === '1');
  if (isStatusRoute) {
    // Diagnostics to help verify Netlify env configuration for Firebase
    const useFirebaseEnv = (process.env.USE_FIREBASE === 'true');
    const svc = process.env.FIREBASE_SERVICE_ACCOUNT || '';
    const diag = {
      backend: await getBackend(),
      path: fullPath,
      fnPath,
      method,
      env: {
        USE_FIREBASE: useFirebaseEnv,
        FIREBASE_SERVICE_ACCOUNT_set: !!svc,
        FIREBASE_SERVICE_ACCOUNT_length: svc.length
      }
    };
    return { statusCode: 200, body: JSON.stringify(diag) };
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
