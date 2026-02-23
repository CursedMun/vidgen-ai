import * as fs from 'fs';
import type { OpenAI } from 'openai';
import Parser from 'rss-parser';
import { schema, type TDatabase } from '../infrastructure/db/client';
import type { YoutubeService } from './YoutubeService';
export class TranscriberService {
  constructor(
    private db: TDatabase,
    private openai: OpenAI,
    private youtubeService: YoutubeService,
  ) {}


  private rssParser = new Parser();

  async getSourceContent(url: string): Promise<string> {
    console.log('Clever RSS. Iniciando parser...');
    try {
      const feed = await this.rssParser.parseURL(url);
      console.log('feed: ', feed);

      const firstItem = feed.items[0];
      console.log('firstItem: ', firstItem);

      if (!firstItem || !firstItem.contentSnippet) {
         return firstItem?.content || firstItem?.title || "Sem conteúdo disponível";
      }

      return firstItem.contentSnippet; // O parser já limpa tags HTML aqui
    } catch (error) {
      console.error('Erro ao ler RSS da Clever:', error);
      throw new Error('Falha ao obter dados do feed RSS');
    }
  }

  public async transcribeVideo(videoUrl: string): Promise<string> {
    let localFilePath: string | null = null;
    const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
    console.log('isYouTube: ', isYouTube);
    try {
      if (isYouTube) {
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
      } else {
        const transcription = await this.getSourceContent(videoUrl)
        console.log('transcription: getSourceContent ', transcription);
        return transcription
      }
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
    const transcription = await this.openai.audio.transcriptions.create({
      file: fs.createReadStream(localFilePath),
      model: "whisper-1",
    });

    return transcription.text;
  }
}
