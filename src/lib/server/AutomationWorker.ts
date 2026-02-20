import { schema, type TDatabase } from '@/server/infrastructure/db/client';
import type { InstagramService } from '@/server/services/InstagramService';
import type { TranscriberService } from '@/server/services/TranscriberService';
import type { VideoService } from '@/server/services/VideoService';
import type { YoutubeService } from '@/server/services/YoutubeService';
import { and, eq, lte } from 'drizzle-orm';

export class AutomationWorker {
  constructor(
    private db: TDatabase,
    private transcriberService: TranscriberService,
    private videoService: VideoService,
    private youtubeService: YoutubeService,
    private instagramService: InstagramService) {}

  async processPendingCrons() {
    const cronsToProcess = await this.db.select().from(schema.publicationCrons)
      .where(
        and(
          eq(schema.publicationCrons.status, 'generating'),
          lte(schema.publicationCrons.scheduledAt, new Date().toISOString())
        )
      );

    for (const cron of cronsToProcess) {
      try {
        await this.db.update(schema.publicationCrons)
          .set({ status: 'processing' })
          .where(eq(schema.publicationCrons.id, cron.id));
        console.log(`🚀 Processando Cron: ${cron.title}`);
        if (!cron.sourceUrl)  throw new Error("Url não encontrada");

        const transcription = await this.transcriberService.transcribeVideo(cron.sourceUrl?.trim());
        console.log('transcription: ====>', transcription);
        const [preset] = await this.db.select().from(schema.presets)
          .where(eq(schema.presets.id, cron.presetId));

        if (!preset) throw new Error("Preset não encontrado");
        let finalFilePath = "";
        if (cron.mediaType === 'Video') {
          finalFilePath = await this.videoService.generateVideo(preset.videoPrompt, preset.audioPrompt, transcription, cron.aiModel);
        } else {
          finalFilePath = await this.videoService.generatePhoto(preset.imagePrompt, transcription);
        }

        await this.db.update(schema.publicationCrons)
          .set({ videoPath: finalFilePath, status: 'pending' })
          .where(eq(schema.publicationCrons.id, cron.id));

        const executions = await this.db.select().from(schema.cronExecutions)
          .where(eq(schema.cronExecutions.cronId, cron.id));

        for (const exe of executions) {
          try {
            await this.db.update(schema.cronExecutions)
              .set({ status: 'processing' })
              .where(eq(schema.cronExecutions.id, exe.id));

            let externalId = "";

            // YouTube
            if (exe.youtubeAccountId) {
              const [acc] = await this.db.select().from(schema.youtubeAccounts).where(eq(schema.youtubeAccounts.id, exe.youtubeAccountId));
              externalId = (await this.youtubeService.uploadShort(finalFilePath, cron.title, cron.description || "", acc.id))?.videoId as string;
            }
            // Instagram
            else if (exe.instagramAccountId) {
              const [acc] = await this.db.select().from(schema.instagramAccounts).where(eq(schema.instagramAccounts.id, exe.instagramAccountId));
              await this.instagramService.setCurrentUser(Number(acc.id))
              console.log('finalFilePath: ', finalFilePath);
              externalId = await this.instagramService.uploadToInstagram(finalFilePath, cron.title, cron.mediaType);
            }

            await this.db.update(schema.cronExecutions)
              .set({
                status: 'completed',
                externalId: externalId,
                executedAt: new Date().toISOString()
              })
              .where(eq(schema.cronExecutions.id, exe.id));

          } catch (exeError: any) {
            console.error(`Erro na conta ${exe.id}:`, exeError);
            await this.db.update(schema.cronExecutions)
              .set({ status: 'failed', errorMessage: exeError?.message })
              .where(eq(schema.cronExecutions.id, exe.id));
          }
        }

        // Finaliza o Cron Master
        await this.db.update(schema.publicationCrons)
          .set({ status: 'completed' })
          .where(eq(schema.publicationCrons.id, cron.id));

      } catch (error) {
        console.error(`Falha crítica no Cron ${cron.id}:`, error);
        await this.db.update(schema.publicationCrons)
          .set({ status: 'failed' })
          .where(eq(schema.publicationCrons.id, cron.id));
      }
    }
  }
}