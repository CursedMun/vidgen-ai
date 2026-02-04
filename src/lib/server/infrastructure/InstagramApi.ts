import wretch from 'wretch';
import QueryStringAddon from 'wretch/addons/queryString';

export class InstagramApi {
  private api = wretch('https://graph.facebook.com/v21.0').addon(QueryStringAddon);
  private accessToken: string = '';
  constructor(
    private businessAccountId: string,
    private initialToken: string
  ) {}

public setAccessToken(token: string) {
  this.accessToken = token;
}

public async exchangeForLongLivedToken() {
    return this.api
      .url('/oauth/access_token')
      .query({
        grant_type: 'fb_exchange_token',
        client_id: "1195601955614147",
        client_secret: "503ead4dae36f16cec85e8c4e0d110ab",
        fb_exchange_token: this.initialToken
      })
      .get()
      .json<any>();
  }

  public async refreshLongLivedToken() {
    return this.api
      .url('/refresh_access_token')
      .query({
        grant_type: 'ig_refresh_token',
        access_token: this.accessToken
      })
      .get()
      .json<{ access_token: string; expires_in: number; token_type: string }>();
  }

  public async uploadReel(videoUrl: string, caption: string) {
    try {
      console.log('🚀 Iniciando upload de Reel...');

      const containerRes = await this.api
        .url(`/${this.businessAccountId}/media`)
        .query({
          media_type: 'REELS',
          video_url: videoUrl,
          caption: caption,
          access_token: this.accessToken,
          // Dica: O Instagram processa melhor se você definir o share_to_feed
          share_to_feed: true
        })
        .post()
        .json<any>();

      const creationId = containerRes.id;
      console.log(`Container created. ID: ${creationId}. Awaiting processing...`);

      // Aumentamos o tempo inicial de espera para vídeos
      await this.waitForMediaProcessing(creationId);

      const publishRes = await this.api
        .url(`/${this.businessAccountId}/media_publish`)
        .query({
          creation_id: creationId,
          access_token: this.accessToken
        })
        .post()
        .json<any>();

      console.log('✅ Reels publicado! ID:', publishRes.id);
      return publishRes.id;
    } catch (error: any) {
      // Captura erro detalhado do Wretch
      const errorData = error.response ? await error.response.json() : error;
      console.error('❌ Erro no upload do Instagram:', JSON.stringify(errorData, null, 2));
      throw error;
    }
  }

  public async uploadImage(imageUrl: string, caption: string) {
    try {
      console.log('📸 Iniciando upload de imagem para o Instagram...');

      // Passo 1: Criar o Container de Imagem
      const containerRes = await this.api
        .url(`/${this.businessAccountId}/media`)
        .query({
          image_url: imageUrl, // Campo específico para fotos
          caption: caption,
          access_token: this.accessToken
        })
        .post()
        .json<any>();

      const creationId = containerRes.id;
      console.log(`Container de imagem criado. ID: ${creationId}`);

      // 🔥 O SEGREDO: Imagens também precisam de um breve wait
        await this.waitForMediaProcessing(creationId);

      // Passo 2: Publicar a Imagem (Geralmente não precisa esperar processamento)
      const publishRes = await this.api
        .url(`/${this.businessAccountId}/media_publish`)
        .query({
          creation_id: creationId,
          access_token: this.accessToken
        })
        .post()
        .json<any>();

      console.log('Foto publicada com sucesso! ID:', publishRes.id);
      return publishRes.id;
    } catch (error) {
      console.error('Erro no upload de imagem:', (error as any).message);
      throw error;
    }
  }

  private async waitForMediaProcessing(creationId: string) {
    let status = 'IN_PROGRESS';
    while (status !== 'FINISHED') {
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seg
      const res = await this.api
        .url(`/${creationId}`)
        .query({ fields: 'status_code,status', access_token: this.accessToken })
        .get()
        .json<any>();
      status = res.status_code;
      if (status === 'ERROR') throw new Error('Instagram failed to process the video.');
      console.log(`Video status: ${status}`);
    }
  }
}