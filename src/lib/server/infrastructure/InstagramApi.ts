import wretch from 'wretch';
import QueryStringAddon from 'wretch/addons/queryString';

export class InstagramApi {
  private api = wretch('https://graph.facebook.com/v21.0').addon(QueryStringAddon);
  private userSelected: {accessToken: string, accoundId?: string} = {
    accessToken: '',
    accoundId: '',
  };

  public setAccountData(token: string, accountId: string) {
    this.userSelected.accessToken = token;
    this.userSelected.accoundId = accountId;
  }

  public async discoverBusinessAccount(token: string) {
    const response = await this.api
      .url('/me/accounts')
      .query({
        access_token: token,
      })
      .get()
      .json<any>();

    const pageId = response.data[0].id;
    const igData = await this.api
      .url(`/${pageId}`)
      .query({
        fields: "instagram_business_account",
        access_token: token
      })
      .get()
      .json<any>();

    return { id: igData.instagram_business_account.id };
  }

  public async exchangeForLongLivedToken(shortToken: string) {
    return this.api
      .url('/oauth/access_token')
      .query({
        grant_type: 'fb_exchange_token',
        client_id: "1195601955614147",
        client_secret: "503ead4dae36f16cec85e8c4e0d110ab",
        fb_exchange_token: shortToken
      })
      .get()
      .json<any>();
  }

  public async refreshLongLivedToken(accessToken: string) {
    return this.api
      .url('/refresh_access_token')
      .query({
        grant_type: 'ig_refresh_token',
        access_token: accessToken
      })
      .get()
      .json<{ access_token: string; expires_in: number; token_type: string }>();
  }

  public async uploadReel(videoUrl: string, caption: string) {
    try {
      console.log('🚀 Iniciando upload de Reel...');

      const containerRes = await this.api
        .url(`/${ this.userSelected.accoundId}/media`)
        .query({
          media_type: 'REELS',
          video_url: videoUrl,
          caption: caption,
          access_token: this.userSelected.accessToken,
          share_to_feed: true
        })
        .post()
        .json<any>();

      const creationId = containerRes.id;
      console.log(`Container created. ID: ${creationId}. Awaiting processing...`);

      await this.waitForMediaProcessing(creationId);

      const publishRes = await this.api
        .url(`/${ this.userSelected.accoundId}/media_publish`)
        .query({
          creation_id: creationId,
          access_token: this.userSelected.accessToken
        })
        .post()
        .json<any>();

      console.log('✅ Reels publicado! ID:', publishRes.id);
      return publishRes.id;
    } catch (error: any) {
      const errorData = error.response ? await error.response.json() : error;
      console.error('Instagram upload error:', JSON.stringify(errorData, null, 2));
      throw error;
    }
  }

  public async uploadImage(imageUrl: string, caption: string) {
    try {
      const containerRes = await this.api
        .url(`/${ this.userSelected.accoundId}/media`)
        .query({
          image_url: imageUrl,
          caption: caption,
          access_token: this.userSelected.accessToken
        })
        .post()
        .json<any>();

      const creationId = containerRes.id;
      console.log(`Container de imagem criado. ID: ${creationId}`);
      await this.waitForMediaProcessing(creationId);

      const publishRes = await this.api
        .url(`/${ this.userSelected.accoundId}/media_publish`)
        .query({
          creation_id: creationId,
          access_token: this.userSelected.accessToken
        })
        .post()
        .json<any>();

      console.log('ID:', publishRes.id);
      return publishRes.id;
    } catch (error) {
      console.error('Image upload error:', (error as any).message);
      throw error;
    }
  }

  private async waitForMediaProcessing(creationId: string) {
    let status = 'IN_PROGRESS';
    while (status !== 'FINISHED') {
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seg
      const res = await this.api
        .url(`/${creationId}`)
        .query({ fields: 'status_code,status', access_token: this.userSelected.accessToken })
        .get()
        .json<any>();
      status = res.status_code;
      if (status === 'ERROR') throw new Error('Instagram failed to process the video.');
      console.log(`Video status: ${status}`);
    }
  }
}