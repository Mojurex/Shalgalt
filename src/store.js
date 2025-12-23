import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', 'data');
const dbFile = path.join(dataDir, 'db.json');

let db = {
  users: [],
  tests: [],
  answers: [],
  counters: { userId: 0, testId: 0 },
  createdAt: null
};
let questions = [];
let satQuestions = [];
let satMathQuestions = [];

function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

function load(){
  if (fs.existsSync(dbFile)) {
    db = JSON.parse(fs.readFileSync(dbFile, 'utf-8'));
  } else {
    db.createdAt = new Date().toISOString();
    save();
  }
}
function save(){ fs.writeFileSync(dbFile, JSON.stringify(db, null, 2)); }

export function initStore(){
  ensureDir(dataDir);
  load();
  // load questions
  const qPath = path.join(__dirname, 'questions.json');
  questions = JSON.parse(fs.readFileSync(qPath, 'utf-8')).map(q => ({ id: q.id, text: q.text, options: q.options, correct_index: q.correct_index, image: q.image, chart: q.chart }));
  const satPath = path.join(__dirname, 'sat_questions.json');
  if(fs.existsSync(satPath)){
    satQuestions = JSON.parse(fs.readFileSync(satPath, 'utf-8')).map(q => ({ id: q.id, text: q.text, options: q.options, correct_index: q.correct_index, section: 'verbal', image: q.image, chart: q.chart, type: q.type, answer: q.answer }));
  }
  const satMathPath = path.join(__dirname, 'sat_math_questions.json');
  if(fs.existsSync(satMathPath)){
    satMathQuestions = JSON.parse(fs.readFileSync(satMathPath, 'utf-8')).map(q => ({ id: q.id, text: q.text, options: q.options, correct_index: q.correct_index, section: 'math', image: q.image, chart: q.chart, type: q.type, answer: q.answer }));
  }
}

// Users
export function upsertUser({ name, age, email, phone }){
  const existing = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    existing.name = name; existing.age = age; existing.phone = phone;
    save();
    return existing;
  }
  const id = ++db.counters.userId;
  const user = { id, name, age, email, phone, created_at: new Date().toISOString() };
  db.users.unshift(user);
  save();
  return user;
}
export function listUsers(){ return db.users.slice(); }
export function updateUser(id, payload){
  const u = db.users.find(x => x.id === id);
  if(!u) return null;
  if(payload.name !== undefined) u.name = payload.name;
  if(payload.age !== undefined) u.age = payload.age;
  if(payload.email !== undefined) u.email = payload.email;
  if(payload.phone !== undefined) u.phone = payload.phone;
  save();
  return u;
}
export function deleteUser(id){
  db.users = db.users.filter(u => u.id !== id);
  save();
}

export function getAllTests(){
  return db.tests || [];
}

// Questions
export function getQuestions(){
  return questions.map(({ id, text, options, image, chart }) => ({ id, text, options, image, chart }));
}

export function getQuestionsAdmin(){
  return questions.slice();
}

export function upsertQuestion(data){
  const idx = questions.findIndex(q => q.id === data.id);
  const current = idx >= 0 ? questions[idx] : {};
  const q = {
    id: data.id,
    text: data.text,
    options: data.options,
    correct_index: data.correct_index,
    image: data.image ?? current.image,
    chart: data.chart ?? current.chart
  };
  if(idx >= 0) questions[idx] = q;
  else questions.push(q);
  questions.sort((a, b) => a.id - b.id);
  // Save to file
  const qPath = path.join(__dirname, 'questions.json');
  fs.writeFileSync(qPath, JSON.stringify(questions, null, 2));
  return q;
}

export function deleteQuestion(id){
  questions = questions.filter(q => q.id !== id);
  const qPath = path.join(__dirname, 'questions.json');
  fs.writeFileSync(qPath, JSON.stringify(questions, null, 2));
}

// Tests
export function startTest(userId, examType){
  const id = ++db.counters.testId;
  const t = { id, user_id: userId, exam_type: examType || 'placement', started_at: new Date().toISOString(), score: null, essay1_text: '', essay1_words: 0, essay2_text: '', essay2_words: 0, level: null };
  db.tests.push(t);
  save();
  return t;
}

export function saveAnswers(testId, answers){
  // remove previous for those questions
  const qIds = new Set(answers.map(a=>a.questionId));
  db.answers = db.answers.filter(a => !(a.test_id === testId && qIds.has(a.question_id)));
  for(const a of answers){
    db.answers.push({ test_id: testId, question_id: a.questionId, selected_index: a.selectedIndex, text_answer: a.textAnswer });
  }
  save();
}

function normalizeAnswer(s){
  return (s||'')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\\/g, '/') // backslash to slash
    .replace(/,/g, '.') // decimal comma to dot
    ;
}

export function computeScore(testId){
  const t = db.tests.find(x=>x.id===testId);
  if(!t) return 0;
  const ans = db.answers.filter(a=>a.test_id===testId);
  const set = (t.exam_type === 'sat') ? [...satQuestions, ...satMathQuestions] : questions;
  let score = 0;
  const qMap = new Map(set.map(q => [q.id, q]));
  for(const a of ans){
    const q = qMap.get(a.question_id);
    if(!q) continue;
    if(q.type === 'text'){
      const ua = normalizeAnswer(a.text_answer);
      const ca = normalizeAnswer(q.answer);
      if(ua && ca && ua === ca) score++;
    } else {
      if(q.correct_index === a.selected_index) score++;
    }
  }
  const total = set.length;
  
  if(t.exam_type === 'sat'){
    // SAT: Normalize raw score to 200-800 scale
    const normalized = Math.round(200 + (score / Math.max(1, total)) * 600);
    t.score_raw = score;
    t.total_questions = total;
    t.score = normalized;
    t.level = toLevel(normalized);
  } else {
    t.score = score;
    t.level = toLevel(score);
  }
  save();
  return t.score;
}

export function saveEssay(testId, which, text){
  const t = db.tests.find(x=>x.id===testId);
  const words = (text||'').trim().split(/\s+/).filter(Boolean).length;
  if(which==='essay1'){ t.essay1_text = text; t.essay1_words = words; }
  else { t.essay2_text = text; t.essay2_words = words; }
  save();
  return { words };
}

export function finishTest(testId){
  const t = db.tests.find(x=>x.id===testId);
  if(!t) return { error: 'Test not found' };
  if(t.score == null) return { error: 'MCQ phase not finished' };
  // Allow finishing even if essays < 300 words
  t.level = toLevel(t.score);
  t.finished_at = new Date().toISOString();
  save();
  return { score: t.score, level: t.level };
}

export function getResult(testId){
  const t = db.tests.find(x=>x.id===testId);
  if(!t) return null;
  return { score: t.score, score_raw: t.score_raw, total_questions: t.total_questions, level: t.level, exam_type: t.exam_type, essay1_words: t.essay1_words, essay2_words: t.essay2_words };
}

export function getQuestionsForTest(testId){
  const t = db.tests.find(x=>x.id===testId);
  if(!t) return [];
  const set = (t.exam_type === 'sat') ? [...satQuestions, ...satMathQuestions] : questions;
  // Do not expose correct answers; include type for client rendering
  return set.map(({ id, text, options, section, image, chart, type }) => ({ id, text, options, section, image, chart, type }));
}

// Compute module-specific score for SAT without exposing answers
export function getModuleScore(testId, section){
  const t = db.tests.find(x => x.id === testId);
  if(!t || t.exam_type !== 'sat') return { correct: 0, total: 0 };
  const target = section === 'math' ? satMathQuestions : satQuestions;
  const qMap = new Map(target.map(q => [q.id, q]));
  const answers = db.answers.filter(a => a.test_id === testId);
  let correct = 0;
  for(const a of answers){
    const q = qMap.get(a.question_id);
    if(!q) continue;
    if(q.type === 'text'){
      const ua = normalizeAnswer(a.text_answer);
      const ca = normalizeAnswer(q.answer);
      if(ua && ca && ua === ca) correct++;
    } else {
      if(q.correct_index === a.selected_index) correct++;
    }
  }
  return { correct, total: target.length };
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
