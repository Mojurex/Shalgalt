import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db;

export function getDb() {
  if (!db) throw new Error('DB not initialized');
  return db;
}

export function initDb() {
  const dbPath = path.join(__dirname, '..', 'data.sqlite');
  const firstTime = !fs.existsSync(dbPath);
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY,
      text TEXT NOT NULL,
      options TEXT NOT NULL,
      correct_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      started_at TEXT,
      finished_at TEXT,
      score INTEGER,
      essay1_text TEXT,
      essay1_words INTEGER,
      essay2_text TEXT,
      essay2_words INTEGER,
      level TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      selected_index INTEGER NOT NULL,
      FOREIGN KEY(test_id) REFERENCES tests(id),
      FOREIGN KEY(question_id) REFERENCES questions(id)
    );
  `);

  // Seed questions if empty
  const count = db.prepare('SELECT COUNT(*) as c FROM questions').get().c;
  if (count === 0) {
    const seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'questions.json'), 'utf-8'));
    const ins = db.prepare('INSERT INTO questions (id, text, options, correct_index) VALUES (?, ?, ?, ?)');
    const tx = db.transaction((rows) => {
      for (const r of rows) {
        ins.run(r.id, r.text, JSON.stringify(r.options), r.correct_index);
      }
    });
    tx(seed);
  }
}
