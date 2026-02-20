import { schema, type TDatabase } from '../infrastructure/db/client';
export class AutomationService {
    constructor(private db: TDatabase) {}

    async setupCron(input: any) {
      const ytAccounts = input.platforms.youtube
        ? await this.db.select().from(schema.youtubeAccounts)
        : [];
      const igAccounts = input.platforms.instagram
        ? await this.db.select().from(schema.instagramAccounts)
        : [];

      const firstExecution = new Date().toISOString();

      return this.db.transaction((tx: any) => {
        const [cron] = tx.insert(schema.publicationCrons).values({
          presetId: input.presetId,
          title: `Auto: ${input.sourceUrl}`,
          scheduledAt: firstExecution,
          sourceUrl: input.sourceUrl,
          mediaType: input.mediaType,
          interval: input.interval,
          aiModel: input.aiModel,
          status: 'generating'
        }).returning().all();

        // YouTube
        for (const acc of ytAccounts) {
          tx.insert(schema.cronExecutions).values({
            cronId: cron.id,
            youtubeAccountId: acc.id,
            status: 'pending'
          }).run();
        }

        // Instagram
        for (const acc of igAccounts) {
          tx.insert(schema.cronExecutions).values({
            cronId: cron.id,
            instagramAccountId: acc.id,
            status: 'pending'
          }).run();
        }

        return cron;
      });
    }
  }