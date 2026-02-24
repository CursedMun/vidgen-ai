import { schema, type TDatabase } from '../infrastructure/db/client';

export class AutomationService {
    constructor(private db: TDatabase) {}

    async setupCron(input: any) {
      const firstExecution = new Date().toISOString();
    
      return this.db.transaction((tx) => {
        const cron = tx.insert(schema.publicationCrons).values({
          presetId: input.presetId,
          title: `Auto: ${input.sourceUrl}`,
          scheduledAt: firstExecution,
          sourceUrl: input.sourceUrl,
          mediaType: input.mediaType,
          interval: input.interval,
          aiModel: input.aiModel,
          status: 'generating'
        }).returning().get(); 
    
        for (const account of input.selectedAccounts) {
          tx.insert(schema.cronExecutions).values({
            cronId: cron.id,
            youtubeAccountId: account.displayType === 'youtube' ? account.id : null,
            instagramAccountId: account.displayType === 'instagram' ? account.id : null,
            status: 'pending'
          }).run(); 
        }
    
        return cron;
      });
    }
}