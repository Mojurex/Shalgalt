import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize app and start server
(async () => {
  // Choose store based on environment variable
  let store;
  if (process.env.USE_FIREBASE === 'true') {
    try {
      store = (await import('./src/store_firebase.js')).default;
    } catch (e) {
      console.warn('Firebase store failed to load, falling back to JSON store:', e.message);
      store = (await import('./src/store.js'));
    }
  } else {
    store = (await import('./src/store.js'));
  }

  const {
    initStore,
    upsertUser,
    listUsers,
    updateUser,
    deleteUser,
    getAllTests,
    getQuestions,
    getQuestionsAdmin,
    upsertQuestion,
    deleteQuestion,
    startTest,
    saveAnswers,
    computeScore,
    saveEssay,
    finishTest,
    getResult,
    getQuestionsForTest,
    getModuleScore
  } = store;

  const app = express();
  app.use(express.json());

  // Initialize store
  await initStore();

  // Email transporter (configure with real SMTP)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  // Serve static files
  app.use(express.static(path.join(__dirname, 'public')));
// Serve SAT materials statically for direct download
const satDir = path.join(__dirname, 'Sat');
if (fs.existsSync(satDir)) {
  app.use('/sat', express.static(satDir));
}

  // Helpers
  function toLevel(score) {
    if (score >= 28) return 'C1';
    if (score >= 24) return 'B2';
    if (score >= 18) return 'B1';
    if (score >= 11) return 'A2';
    return 'A1';
  }

  // API routes
  const api = express.Router();
  app.use('/api', api);

  // Users
  api.post('/users', async (req, res) => {
    const { name, age, email, phone } = req.body || {};
    if (!name || !age || !email || !phone) {
      return res.status(400).json({ error: 'Incomplete user info' });
    }
    const user = await upsertUser({ name, age, email, phone });
    return res.json(user);
  });

  api.get('/users', async (req, res) => {
    res.json(await listUsers());
  });

  api.get('/tests/all', async (req, res) => {
    res.json(await getAllTests());
  });

  api.get('/stats', async (req, res) => {
    const tests = (await getAllTests()).filter(t => t.finished_at);
    const total = tests.length;
    const avgScore = total > 0 ? (tests.reduce((sum, t) => sum + (t.score || 0), 0) / total).toFixed(1) : 0;
    
    const levels = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0 };
    tests.forEach(t => {
      if(t.level) levels[t.level] = (levels[t.level] || 0) + 1;
    });
    
    res.json({ total, avgScore, levels });
  });

  api.put('/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, age, email, phone } = req.body || {};
    const user = await updateUser(Number(id), { name, age, email, phone });
    if (!user) return res.status(404).json({ error: 'Not found' });
    res.json(user);
  });

  api.delete('/users/:id', async (req, res) => {
    const { id } = req.params;
    await deleteUser(Number(id));
    res.json({ ok: true });
  });

// Questions (no correct index returned)
api.get('/questions', (req, res) => {
  res.json(getQuestions());
});

api.get('/questions/admin', (req, res) => {
  res.json(getQuestionsAdmin());
});
// Questions for a specific test (exam-type aware)
api.get('/tests/:testId/questions', (req, res) => {
  const { testId } = req.params;
  const qs = getQuestionsForTest(Number(testId));
  if(!qs || qs.length === 0) return res.status(404).json({ error: 'No questions' });
  res.json(qs);
});

api.post('/questions', (req, res) => {
  const { id, text, image, chart, options, correct_index } = req.body || {};
  if(!id || !text || !options || correct_index == null) return res.status(400).json({ error: 'Invalid data' });
  const q = upsertQuestion({ id, text, image, chart, options, correct_index });
  res.json(q);
});

api.delete('/questions/:id', (req, res) => {
  deleteQuestion(Number(req.params.id));
  res.json({ ok: true });
});

// SAT Verbal Questions (sat_questions.json)
api.get('/sat-questions', (req, res) => {
  const filePath = path.join(__dirname, 'src', 'sat_questions.json');
  if(!fs.existsSync(filePath)) return res.json([]);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  res.json(data);
});

api.post('/sat-questions', (req, res) => {
  const { id, text, type, answer, image, chart, options, correct_index } = req.body || {};
  if(!id || !text) return res.status(400).json({ error: 'Invalid data' });
  
  const filePath = path.join(__dirname, 'src', 'sat_questions.json');
  let data = [];
  if(fs.existsSync(filePath)){
    data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  
  const idx = data.findIndex(q => q.id === id);
  const newQ = { id, text };
  if(type) newQ.type = type;
  if(type === 'text' && typeof answer === 'string'){
    newQ.answer = answer;
  }
  if(options && correct_index != null){
    newQ.options = options;
    newQ.correct_index = correct_index;
  }
  if(image) newQ.image = image;
  if(chart) newQ.chart = chart;
  
  if(idx >= 0) data[idx] = newQ;
  else data.push(newQ);
  
  data.sort((a, b) => a.id - b.id);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  res.json(newQ);
});

api.delete('/sat-questions/:id', (req, res) => {
  const filePath = path.join(__dirname, 'src', 'sat_questions.json');
  if(!fs.existsSync(filePath)) return res.json({ ok: true });
  
  let data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  data = data.filter(q => q.id !== Number(req.params.id));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  res.json({ ok: true });
});

// SAT Math Questions (sat_math_questions.json)
api.get('/sat-math-questions', (req, res) => {
  const filePath = path.join(__dirname, 'src', 'sat_math_questions.json');
  if(!fs.existsSync(filePath)) return res.json([]);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  res.json(data);
});

api.post('/sat-math-questions', (req, res) => {
  const { id, text, type, answer, image, chart, options, correct_index } = req.body || {};
  if(!id || !text) return res.status(400).json({ error: 'Invalid data' });
  
  const filePath = path.join(__dirname, 'src', 'sat_math_questions.json');
  let data = [];
  if(fs.existsSync(filePath)){
    data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  
  const idx = data.findIndex(q => q.id === id);
  const newQ = { id, text };
  if(type) newQ.type = type;
  if(type === 'text' && typeof answer === 'string'){
    newQ.answer = answer;
  }
  if(options && correct_index != null){
    newQ.options = options;
    newQ.correct_index = correct_index;
  }
  if(image) newQ.image = image;
  if(chart) newQ.chart = chart;
  
  if(idx >= 0) data[idx] = newQ;
  else data.push(newQ);
  
  data.sort((a, b) => a.id - b.id);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  res.json(newQ);
});

api.delete('/sat-math-questions/:id', (req, res) => {
  const filePath = path.join(__dirname, 'src', 'sat_math_questions.json');
  if(!fs.existsSync(filePath)) return res.json({ ok: true });
  
  let data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  data = data.filter(q => q.id !== Number(req.params.id));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  res.json({ ok: true });
});

// Start a test
api.post('/tests/start', (req, res) => {
  const { userId, examType } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const test = startTest(Number(userId), examType);
  res.json(test);
});

// Save answers (bulk for a page)
api.post('/tests/:testId/answers', (req, res) => {
  const { testId } = req.params;
  const { answers } = req.body || {};
  if (!Array.isArray(answers)) return res.status(400).json({ error: 'answers[] required' });
  saveAnswers(Number(testId), answers);
  res.json({ ok: true });
});

// Finish MCQ phase => compute score
api.post('/tests/:testId/finish-answers', (req, res) => {
  const { testId } = req.params;
  const score = computeScore(Number(testId));
  res.json({ score, level: toLevel(score) });
});

// SAT: Module score (verbal or math) without exposing answers
api.get('/tests/:testId/module-score', (req, res) => {
  const { testId } = req.params;
  const section = (req.query.section || 'verbal').toString().toLowerCase();
  try{
    const { correct, total } = getModuleScore(Number(testId), section === 'math' ? 'math' : 'verbal');
    res.json({ correct, total });
  }catch(e){
    res.status(500).json({ error: 'Module score failed' });
  }
});

// Essays
api.post('/tests/:testId/essay1', (req, res) => {
  const { testId } = req.params;
  const { text } = req.body || {};
  const result = saveEssay(Number(testId), 'essay1', text || '');
  res.json({ ok: true, words: result.words });
});

api.post('/tests/:testId/essay2', (req, res) => {
  const { testId } = req.params;
  const { text } = req.body || {};
  const result = saveEssay(Number(testId), 'essay2', text || '');
  res.json({ ok: true, words: result.words });
});

// Finish everything
api.post('/tests/:testId/finish', (req, res) => {
  const { testId } = req.params;
  const result = finishTest(Number(testId));
  if (result.error) return res.status(400).json({ error: result.error });
  
  // Send email notification (async, don't wait)
  const testData = getResult(Number(testId));
  const userId = getAllTests().find(t => t.id === Number(testId))?.user_id;
  if(userId){
    const users = listUsers();
    const user = users.find(u => u.id === userId);
    if(user?.email){
      const mail = {
        from: process.env.SMTP_USER || 'noreply@test.com',
        to: user.email,
        subject: `English Test Result - ${result.level}`,
        html: `
          <h2>Your English Test Result</h2>
          <p>Dear ${user.name},</p>
          <p>Your test has been completed successfully!</p>
          <p><strong>Score:</strong> ${result.score} / 30</p>
          <p><strong>Level:</strong> ${result.level}</p>
          <p>Thank you for taking the test.</p>
        `
      };
      transporter.sendMail(mail).catch(err => console.error('Email send error:', err));
    }
  }
  
  res.json({ score: result.score, level: result.level });
});

api.get('/tests/:testId/result', (req, res) => {
  const { testId } = req.params;
  const data = getResult(Number(testId));
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

// SAT materials: list and email
api.get('/sat/materials', (req, res) => {
  try{
    if(!fs.existsSync(satDir)) return res.json({ files: [] });
    const files = fs.readdirSync(satDir)
      .filter(f => !f.startsWith('.') && fs.statSync(path.join(satDir, f)).isFile())
      .map(f => ({
        name: f,
        url: `/sat/${encodeURIComponent(f)}`,
        type: path.extname(f).toLowerCase().replace('.', '')
      }));
    res.json({ files });
  }catch(e){ res.status(500).json({ error: 'Materials listing failed' }); }
});

api.post('/sat/send', async (req, res) => {
  const { email, files } = req.body || {};
  if(!email || !Array.isArray(files) || files.length === 0){
    return res.status(400).json({ error: 'email and files[] required' });
  }
  try{
    const attachments = files.map(fname => {
      const safePath = path.join(satDir, path.basename(fname));
      if(!safePath.startsWith(satDir)) throw new Error('Invalid file');
      return { filename: path.basename(fname), path: safePath };
    });
    await transporter.sendMail({
      from: process.env.SMTP_USER || 'noreply@test.com',
      to: email,
      subject: 'SAT Materials',
      html: '<p>Please find attached SAT materials.</p>',
      attachments
    });
    res.json({ ok: true, sent: attachments.length });
  }catch(e){
    console.error('SAT send error:', e);
    res.status(500).json({ error: 'Send failed' });
  }
});

  // Fallback to index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // For local development
  if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  }

  return app;
})().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
