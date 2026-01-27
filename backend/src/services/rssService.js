import Parser from 'rss-parser';
import NodeCache from 'node-cache';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'RSS Design Hub/1.0',
  },
});

const cache = new NodeCache({ stdTTL: 600 });

export class RSSService {
  async fetchFeed(feedUrl, feedName) {
    try {
      const cacheKey = `feed_${feedUrl}`;
      const cachedData = cache.get(cacheKey);
      
      if (cachedData) {
        return cachedData;
      }

      const feed = await parser.parseURL(feedUrl);
      
      const articles = feed.items.map(item => ({
        id: item.guid || item.link || `${Date.now()}_${Math.random()}`,
        title: item.title || 'Sem título',
        description: item.contentSnippet || item.content || item.summary,
        content: item.content || item.contentSnippet,
        link: item.link || '',
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
        author: item.creator || item.author,
        feedSource: feedName,
        imageUrl: this.extractImage(item),
      }));

      articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
      cache.set(cacheKey, articles);

      return articles;
    } catch (error) {
      console.error(`Error fetching feed ${feedName}:`, error.message);
      throw new Error(`Failed to fetch feed: ${error.message}`);
    }
  }

  async fetchMultipleFeeds(feeds) {
    const results = await Promise.allSettled(
      feeds.map(feed => this.fetchFeed(feed.url, feed.name))
    );

    const allArticles = [];
    const errors = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allArticles.push(...result.value);
      } else {
        errors.push({
          feed: feeds[index].name,
          error: result.reason.message,
        });
      }
    });

    allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    return {
      articles: allArticles,
      errors: errors.length > 0 ? errors : null,
    };
  }

  extractImage(item) {
    if (item.enclosure?.url) {
      return item.enclosure.url;
    }
    
    if (item['media:thumbnail']?.$?.url) {
      return item['media:thumbnail'].$.url;
    }

    if (item.content) {
      const imgMatch = item.content.match(/<img[^>]+src="([^">]+)"/);
      if (imgMatch) {
        return imgMatch[1];
      }
    }

    return null;
  }

  clearCache() {
    cache.flushAll();
  }
}
