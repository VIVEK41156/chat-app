import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'chat.sqlite');
const sqlite = sqlite3.verbose();
const db = new sqlite.Database(dbPath);

// Promisified DB helpers
export const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
};

export const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
};

// Initialize schema and seed default users
export const initDB = async () => {
  console.log('[DB] Initializing SQLite database at:', dbPath);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT,
      status_message TEXT DEFAULT 'Hey there! I am using WhatsApp.',
      is_online INTEGER DEFAULT 0,
      last_seen TEXT,
      created_at TEXT NOT NULL
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS friend_requests (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'accepted', 'rejected')),
      disappearing_timer INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(receiver_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(sender_id, receiver_id)
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      content TEXT NOT NULL,
      message_type TEXT DEFAULT 'text',
      file_url TEXT,
      file_name TEXT,
      file_size TEXT,
      status TEXT NOT NULL DEFAULT 'sent' CHECK(status IN ('sent', 'delivered', 'read')),
      created_at TEXT NOT NULL,
      delivered_at TEXT,
      read_at TEXT,
      expires_at TEXT,
      is_edited INTEGER DEFAULT 0,
      edited_at TEXT,
      is_deleted_everyone INTEGER DEFAULT 0,
      deleted_for_users TEXT DEFAULT '[]',
      FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(receiver_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS email_otps (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      otp_code TEXT NOT NULL,
      purpose TEXT DEFAULT 'registration',
      attempts INTEGER DEFAULT 0,
      expires_at TEXT NOT NULL,
      is_verified INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS statuses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      media_url TEXT,
      media_type TEXT NOT NULL DEFAULT 'text',
      caption TEXT,
      bg_color TEXT DEFAULT '#00a884',
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS status_views (
      id TEXT PRIMARY KEY,
      status_id TEXT NOT NULL,
      viewer_id TEXT NOT NULL,
      viewed_at TEXT NOT NULL,
      FOREIGN KEY(status_id) REFERENCES statuses(id) ON DELETE CASCADE,
      FOREIGN KEY(viewer_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(status_id, viewer_id)
    )
  `);

  // Migrate schema for existing DB if needed
  try {
    await dbRun(`ALTER TABLE users ADD COLUMN email TEXT`);
  } catch (e) {}
  try {
    await dbRun(`ALTER TABLE messages ADD COLUMN file_url TEXT`);
  } catch (e) {}
  try {
    await dbRun(`ALTER TABLE messages ADD COLUMN file_name TEXT`);
  } catch (e) {}
  try {
    await dbRun(`ALTER TABLE messages ADD COLUMN file_size TEXT`);
  } catch (e) {}
  try {
    await dbRun(`ALTER TABLE messages ADD COLUMN expires_at TEXT`);
  } catch (e) {}
  try {
    await dbRun(`ALTER TABLE messages ADD COLUMN is_edited INTEGER DEFAULT 0`);
  } catch (e) {}
  try {
    await dbRun(`ALTER TABLE messages ADD COLUMN edited_at TEXT`);
  } catch (e) {}
  try {
    await dbRun(`ALTER TABLE messages ADD COLUMN is_deleted_everyone INTEGER DEFAULT 0`);
  } catch (e) {}
  try {
    await dbRun(`ALTER TABLE messages ADD COLUMN deleted_for_users TEXT DEFAULT '[]'`);
  } catch (e) {}
  try {
    await dbRun(`ALTER TABLE friend_requests ADD COLUMN disappearing_timer INTEGER DEFAULT 0`);
  } catch (e) {}

  // Create indexes for faster queries
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(sender_id, receiver_id, created_at)`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_requests_users ON friend_requests(sender_id, receiver_id, status)`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_otps_email ON email_otps(email, purpose, is_verified)`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_statuses_user ON statuses(user_id, created_at)`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_status_views_status ON status_views(status_id, viewer_id)`);

  // Database schema initialized
  console.log('[DB] Database schema initialized successfully.');
};

export default db;
