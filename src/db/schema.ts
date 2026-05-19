import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const accounts = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  label: text('label').notNull(),
  naverId: text('naver_id').notNull().unique(),
  /** 블로그 URL의 ID. naverId와 다를 수 있음. 미지정 시 발행 시 자동 추출 시도 */
  blogId: text('blog_id'),
  encryptedPassword: text('encrypted_password'),
  hasSession: integer('has_session', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const POST_STATUSES = [
  'draft',
  'scheduled',
  'publishing',
  'published',
  'failed',
] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const posts = sqliteTable('posts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  tags: text('tags'),
  category: text('category'),
  status: text('status', { enum: POST_STATUSES }).notNull().default('draft'),
  scheduledAt: text('scheduled_at'),
  publishedAt: text('published_at'),
  naverUrl: text('naver_url'),
  errorMessage: text('error_message'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(current_timestamp)`),
});

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
