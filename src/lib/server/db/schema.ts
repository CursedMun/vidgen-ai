import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const tasks = sqliteTable('tasks', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	title: text('title').notNull(),
	is_done: integer('is_done', { mode: 'boolean' }).notNull().default(false),
	created_at: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export const seedTasks: NewTask[] = [
	{ title: 'Read onboarding doc', is_done: true },
	{ title: 'Hook up Bun + Svelte + tRPC', is_done: false },
	{ title: 'Push the first Drizzle migration', is_done: false }
];

