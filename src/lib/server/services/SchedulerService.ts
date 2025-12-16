import { eq } from 'drizzle-orm';
import type { TDatabase } from '../infrastructure/db/client';
import { transcriptions } from '../infrastructure/db/schema';
import type { TranscriberService } from './TranscriberService';
import type { YoutubeService } from './YoutubeService';

export class SchedulerService {
  private started: boolean = false;
  constructor(
    private db: TDatabase,
    private transcriberService: TranscriberService,
    private youtubeService: YoutubeService,
  ) {}
  public async init() {
    if (this.started) return;
    this.started = true;
    this.initTimer();
  }
  private async initTimer() {
    console.log('Scheduler tick at', new Date().toISOString());
    await this.processChannels();
    await this.processTranscriptions();
    setTimeout(() => {
      this.initTimer();
    }, 15000); // every 15 seconds
  }
  private async processChannels() {
    console.log('Processing channels...');
    const activeChannels = await this.db.query.channels.findMany({
      where: (channels, { eq }) => eq(channels.is_active, true),
    });
    for (const channel of activeChannels) {
      this.youtubeService.fetchChannelLatestVideo(channel);
    }
    console.log('Finished processing channels.');
  }
  private async processTranscriptions() {
    console.log('Processing transcriptions...');
    const pendingTranscriptions = await this.db.query.transcriptions.findMany({
      where: (t, { eq }) => eq(t.status, 'pending'),
      limit: 5, // Process max 5 at a time
    });
    for (const job of pendingTranscriptions) {
      this.processJob(job);
    }
    console.log('Finished processing transcriptions.');
  }
  private async processJob(job: typeof transcriptions.$inferSelect) {
    try {
      console.log(`Processing job ${job.id} for video: ${job.video_url}`);

      // Update status to processing
      await this.db
        .update(transcriptions)
        .set({
          status: 'processing',
          started_at: new Date(),
        })
        .where(eq(transcriptions.id, job.id));

      // Generate download ID for progress tracking
      const downloadId = `job_${job.id}_${Date.now()}`;

      // Transcribe the video
      const transcript = await this.transcriberService.transcribeVideo(
        job.video_url,
        downloadId,
      );

      // Update transcription as completed
      await this.db
        .update(transcriptions)
        .set({
          status: 'completed',
          transcript: transcript,
          completed_at: new Date(),
        })
        .where(eq(transcriptions.id, job.id));

      console.log(`Job ${job.id} completed successfully`);
    } catch (error) {
      console.error(`Error processing job ${job.id}:`, error);

      // Update transcription as failed
      await this.db
        .update(transcriptions)
        .set({
          status: 'failed',
          error_message:
            error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date(),
        })
        .where(eq(transcriptions.id, job.id));
    }
  }
}
