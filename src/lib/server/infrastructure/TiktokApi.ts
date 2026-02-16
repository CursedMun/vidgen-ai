import fs from 'node:fs';
import wretch from 'wretch';
import QueryStringAddon from 'wretch/addons/queryString';

export class TiktokApi {
  private api = wretch('https://open.tiktokapis.com/v2').addon(QueryStringAddon);

  constructor(
    private clientKey: string,
    private clientSecret: string,
    private redirectUri: string
  ) {}

  public async getAccessToken(code: string): Promise<any> {
    try {
      const body = new URLSearchParams({
        client_key: this.clientKey,
        client_secret: this.clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      });

      return await this.api
        .url('/oauth/token/')
        .headers({ 'Content-Type': 'application/x-www-form-urlencoded' })
        .body(body.toString())
        .post()
        .json();
    } catch (error) {
      console.error('Error fetching access token:', (error as Error).message);
      return null;
    }
  }

  public generateAuthUrl(state: string = 'sportiz_auth'): string {
    const rootUrl = 'https://www.tiktok.com/v2/auth/authorize/';
    const options = {
      client_key: this.clientKey,
      scope: 'user.info.basic,video.upload',
      response_type: 'code',
      redirect_uri: this.redirectUri,
      state: state,
    };

    const qs = new URLSearchParams(options).toString();
    return `${rootUrl}?${qs}`;
  }


  public async uploadToDrafts(videoPath: string, title: string) {
    const fileStats = fs.statSync(videoPath);
    const authUrl = this.generateAuthUrl()
    const authData = await this.getAccessToken(authUrl);
    try {
      const initRes = await wretch("/post/publish/video/init/")
        .headers({
          'Authorization': `Bearer ${authData?.access_token}`,
          'Content-Type': 'application/json; charset=UTF-8'
        })
        .post({
          source_info: {
            source: "FILE_UPLOAD",
            video_size: fileStats.size,
            chunk_size: fileStats.size,
            total_chunk_count: 1
          },
          post_info: {
            title: title,
            privacy_level: "PUBLIC_TO_EVERYONE"
          }
        })
        .json<any>();

      const { upload_url, publish_id } = initRes.data;

      // Upload
      const videoBuffer = fs.readFileSync(videoPath);
      await fetch(upload_url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': fileStats.size.toString()
        },
        body: videoBuffer
      });

      console.log(`Sent to Drafts! ID: ${publish_id}`);
      return publish_id;
    } catch (error) {
      console.error('Error uploading:', error);
      throw error;
    }
  }
}