import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { initStore } from '../../src/store.node.js';

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

export const handler = async (event, context) => {
  if (!storeInitialized) {
    await initStore();
    storeInitialized = true;
  }
  const method = event.httpMethod;
  const action = event.path.split('/').pop();

  try {
    if (method === 'GET' && action === 'materials') {
      return { statusCode: 200, body: JSON.stringify({ materials: [] }) };
    }

    if (method === 'POST' && action === 'send') {
      const { email } = JSON.parse(event.body || '{}');
      if (!email) {
        return { statusCode: 400, body: JSON.stringify({ error: 'email required' }) };
      }
      // Send email with materials (no PDF attachments)
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: email,
        subject: 'SAT Practice Materials',
        text: 'Here are your SAT practice materials.'
      });
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (err) {
    console.error('Error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
