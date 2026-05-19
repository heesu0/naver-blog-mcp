import { mkdirSync, existsSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, isAbsolute } from 'node:path';
import { randomBytes } from 'node:crypto';

/**
 * 데이터 디렉토리. 우선순위:
 *   BLOG_AUTOMATION_HOME > ~/.blog-automation
 */
const baseDir =
  process.env.BLOG_AUTOMATION_HOME ?? join(homedir(), '.blog-automation');

function resolve(p: string, fallback: string): string {
  return isAbsolute(p) ? p : join(baseDir, fallback);
}

export const paths = {
  base: baseDir,
  db: process.env.DATABASE_URL ?? join(baseDir, 'app.db'),
  sessions: process.env.SESSION_DIR ?? join(baseDir, 'sessions'),
  keyFile: join(baseDir, '.encryption-key'),
};

// resolve relative DATABASE_URL/SESSION_DIR against baseDir
paths.db = isAbsolute(paths.db) ? paths.db : resolve(paths.db, 'app.db');
paths.sessions = isAbsolute(paths.sessions)
  ? paths.sessions
  : resolve(paths.sessions, 'sessions');

mkdirSync(baseDir, { recursive: true });
mkdirSync(dirname(paths.db), { recursive: true });
mkdirSync(paths.sessions, { recursive: true });

/**
 * 암호화 키 획득. 우선순위:
 *   1. ENCRYPTION_KEY 환경변수 (64 hex chars)
 *   2. ~/.blog-automation/.encryption-key 파일
 *   3. 새로 생성해서 파일로 저장
 */
export function getOrCreateEncryptionKey(): string {
  const fromEnv = process.env.ENCRYPTION_KEY;
  if (fromEnv) {
    if (!/^[0-9a-fA-F]{64}$/.test(fromEnv)) {
      throw new Error('ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
    }
    return fromEnv;
  }
  if (existsSync(paths.keyFile)) {
    const v = readFileSync(paths.keyFile, 'utf8').trim();
    if (/^[0-9a-fA-F]{64}$/.test(v)) return v;
    // file corrupted, regenerate
  }
  const fresh = randomBytes(32).toString('hex');
  writeFileSync(paths.keyFile, fresh, 'utf8');
  try {
    // best-effort: restrict perms (no-op on Windows)
    chmodSync(paths.keyFile, 0o600);
  } catch {
    /* ignore */
  }
  return fresh;
}
