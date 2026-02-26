import wretch from 'wretch';
import QueryStringAddon from 'wretch/addons/queryString';

interface YoutubeThumbnail {
  url: string;
  width: number;
  height: number;
}

interface YoutubeThumbnails {
  default: YoutubeThumbnail;
  medium: YoutubeThumbnail;
  high: YoutubeThumbnail;
}

interface YoutubeSnippet {
  publishedAt: string;
  channelId: string;
  title: string;
  description: string;
  thumbnails: YoutubeThumbnails;
  channelTitle: string;
  liveBroadcastContent: string;
  publishTime: string;
}

interface YoutubeSearchResultId {
  kind: string;
  videoId: string;
}

interface YoutubeSearchResultItem {
  kind: string;
  etag: string;
  id: YoutubeSearchResultId;
  snippet: YoutubeSnippet;
}

interface YoutubePageInfo {
  totalResults: number;
  resultsPerPage: number;
}

export interface YoutubeSearchResponse {
  kind: string;
  etag: string;
  nextPageToken?: string;
  regionCode: string;
  pageInfo: YoutubePageInfo;
  items: YoutubeSearchResultItem[];
}

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
      return res.items;
    } catch (error) {
      console.error('Error searching for channel:', (error as Error).message);
      return null;
    }
  }
  public async channels(params: Record<string, any>): Promise<any> {
    params.key = this.apiKey;
    try {
      const res = await this.googleAPI
        .url('/channels')
        .query(params)
        .get()
        .json<any>();
      return res.items;
    } catch (error) {
      console.error('Error searching for channel:', (error as Error).message);
      return null;
    }
  }
  public async getVideos(params: Record<string, any>): Promise<any> {
    params.key = this.apiKey;
    try {
      const res = await this.googleAPI
        .url('/videos')
        .query(params)
        .get()
        .json<any>();
      return res.items;
    } catch (error) {
      console.error('Error fetching video data:', (error as Error).message);
      return null;
    }
  }
  public async findChannelIdByName(name: string): Promise<string | null> {
    const params = {
      part: 'snippet',
      q: name,
      type: 'channel',
      maxResults: 10,
    };
    const items = await this.search(params);
    return items && items.length ? items[0].id.channelId : null;
  }
  public async findChannelByUsername(username: string): Promise<any> {
    const params = {
      part: 'snippet',
      forHandle: `@${username}`,
    };
    const items = await this.channels(params);
    return items && items.length ? items[0].id : null;
  }
  public async findChannelIdByUrl(videoId: string): Promise<string | null> {
    const params = {
      part: 'snippet',
      id: videoId,
      maxResults: 1,
    };
    const items = await this.getVideos(params);
    return items && items.length ? items[0].snippet.channelId : null;
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
  public async findLatestShorts(
    channelId: string,
  ): Promise<YoutubeSearchResponse['items'] | null> {
    const params = {
      part: 'snippet',
      channelId: channelId,
      type: 'video',
      videoDuration: 'short',
      order: 'date',
      maxResults: 10,
    };
    const response = await this.search(params);
    if (!response) return null;

    return response;
  }

  public extractVideoId(url: string): string | null {
    const regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?)|(shorts\/))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match.length >= 8) {
      const id = match[match.length - 1];
      return id.length === 11 ? id : null;
    }

    return null;
  }

  public async getChannelIdFromVideo(videoUrl: string) {
    const videoId = this.extractVideoId(videoUrl);

    if (!videoId) return;

    try {
      const videoResponse = await this.googleAPI
        .url('/videos')
        .query({
          part: 'snippet',
          id: videoId,
          key: this.apiKey,
        })
        .get()
        .json<any>();

      if (videoResponse.items.length === 0) return;

      const channelId = videoResponse?.items[0]?.snippet?.channelId;

      if (!channelId) return;
      return channelId;
    } catch (error) {
      console.error(
        'Error searching for channel id:',
        (error as Error).message,
      );
      return null;
    }
  }
}
