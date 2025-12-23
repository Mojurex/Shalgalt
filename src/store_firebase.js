import dotenv from 'dotenv';
dotenv.config();

let admin = null;
let db = null;

function initAdmin() {
  if (db) return db;
  try {
    // Lazy import to avoid bundler issues when not used
    // eslint-disable-next-line global-require
    const firebaseAdmin = require('firebase-admin');
    if (!firebaseAdmin.apps.length) {
      const svc = process.env.FIREBASE_SERVICE_ACCOUNT ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) : null;
      if (svc) {
        firebaseAdmin.initializeApp({
          credential: firebaseAdmin.credential.cert(svc),
          projectId: svc.project_id,
        });
      } else {
        // Attempt default credentials (useful on Firebase Functions or GCP)
        firebaseAdmin.initializeApp();
      }
    }
    admin = firebaseAdmin;
    db = admin.firestore();
    return db;
  } catch (e) {
    throw new Error('Firebase Admin SDK is not installed or failed to initialize. Install firebase-admin and set FIREBASE_SERVICE_ACCOUNT env.');
  }
}

async function nextCounter(name) {
  const fdb = initAdmin();
  const ref = fdb.collection('counters').doc('global');
  const res = await fdb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data() : {};
    const current = Number(data[name] || 0) + 1;
    tx.set(ref, { [name]: current }, { merge: true });
    return current;
  });
  return res;
}

export async function initStore(){
  initAdmin();
}

export async function upsertUser({ name, age, email, phone }){
  const fdb = initAdmin();
  const users = fdb.collection('users');
  const q = await users.where('emailLower', '==', (email||'').toLowerCase()).limit(1).get();
  if (!q.empty) {
    const doc = q.docs[0];
    const data = doc.data();
    const updated = { ...data, name, age, phone };
    await doc.ref.set(updated, { merge: true });
    return updated;
  }
  const id = await nextCounter('userId');
  const payload = { id, name, age, email, emailLower: (email||'').toLowerCase(), phone, created_at: new Date().toISOString() };
  await users.add(payload);
  return payload;
}

export async function listUsers(){
  const fdb = initAdmin();
  const snap = await fdb.collection('users').orderBy('created_at', 'desc').get();
  return snap.docs.map(d => d.data());
}

export async function updateUser(id, payload){
  const fdb = initAdmin();
  const q = await fdb.collection('users').where('id', '==', Number(id)).limit(1).get();
  if (q.empty) return null;
  const ref = q.docs[0].ref;
  await ref.set(payload, { merge: true });
  const snap = await ref.get();
  return snap.data();
}

export async function deleteUser(id){
  const fdb = initAdmin();
  const q = await fdb.collection('users').where('id', '==', Number(id)).limit(1).get();
  if (q.empty) return;
  await q.docs[0].ref.delete();
}

// The remaining store functions (tests, questions, etc.) are not overridden
// here and will fall back to file-based store via the proxy module.
