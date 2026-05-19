import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { env } from '../config.js';

mkdirSync(env.SESSION_DIR, { recursive: true });

export function sessionPath(naverId: string): string {
  const safe = naverId.replace(/[^a-zA-Z0-9_.-]/g, '_');
  return join(env.SESSION_DIR, `${safe}.json`);
}

export function hasSession(naverId: string): boolean {
  return existsSync(sessionPath(naverId));
}
