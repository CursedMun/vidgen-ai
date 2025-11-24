import { db, schema } from './index';
import { count } from 'drizzle-orm';

async function seed() {
	const existing = await db.select({ value: count() }).from(schema.tasks);

	if (existing[0]?.value) {
		console.info('Tasks already seeded, skipping');
		return;
	}

	await db.insert(schema.tasks).values(schema.seedTasks);
	console.info('Seeded tasks table with demo rows');
}

seed().catch((error) => {
	console.error(error);
	process.exit(1);
});

