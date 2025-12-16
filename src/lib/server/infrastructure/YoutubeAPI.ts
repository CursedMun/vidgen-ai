import wretch from 'wretch';
import QueryStringAddon from 'wretch/addons/queryString';

export class YoutubeApi {
  private googleAPI = wretch('https://www.googleapis.com/youtube/v3').addon(
    QueryStringAddon,
  );
  constructor(private apiKey: string) {}

  public async search(params: Record<string, any>): Promise<any> {
    params.key = this.apiKey;
    try {
      const res = await this.googleAPI
        .url('/search')
        .query(params)
        .get()
        .json<any>();
      return res.data.items;
    } catch (error) {
      console.error('Error searching for channel:', (error as Error).message);
      return null;
    }
  }
  public async findChannelIdByName(name: string): Promise<string | null> {
    const params = {
      part: 'snippet',
      q: name,
      type: 'channel',
      maxResults: 1,
    };
    const items = await this.search(params);
    return items && items.length ? items[0].id.channelId : null;
  }
  public async findLatestShortId(channelId: string): Promise<string | null> {
    const params = {
      part: 'snippet',
      channelId: channelId,
      type: 'video',
      videoDuration: 'short',
      order: 'date',
      maxResults: 1,
    };
    const items = await this.search(params);
    return items && items.length ? items[0].id.videoId : null;
  }
}
