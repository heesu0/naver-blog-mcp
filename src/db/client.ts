import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { env } from '../config.js';
import * as schema from './schema.js';

mkdirSync(dirname(env.DATABASE_URL), { recursive: true });

const sqlite = new Database(env.DATABASE_URL);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
export { schema };

export function runMigrations(): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      naver_id TEXT NOT NULL UNIQUE,
      blog_id TEXT,
      encrypted_password TEXT,
      has_session INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT,
      category TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      scheduled_at TEXT,
      published_at TEXT,
      naver_url TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (current_timestamp),
      updated_at TEXT NOT NULL DEFAULT (current_timestamp)
    );

    CREATE INDEX IF NOT EXISTS idx_posts_status_scheduled
      ON posts(status, scheduled_at);
  `);

  // 기존 DB에 blog_id 컬럼 없으면 추가 (idempotent)
  const cols = sqlite
    .prepare(`PRAGMA table_info(accounts)`)
    .all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === 'blog_id')) {
    sqlite.exec(`ALTER TABLE accounts ADD COLUMN blog_id TEXT`);
  }
}
