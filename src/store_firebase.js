import dotenv from 'dotenv';
dotenv.config();

let admin = null;
let db = null;

async function initAdmin() {
  if (db) return db;
  try {
    // Dynamic import for ESM compatibility with Netlify bundler
    const mod = await import('firebase-admin');
    const firebaseAdmin = mod.default || mod;
    if (!firebaseAdmin.apps.length) {
      let svc = null;
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
          svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        } catch (err) {
          console.error('FIREBASE_SERVICE_ACCOUNT JSON parse error:', err.message);
          throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON');
        }
      }
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
    console.error('Firebase init error:', e.message);
    throw new Error('Firebase Admin SDK is not installed or failed to initialize. Install firebase-admin and set FIREBASE_SERVICE_ACCOUNT env.');
  }
}

async function nextCounter(name) {
  const fdb = await initAdmin();
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
  return initAdmin();
}

export async function upsertUser({ name, age, email, phone }){
  const fdb = await initAdmin();
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
  const fdb = await initAdmin();
  const snap = await fdb.collection('users').orderBy('created_at', 'desc').get();
  return snap.docs.map(d => d.data());
}

export async function updateUser(id, payload){
  const fdb = await initAdmin();
  const q = await fdb.collection('users').where('id', '==', Number(id)).limit(1).get();
  if (q.empty) return null;
  const ref = q.docs[0].ref;
  await ref.set(payload, { merge: true });
  const snap = await ref.get();
  return snap.data();
}

export async function deleteUser(id){
  const fdb = await initAdmin();
  const q = await fdb.collection('users').where('id', '==', Number(id)).limit(1).get();
  if (q.empty) return;
  await q.docs[0].ref.delete();
}

// Tests
export async function getAllTests(){
  const fdb = await initAdmin();
  const snap = await fdb.collection('tests').orderBy('started_at', 'desc').get();
  return snap.docs.map(d => d.data());
}

export async function startTest(userId, examType){
  const fdb = await initAdmin();
  const id = await nextCounter('testId');
  const t = {
    id,
    user_id: userId,
    exam_type: examType || 'placement',
    started_at: new Date().toISOString(),
    score: null,
    essay1_text: '',
    essay1_words: 0,
    essay2_text: '',
    essay2_words: 0,
    level: null,
    status: 'in-progress'
  };
  await fdb.collection('tests').add(t);
  return t;
}

export async function saveAnswers(testId, answers){
  const fdb = await initAdmin();
  const batch = fdb.batch();
  
  // Delete previous answers for these questions
  const qIds = answers.map(a => a.questionId);
  const existingSnap = await fdb.collection('answers')
    .where('test_id', '==', Number(testId))
    .where('question_id', 'in', qIds)
    .get();
  existingSnap.docs.forEach(doc => batch.delete(doc.ref));
  
  // Add new answers
  for (const a of answers) {
    const answerRef = fdb.collection('answers').doc();
    batch.set(answerRef, {
      test_id: Number(testId),
      question_id: a.questionId,
      selected_index: a.selectedIndex,
      text_answer: a.textAnswer
    });
  }
  
  await batch.commit();
}

export async function computeScore(testId){
  // This requires loading questions - delegate to file store for now
  // Or implement full question matching logic here
  const fileStore = await import('./store.js');
  return fileStore.computeScore(testId);
}

export async function saveEssay(testId, which, text){
  const fdb = await initAdmin();
  const q = await fdb.collection('tests').where('id', '==', Number(testId)).limit(1).get();
  if (q.empty) return { error: 'Test not found' };
  
  const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  const field = which === 'essay1' ? 'essay1' : 'essay2';
  const update = {
    [`${field}_text`]: text,
    [`${field}_words`]: words
  };
  
  await q.docs[0].ref.update(update);
  return { ok: true, words };
}

function toLevel(score){
  if (score >= 800) return 'A+';
  if (score >= 750) return 'A';
  if (score >= 700) return 'A-';
  if (score >= 650) return 'B+';
  if (score >= 600) return 'B';
  if (score >= 550) return 'B-';
  if (score >= 500) return 'C+';
  if (score >= 450) return 'C';
  if (score >= 400) return 'C-';
  if (score >= 350) return 'D+';
  if (score >= 300) return 'D';
  if (score >= 250) return 'D-';
  return 'F';
}

export async function finishTest(testId){
  const fdb = await initAdmin();
  const q = await fdb.collection('tests').where('id', '==', Number(testId)).limit(1).get();
  if (q.empty) return { error: 'Test not found' };
  
  const t = q.docs[0].data();
  if (t.score == null) return { error: 'MCQ phase not finished' };
  
  const level = toLevel(t.score);
  await q.docs[0].ref.update({
    level,
    finished_at: new Date().toISOString(),
    status: 'completed'
  });
  
  return { score: t.score, level };
}

export async function getResult(testId){
  const fdb = await initAdmin();
  const q = await fdb.collection('tests').where('id', '==', Number(testId)).limit(1).get();
  if (q.empty) return null;
  
  const t = q.docs[0].data();
  return {
    score: t.score,
    score_raw: t.score_raw,
    total_questions: t.total_questions,
    level: t.level,
    exam_type: t.exam_type,
    essay1_words: t.essay1_words,
    essay2_words: t.essay2_words
  };
}

export async function getQuestionsForTest(testId){
  // Delegate to file store as questions are static
  const fileStore = await import('./store.js');
  return fileStore.getQuestionsForTest(testId);
}

export async function getModuleScore(testId, section){
  // Delegate to file store
  const fileStore = await import('./store.js');
  return fileStore.getModuleScore(testId, section);
}
