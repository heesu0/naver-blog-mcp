import { and, eq, lte } from 'drizzle-orm';
import cron from 'node-cron';
import { env } from '../config.js';
import { db, schema } from '../db/client.js';
import { publishById } from '../services/publisher.js';

let task: cron.ScheduledTask | null = null;
let running = false;

export function startScheduler(): void {
  if (task) return;
  task = cron.schedule(env.SCHEDULER_CRON, runDuePosts, {
    timezone: 'Asia/Seoul',
  });
  console.log(`[scheduler] started (${env.SCHEDULER_CRON})`);
}

export function stopScheduler(): void {
  task?.stop();
  task = null;
}

async function runDuePosts(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const nowIso = new Date().toISOString();
    const due = await db.query.posts.findMany({
      where: and(
        eq(schema.posts.status, 'scheduled'),
        lte(schema.posts.scheduledAt, nowIso),
      ),
    });

    for (const post of due) {
      console.log(`[scheduler] firing post ${post.id} "${post.title}"`);
      try {
        await publishById(post.id);
      } catch (err) {
        console.error(`[scheduler] post ${post.id} failed`, err);
      }
    }
  } finally {
    running = false;
  }
}
