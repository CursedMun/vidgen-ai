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

export const presets = sqliteTable('presets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(), // Ex: "Cinematic Sports", "TikTok Viral"
  imagePrompt: text('image_prompt').notNull(),
  videoPrompt: text('video_prompt').notNull(),
  audioPrompt: text('audio_prompt').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(false),
  avatar: text('avatar'),
  createdAt: text('created_at').default(new Date().toISOString())
});

export const youtubeAccounts = sqliteTable('youtube_accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('name'),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token').notNull(),
  expiryDate: integer('expiry_date'),
  clientId: text('client_id'),
});

export const publicationCrons = sqliteTable('publication_crons', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  presetId: integer('preset_id').notNull().references(() => presets.id),
  title: text('title').notNull(),
  description: text('description'),
  interval: text('interval').notNull(),
  sourceUrl: text('source_url'),
  videoPath: text('video_path'),
  mediaType: text('media_type').default('video'),
  aiModel: text('ai_model', { enum: ['veo', 'chatgpt'] }).default('chatgpt'),
  scheduledAt: text('scheduled_at').notNull(), // ISO String
  status: text('status').default('generating'), // generating -> pending -> completed
  createdAt: text('created_at').default(new Date().toISOString()),
});

export const cronExecutions = sqliteTable('cron_executions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  cronId: integer('cron_id').notNull().references(() => publicationCrons.id, { onDelete: 'cascade' }),
  youtubeAccountId: integer('youtube_account_id').references(() => youtubeAccounts.id),
  instagramAccountId: integer('instagram_account_id').references(() => instagramAccounts.id),

  status: text('status', { enum: ['pending', 'processing', 'completed', 'failed'] }).default('pending'),
  externalId: text('external_id'), // Link/ID of the post on the social media.
  errorMessage: text('error_message'),
  executedAt: text('executed_at'),
});

export type InstagramAccounts = typeof instagramAccounts.$inferSelect;
export type YoutubeAccounts = typeof youtubeAccounts.$inferSelect;
export type PublicationCrons = typeof publicationCrons.$inferSelect;
export type CronExecutions = typeof cronExecutions.$inferSelect;
export type Presets = typeof presets.$inferSelect;
export type Transcription = typeof transcriptions.$inferSelect;
export type NewTranscription = typeof transcriptions.$inferInsert;
