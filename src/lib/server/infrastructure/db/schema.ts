import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const channels = sqliteTable('channels', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  channel_name: text('channel_name').notNull(),
  channel_id: text('channel_id').notNull().unique(),
  fetch_interval_minutes: integer('fetch_interval_minutes')
    .notNull()
    .default(30),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  last_fetched_at: integer('last_fetched_at', { mode: 'timestamp' }),
  created_at: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Channel = typeof channels.$inferSelect;
export type NewChannel = typeof channels.$inferInsert;

export const transcriptions = sqliteTable('transcriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  channel_id: integer('channel_id').references(() => channels.id, {
    onDelete: 'cascade',
  }),
  video_id: text('video_id'),
  video_url: text('video_url').notNull(),
  thumbnail_url: text('thumbnail_url'),
  status: text('status').notNull().default('completed'), // pending, processing, completed, failed
  error_message: text('error_message'),
  transcript: text('transcript'),
  created_at: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
  started_at: integer('started_at', { mode: 'timestamp' }),
  completed_at: integer('completed_at', { mode: 'timestamp' }),
});

export const instagramAccounts = sqliteTable('instagram_accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  instagramBusinessId: text('instagram_business_id').notNull().unique(),
  accessToken: text('access_token').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$onUpdate(() => new Date())
});

export type InstagramAccounts = typeof instagramAccounts.$inferSelect;
export type Transcription = typeof transcriptions.$inferSelect;
export type NewTranscription = typeof transcriptions.$inferInsert;
