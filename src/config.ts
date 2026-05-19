import 'dotenv/config';
import { z } from 'zod';
import { getOrCreateEncryptionKey, paths } from './lib/paths.js';

const Env = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  SCHEDULER_CRON: z.string().default('* * * * *'),
  HEADLESS: z
    .string()
    .default('true')
    .transform((v) => v.toLowerCase() !== 'false'),
  /** MCP HTTP 엔드포인트 Bearer 토큰. 미설정 시 인증 없음 */
  MCP_HTTP_TOKEN: z.string().optional(),
});

const parsed = Env.parse(process.env);

export const env = {
  ...parsed,
  ENCRYPTION_KEY: getOrCreateEncryptionKey(),
  DATABASE_URL: paths.db,
  SESSION_DIR: paths.sessions,
};
