import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import * as fileStore from './store.js';

dotenv.config();

let client, db;
const dbName = 'Sat-math';

async function getDb() {
  if (!client) {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI not set');
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
    // Initialize counters doc
    await db.collection('counters').updateOne(
      { _id: 'global' },
      { $setOnInsert: { userId: 0, testId: 0 } },
      { upsert: true }
    );
  }
  return db;
}

async function nextCounter(kind) {
  const d = await getDb();
  try {
    const res = await d.collection('counters').findOneAndUpdate(
      { _id: 'global' },
      { $inc: { [kind]: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    if (res && res.value && res.value[kind] !== undefined) {
      return res.value[kind];
    }
  } catch (e) {
    console.warn('Counter update failed:', e.message);
  }
  
  // Fallback: Ensure counter exists with default values
  await d.collection('counters').updateOne(
    { _id: 'global' },
    { $setOnInsert: { userId: 0, testId: 0 } },
    { upsert: true }
  );
  
  // Now increment
  const doc = await d.collection('counters').findOne({ _id: 'global' });
  const newVal = (doc?.[kind] || 0) + 1;
  await d.collection('counters').updateOne(
    { _id: 'global' },
    { $set: { [kind]: newVal } }
  );
  return newVal;
}

export async function initStore() {
  // Initialize file store (for questions)
  fileStore.initStore();
  // Initialize MongoDB
  await getDb();
}

export async function listUsers() {
  const d = await getDb();
  return d.collection('users').find({}).sort({ id: 1 }).toArray();
}

export async function upsertUser({ name, age, email, phone }) {
  const d = await getDb();
  const emailLower = (email || '').toLowerCase();
  const existing = await d.collection('users').findOne({ emailLower });
  
  if (existing) {
    const updated = { ...existing, name, age, phone };
    await d.collection('users').updateOne({ _id: existing._id }, { $set: updated });
    return updated;
  }
  
  const id = await nextCounter('userId');
  const doc = { id, name, age, email, emailLower, phone, created_at: new Date().toISOString() };
  await d.collection('users').insertOne(doc);
  return doc;
}

export async function updateUser(id, { name, age, email, phone }) {
  const d = await getDb();
  const payload = {};
  if (name) payload.name = name;
  if (age) payload.age = age;
  if (email) {
    payload.email = email;
    payload.emailLower = email.toLowerCase();
  }
  if (phone) payload.phone = phone;
  
  const result = await d.collection('users').findOneAndUpdate(
    { id: Number(id) },
    { $set: payload },
    { returnDocument: 'after' }
  );
  return result.value || null;
}

export async function deleteUser(id) {
  const d = await getDb();
  await d.collection('users').deleteOne({ id: Number(id) });
  await d.collection('tests').deleteMany({ user_id: Number(id) });
}

export async function getAllTests() {
  const d = await getDb();
  return d.collection('tests').find({}).sort({ id: 1 }).toArray();
}

export async function startTest(userId, examType) {
  const d = await getDb();
  const id = await nextCounter('testId');
  const doc = {
    id,
    user_id: Number(userId),
    exam_type: examType || 'placement',
    started_at: new Date().toISOString(),
    score: null,
    score_raw: null,
    total_questions: null,
    essay1_text: '',
    essay1_words: 0,
    essay2_text: '',
    essay2_words: 0,
    level: null,
    status: 'in-progress'
  };
  await d.collection('tests').insertOne(doc);
  return doc;
}

export async function saveAnswers(testId, answers) {
  const d = await getDb();
  await d.collection('answers').deleteMany({ test_id: Number(testId) });
  
  if (Array.isArray(answers) && answers.length > 0) {
    const docs = answers.map(a => ({
      test_id: Number(testId),
      question_id: a.questionId,
      ...(typeof a.selectedIndex === 'number' && { selected_index: a.selectedIndex }),
      ...(typeof a.textAnswer === 'string' && a.textAnswer.trim() && { text_answer: a.textAnswer.trim() })
    }));
    await d.collection('answers').insertMany(docs);
  }
}

export async function computeScore(testId) {
  const d = await getDb();
  const test = await d.collection('tests').findOne({ id: Number(testId) });
  if (!test) return null;
  
  const answers = await d.collection('answers').find({ test_id: Number(testId) }).toArray();
  
  // Load questions from file store (same as Firebase)
  const fileStore = await import('./store.js');
  let questions = [];
  if (test.exam_type === 'sat') {
    const verbal = fileStore.getSATQuestionsAdmin('verbal');
    const math = fileStore.getSATQuestionsAdmin('math');
    questions = [...verbal, ...math];
  } else {
    questions = fileStore.getQuestionsAdmin();
  }
  
  let score = 0;
  for (const a of answers) {
    const q = questions.find(x => x.id === a.question_id);
    if (!q) continue;
    
    if (a.text_answer !== undefined && a.text_answer !== null) {
      const ua = (a.text_answer || '').toString().trim().toLowerCase();
      const ca = (q.answer || '').toString().trim().toLowerCase();
      if (ua && ca && ua === ca) score++;
    } else {
      if (q.correct_index === a.selected_index) score++;
    }
  }
  
  const total = questions.length;
  
  if (test.exam_type === 'sat') {
    const normalized = Math.round(200 + (score / Math.max(1, total)) * 600);
    await d.collection('tests').updateOne(
      { id: Number(testId) },
      { $set: { score: normalized, score_raw: score, total_questions: total } }
    );
    return normalized;
  } else {
    await d.collection('tests').updateOne(
      { id: Number(testId) },
      { $set: { score, total_questions: total } }
    );
    return score;
  }
}

export async function saveEssay(testId, which, text) {
  const d = await getDb();
  const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  const field = which === 'essay1' ? 'essay1' : 'essay2';
  const update = {
    [`${field}_text`]: text,
    [`${field}_words`]: words
  };
  
  await d.collection('tests').updateOne({ id: Number(testId) }, { $set: update });
  return { ok: true, words };
}

function toLevel(score) {
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

export async function finishTest(testId) {
  const d = await getDb();
  const test = await d.collection('tests').findOne({ id: Number(testId) });
  if (!test) return { error: 'Test not found' };
  if (test.score == null) return { error: 'MCQ phase not finished' };
  
  const level = toLevel(test.score);
  await d.collection('tests').updateOne(
    { id: Number(testId) },
    {
      $set: {
        level,
        finished_at: new Date().toISOString(),
        status: 'completed'
      }
    }
  );
  
  return { score: test.score, level };
}

export async function getResult(testId) {
  const d = await getDb();
  const test = await d.collection('tests').findOne({ id: Number(testId) });
  if (!test) return null;
  
  return {
    score: test.score,
    score_raw: test.score_raw,
    total_questions: test.total_questions,
    level: test.level,
    exam_type: test.exam_type,
    essay1_words: test.essay1_words,
    essay2_words: test.essay2_words
  };
}

export async function getQuestionsForTest(testId) {
  const d = await getDb();
  const test = await d.collection('tests').findOne({ id: Number(testId) });
  if (!test) return [];
  
  if (test.exam_type === 'sat') {
    const verbal = fileStore.getSATQuestions('verbal');
    const math = fileStore.getSATQuestions('math');
    return [...verbal, ...math].map(({ id, text, options, section, image, chart, type }) => ({
      id,
      text,
      options,
      section,
      image,
      chart,
      type
    }));
  }
  
  const qs = fileStore.getQuestions();
  return qs.map(({ id, text, options, image, chart }) => ({ id, text, options, image, chart }));
}

export async function getModuleScore(testId, section) {
  const d = await getDb();
  const test = await d.collection('tests').findOne({ id: Number(testId) });
  if (!test || test.exam_type !== 'sat') return { correct: 0, total: 0 };
  
  const target = section === 'math' ? fileStore.getSATQuestionsAdmin('math') : fileStore.getSATQuestionsAdmin('verbal');
  const qMap = new Map(target.map(q => [q.id, q]));
  
  const answers = await d.collection('answers').find({ test_id: Number(testId) }).toArray();
  let correct = 0;
  
  for (const a of answers) {
    const q = qMap.get(a.question_id);
    if (!q) continue;
    
    if (q.type === 'text') {
      const ua = (a.text_answer || '').toString().trim().toLowerCase();
      const ca = (q.answer || '').toString().trim().toLowerCase();
      if (ua && ca && ua === ca) correct++;
    } else {
      if (q.correct_index === a.selected_index) correct++;
    }
  }
  
  return { correct, total: target.length };
}

export async function getQuestions() {
  const fileStore = await import('./store.js');
  return fileStore.getQuestions();
}

export async function getQuestionsAdmin() {
  const fileStore = await import('./store.js');
  return fileStore.getQuestionsAdmin();
}

export async function upsertQuestion(q) {
  const fileStore = await import('./store.js');
  return fileStore.upsertQuestion(q);
}

export async function deleteQuestion(id) {
  const fileStore = await import('./store.js');
  return fileStore.deleteQuestion(id);
}

export async function getBackend() {
  return 'mongo';
}

export default {
  initStore,
  listUsers,
  upsertUser,
  updateUser,
  deleteUser,
  getAllTests,
  startTest,
  saveAnswers,
  computeScore,
  saveEssay,
  finishTest,
  getResult,
  getQuestionsForTest,
  getModuleScore,
  getQuestions,
  getQuestionsAdmin,
  upsertQuestion,
  deleteQuestion,
  getBackend
};
