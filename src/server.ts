import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { ZodError } from 'zod';
import { env } from './config.js';
import { runMigrations } from './db/client.js';
import { createMcpHttpRouter } from './mcp/http.js';
import { accountsRouter } from './routes/accounts.js';
import { postsRouter } from './routes/posts.js';
import { startScheduler } from './scheduler/cron.js';

runMigrations();

const app = new Hono();

app.get('/', (c) => c.json({ ok: true, name: 'blog-automation' }));
app.route('/accounts', accountsRouter);
app.route('/posts', postsRouter);
app.route('/', createMcpHttpRouter({ token: env.MCP_HTTP_TOKEN }));

app.onError((err, c) => {
  if (err instanceof ZodError) {
    return c.json({ error: 'validation', issues: err.issues }, 400);
  }
  console.error(err);
  return c.json({ error: 'internal', message: err.message }, 500);
});

startScheduler();

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`[server] listening on http://localhost:${info.port}`);
});
