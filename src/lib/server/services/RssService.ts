export class RssService {
  constructor() {}
  public async fetchLatestRSSContent(rssUrl: string): Promise<{
    title: string;
    description: string;
  }> {
    try {
      const response = await fetch(rssUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch RSS feed: ${response.statusText}`);
      }

      const xmlText = await response.text();

      // Simple XML parsing to get the first item's description
      const itemMatch = xmlText.match(/<item>(.*?)<\/item>/s);
      if (!itemMatch) {
        throw new Error('No items found in RSS feed');
      }

      const titleMatch = itemMatch[1].match(/<title>(.*?)<\/title>/s);
      if (!titleMatch) {
        throw new Error('No title found in RSS item');
      }

      const descriptionMatch = itemMatch[1].match(
        /<description>(.*?)<\/description>/s,
      );
      if (!descriptionMatch) {
        throw new Error('No description found in RSS item');
      }

      // Decode HTML entities and clean up CDATA
      const title = titleMatch[1]
        .replace(/<!\[CDATA\[(.*?)\]\]>/s, '$1')
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .trim();

      const description = descriptionMatch[1]
        .replace(/<!\[CDATA\[(.*?)\]\]>/s, '$1')
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .trim();

      return { title, description };
    } catch (error: any) {
      console.error('Error fetching RSS feed:', error);
      throw new Error(`RSS fetch failed: ${error.message}`);
    }
  }
}
