import { Hono } from 'hono';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '../db/client.js';
import { publishById } from '../services/publisher.js';

export const postsRouter = new Hono();

const CreateBody = z.object({
  accountId: z.number().int().positive(),
  title: z.string().min(1),
  content: z.string().min(1),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
});

postsRouter.get('/', async (c) => {
  const rows = await db.query.posts.findMany({
    orderBy: [desc(schema.posts.createdAt)],
    limit: 100,
  });
  return c.json(rows);
});

postsRouter.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const post = await db.query.posts.findFirst({
    where: eq(schema.posts.id, id),
  });
  if (!post) return c.json({ error: 'not_found' }, 404);
  return c.json(post);
});

postsRouter.post('/', async (c) => {
  const body = CreateBody.parse(await c.req.json());
  const status = body.scheduledAt ? 'scheduled' : 'draft';
  const [row] = await db
    .insert(schema.posts)
    .values({
      accountId: body.accountId,
      title: body.title,
      content: body.content,
      tags: body.tags?.join(','),
      category: body.category,
      status,
      scheduledAt: body.scheduledAt,
    })
    .returning();
  return c.json({ id: row?.id, status }, 201);
});

postsRouter.post('/:id/publish', async (c) => {
  const id = Number(c.req.param('id'));
  // 비동기 발행 (응답을 기다리지 않음 — 발행은 수십 초 걸림)
  publishById(id).catch((err) => {
    console.error(`[publish] post ${id} failed`, err);
  });
  return c.json({ accepted: true, id }, 202);
});

postsRouter.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  await db.delete(schema.posts).where(eq(schema.posts.id, id));
  return c.body(null, 204);
});
