import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '../db/client.js';
import { encrypt } from '../lib/crypto.js';
import { hasSession } from '../naver/session.js';

export const accountsRouter = new Hono();

const CreateBody = z.object({
  label: z.string().min(1),
  naverId: z.string().min(1),
  password: z.string().optional(),
});

accountsRouter.get('/', async (c) => {
  const rows = await db.query.accounts.findMany();
  return c.json(
    rows.map((a) => ({
      id: a.id,
      label: a.label,
      naverId: a.naverId,
      hasPassword: Boolean(a.encryptedPassword),
      hasSession: hasSession(a.naverId),
      createdAt: a.createdAt,
    })),
  );
});

accountsRouter.post('/', async (c) => {
  const body = CreateBody.parse(await c.req.json());
  const [row] = await db
    .insert(schema.accounts)
    .values({
      label: body.label,
      naverId: body.naverId,
      encryptedPassword: body.password ? encrypt(body.password) : null,
      hasSession: hasSession(body.naverId),
    })
    .returning();
  return c.json({ id: row?.id }, 201);
});

accountsRouter.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  await db.delete(schema.accounts).where(eq(schema.accounts.id, id));
  return c.body(null, 204);
});
