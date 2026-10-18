import fs from 'node:fs';
import path from 'node:path';
import initSqlJs from 'sql.js';

let database;
let databaseFile;

export async function initializeDatabase() {
  const SQL = await initSqlJs();
  const directory = path.resolve(process.env.DATA_DIR || './data');
  fs.mkdirSync(directory, { recursive: true });
  databaseFile = path.join(directory, 'oral-practice.sqlite');
  database = fs.existsSync(databaseFile)
    ? new SQL.Database(fs.readFileSync(databaseFile))
    : new SQL.Database();
  database.run(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS attempts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      topic TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      mode TEXT NOT NULL,
      question TEXT NOT NULL,
      question_json TEXT NOT NULL DEFAULT '{}',
      material_json TEXT NOT NULL DEFAULT '{}',
      original_transcript TEXT NOT NULL,
      submitted_answer TEXT NOT NULL,
      evaluation_json TEXT NOT NULL,
      pace_wpm REAL NOT NULL DEFAULT 0,
      duration_seconds REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS attempts_user_created ON attempts(user_id, created_at);
  `);
  const attemptColumns = new Set(database.exec('PRAGMA table_info(attempts)')[0].values.map((column) => column[1]));
  if (!attemptColumns.has('question_json')) database.run("ALTER TABLE attempts ADD COLUMN question_json TEXT NOT NULL DEFAULT '{}'");
  if (!attemptColumns.has('material_json')) database.run("ALTER TABLE attempts ADD COLUMN material_json TEXT NOT NULL DEFAULT '{}'");
  persist();
  return database;
}

export function getDatabase() {
  if (!database) throw new Error('Database has not been initialized');
  return database;
}

export function persist() {
  if (!database || !databaseFile) return;
  fs.writeFileSync(databaseFile, Buffer.from(database.export()));
}

export function queryAll(sql, values = []) {
  const statement = getDatabase().prepare(sql);
  try {
    statement.bind(values);
    const rows = [];
    while (statement.step()) rows.push(statement.getAsObject());
    return rows;
  } finally {
    statement.free();
  }
}

export function queryOne(sql, values = []) {
  return queryAll(sql, values)[0] || null;
}

export function execute(sql, values = []) {
  getDatabase().run(sql, values);
  persist();
}