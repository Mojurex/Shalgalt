import dotenv from 'dotenv';
import { initStore, startTest, saveAnswers, computeScore, saveEssay, finishTest, getResult, getQuestionsForTest, getModuleScore, getAllTests } from '../../src/store.node.js';
import nodemailer from 'nodemailer';

dotenv.config();

let storeInitialized = false;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

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

export const handler = async (event, context) => {
  if (!storeInitialized) {
    await initStore();
    storeInitialized = true;
  }

  const method = event.httpMethod;
  const rawPath = event.path || event.rawUrl || '';
  console.log('[tests.js] rawPath:', rawPath, 'method:', method);
  
  // Extract path after /api/ or /.netlify/functions/
  let fnPath = rawPath.split('/.netlify/functions/')[1] || rawPath.split('/api/')[1] || '';
  console.log('[tests.js] fnPath:', fnPath);
  
  const parts = fnPath.split('/').filter(Boolean);
  console.log('[tests.js] parts:', parts);
  
  // parts[0] === 'tests', parts[1] === testId or action
  const testId = parts[1] && /^\d+$/.test(parts[1]) ? Number(parts[1]) : undefined;
  const action = parts[1] && !testId ? parts[1] : parts[2];
  console.log('[tests.js] testId:', testId, 'action:', action);

  try {
    if (parts[0] === 'tests') {
      if (method === 'POST' && (!action || action === 'start')) {
        const { userId, examType } = JSON.parse(event.body || '{}');
        if (!userId) return { statusCode: 400, body: JSON.stringify({ error: 'userId required' }) };
        const test = startTest(Number(userId), examType);
        return { statusCode: 200, body: JSON.stringify(test) };
      }

      if (method === 'POST' && action === 'answers') {
        const { answers } = JSON.parse(event.body || '{}');
        if (!Array.isArray(answers)) {
          return { statusCode: 400, body: JSON.stringify({ error: 'answers[] required' }) };
        }
        if (!testId) return { statusCode: 400, body: JSON.stringify({ error: 'testId missing in path' }) };
        saveAnswers(testId, answers);
        return { statusCode: 200, body: JSON.stringify({ ok: true }) };
      }

      if (method === 'GET' && action === 'questions') {
        if (!testId) return { statusCode: 400, body: JSON.stringify({ error: 'testId missing in path' }) };
        const qs = getQuestionsForTest(testId);
        if(!qs || qs.length === 0) {
          return { statusCode: 404, body: JSON.stringify({ error: 'No questions' }) };
        }
        return { statusCode: 200, body: JSON.stringify(qs) };
      }

      if (method === 'POST' && action === 'finish-answers') {
        if (!testId) return { statusCode: 400, body: JSON.stringify({ error: 'testId missing in path' }) };
        const score = computeScore(testId);
        return { statusCode: 200, body: JSON.stringify({ score, level: toLevel(score) }) };
      }

      if (method === 'GET' && action === 'module-score') {
        const section = (event.queryStringParameters?.section || 'verbal').toLowerCase();
        if (!testId) return { statusCode: 400, body: JSON.stringify({ error: 'testId missing in path' }) };
        const { correct, total } = getModuleScore(testId, section === 'math' ? 'math' : 'verbal');
        return { statusCode: 200, body: JSON.stringify({ correct, total }) };
      }

      if (method === 'POST' && action === 'essay1') {
        const { text } = JSON.parse(event.body || '{}');
        if (!testId) return { statusCode: 400, body: JSON.stringify({ error: 'testId missing in path' }) };
        const result = saveEssay(testId, 'essay1', text || '');
        return { statusCode: 200, body: JSON.stringify({ ok: true, words: result.words }) };
      }

      if (method === 'POST' && action === 'essay2') {
        const { text } = JSON.parse(event.body || '{}');
        if (!testId) return { statusCode: 400, body: JSON.stringify({ error: 'testId missing in path' }) };
        const result = saveEssay(testId, 'essay2', text || '');
        return { statusCode: 200, body: JSON.stringify({ ok: true, words: result.words }) };
      }

      if (method === 'POST' && action === 'finish') {
        if (!testId) return { statusCode: 400, body: JSON.stringify({ error: 'testId missing in path' }) };
        const result = finishTest(testId);
        if (result.error) {
          return { statusCode: 400, body: JSON.stringify({ error: result.error }) };
        }
        return { statusCode: 200, body: JSON.stringify({ score: result.score, level: result.level }) };
      }

      if (method === 'GET' && action === 'result') {
        if (!testId) return { statusCode: 400, body: JSON.stringify({ error: 'testId missing in path' }) };
        const data = getResult(testId);
        if (!data) return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) };
        return { statusCode: 200, body: JSON.stringify(data) };
      }

      // Admin: /api/tests/all → /.netlify/functions/tests/all
      if (method === 'GET' && action === 'all') {
        return { statusCode: 200, body: JSON.stringify(getAllTests()) };
      }
    }

    return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) };
  } catch (err) {
    console.error('Error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
