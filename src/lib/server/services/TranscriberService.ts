import type { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import { schema, type TDatabase } from '../infrastructure/db/client';
import type { YoutubeService } from './YoutubeService';

export class TranscriberService {
  constructor(
    private db: TDatabase,
    private ai: GoogleGenAI,
    private youtubeService: YoutubeService,
  ) {}

  public async transcribeVideo(videoUrl: string): Promise<string> {
    let localFilePath: string | null = null;

    try {
      localFilePath = await this.youtubeService.downloadAudio(videoUrl);
      const transcription = await this.transcribeAudio(localFilePath);
      const channelId = await this.youtubeService.getChannelId(videoUrl);
      const channel = await this.db.query.channels.findFirst({
        where: (c, { eq }) => eq(c.channel_id, channelId)
      });
      await this.db.insert(schema.transcriptions).values({
        video_url: videoUrl,
        channel_id: channel?.id,
        transcript: transcription,
        createdAt: new Date(),
      });

      return transcription;
    } catch (error) {
      console.error(
        'ERROR IN THE TRANSCRIPTION PROCESS (Gemini):',
        (error as Error).message,
      );
      throw new Error('Audio transcription error.');
    } finally {
      if (localFilePath) {
        await this.cleanupFiles(localFilePath).catch((err) =>
          console.error('Error:', err),
        );
      }
    }
  }
  public async transcribeLatestShort(
    channelName: string,
  ): Promise<{ videoUrl: string; transcript: string }> {
    const videoId =
      await this.youtubeService.getChannelLatestShortId(channelName);

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const transcript = await this.transcribeVideo(videoUrl);

    return { videoUrl, transcript };
  }

  private async cleanupFiles(_localFilePath: string): Promise<void> {
    // Optional: Delete file after transcription
    // For now, we keep the file in the downloads folder
    // Uncomment the line below if you want to delete files after transcription
    // await fs.promises.unlink(localFilePath)
  }
  private async transcribeAudio(localFilePath: string): Promise<string> {
    const audioPart = {
      inlineData: {
        data: fs.readFileSync(localFilePath).toString('base64'),
        mimeType: 'audio/mp3',
      },
    };
    // Define the transcription prompt.
    const prompt = `Transcribe the provided audio in its entirety. Output the transcription in the original spoken language. Do not add any comments, introductions, or extra formatting—only the transcribed text.`;
    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [audioPart, prompt],
      config: {
        temperature: 0.1,
      },
    });

    return response.text || '';
  }
}
