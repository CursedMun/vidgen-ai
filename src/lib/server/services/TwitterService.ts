import path from 'node:path';
import type { TwitterApi } from 'twitter-api-v2';

export class TwitterService {
  constructor(private twitterApi: TwitterApi) {}

  /**
   * Posta um vídeo (Reels/Shorts do Sportiz)
   */
  public async postVideo(videoPath: string, caption: string) {
    try {
      const absolutePath = path.resolve(videoPath);
      console.log('🚀 Fazendo upload do vídeo para o X...');

      // O twitter-api-v2 cuida do chunking (INIT, APPEND, FINALIZE) automaticamente
      const mediaId = await this.twitterApi.v1.uploadMedia(absolutePath, {
        target: 'tweet',
      });

      const tweet = await this.twitterApi.v2.tweet({
        text: caption,
        media: { media_ids: [mediaId] }
      });

      console.log('✅ Vídeo postado no X! Tweet ID:', tweet.data.id);
      return tweet.data.id;
    } catch (error) {
      console.error('❌ Erro no Twitter Video:', error);
      throw error;
    }
  }

  /**
   * Posta uma foto (Thumbnail ou Infográfico)
   */
  public async postPhoto(imagePath: string, caption: string) {
      try {
        console.log('imagePath: ', imagePath);
        console.log("ENTROU AQUIIIIIII");

        const tweet =  await this.twitterApi.v2.tweet("Teste de postagem apenas texto!");
      // const absolutePath = path.resolve(imagePath);
      // const mediaId = await this.twitterApi.v1.uploadMedia(absolutePath);

      // const tweet = await this.twitterApi.v2.tweet({
      //   text: caption,
      //   media: { media_ids: [mediaId] }
      // });

      console.log('Photo posted on X! Tweet ID:', tweet.data.id);
      return tweet.data.id;
    } catch (error) {
      console.error('Error on Twitter Photo:', error);
      throw error;
    }
  }
}