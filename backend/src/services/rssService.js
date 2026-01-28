import Parser from 'rss-parser';
import NodeCache from 'node-cache';
import axios from 'axios';

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

      const feed = await this.resolveAndParseFeed(feedUrl);
      
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

  async resolveAndParseFeed(feedUrl) {
    const initial = await this.fetchUrl(feedUrl);
    const contentType = initial.headers['content-type'] || '';
    const isHtml = contentType.includes('text/html');
    const isJson = contentType.includes('application/json') || contentType.includes('application/feed+json');
    const isXml = contentType.includes('xml') || initial.data?.startsWith('<?xml');

    if (isJson) {
      return this.parseJsonFeed(initial.data);
    }
    if (isXml) {
      return parser.parseString(this.sanitizeXml(initial.data));
    }

    if (isHtml) {
      const discovered = this.discoverFeedFromHtml(initial.data, feedUrl);
      if (discovered) {
        const resolved = await this.fetchUrl(discovered);
        const ct = resolved.headers['content-type'] || '';
        if (ct.includes('application/feed+json') || ct.includes('application/json')) {
          return this.parseJsonFeed(resolved.data);
        }
        return parser.parseString(this.sanitizeXml(resolved.data));
      }
    }

    const fallback = await this.tryCommonFeedPaths(feedUrl);
    if (fallback) {
      const ct = fallback.headers['content-type'] || '';
      if (ct.includes('application/feed+json') || ct.includes('application/json')) {
        return this.parseJsonFeed(fallback.data);
      }
      return parser.parseString(this.sanitizeXml(fallback.data));
    }

    // last resort: try direct parse assuming XML
    return parser.parseString(this.sanitizeXml(initial.data));
  }

  async fetchUrl(url) {
    return axios.get(url, {
      timeout: 12000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'RSS Design Hub/1.0',
        Accept: 'application/rss+xml,application/xml,text/xml,application/atom+xml,application/feed+json;q=0.9,*/*;q=0.8',
      },
    });
  }

  discoverFeedFromHtml(html, baseUrl) {
    try {
      const linkRegex = /<link[^>]+rel=["']alternate["'][^>]+type=["'](application\/(?:rss\+xml|atom\+xml|xml)|application\/feed\+json)["'][^>]+href=["']([^"']+)["']/gi;
      let match;
      const candidates = [];
      while ((match = linkRegex.exec(html)) !== null) {
        const href = match[2];
        candidates.push(this.toAbsoluteUrl(href, baseUrl));
      }
      return candidates[0] || null;
    } catch {
      return null;
    }
  }

  toAbsoluteUrl(href, baseUrl) {
    try {
      return new URL(href, baseUrl).toString();
    } catch {
      return href;
    }
  }

  async tryCommonFeedPaths(feedUrl) {
    const url = new URL(feedUrl);

    // Medium heuristics
    if (url.hostname.endsWith('.medium.com') && !url.pathname.endsWith('/feed')) {
      url.pathname = url.pathname.replace(/\/$/, '') + '/feed';
      try { return await this.fetchUrl(url.toString()); } catch {}
    }
    if (url.hostname === 'medium.com' && !url.pathname.startsWith('/feed/')) {
      url.pathname = '/feed' + (url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname);
      try { return await this.fetchUrl(url.toString()); } catch {}
    }

    const paths = [
      '/feed',
      '/feed/',
      '/feed.xml',
      '/rss',
      '/rss.xml',
      '/index.xml',
      '/atom.xml',
      '/blog/feed',
      '/blog/feed/',
    ];

    for (const p of paths) {
      const test = new URL(url.origin + p);
      try {
        const res = await this.fetchUrl(test.toString());
        if ((res.headers['content-type'] || '').includes('xml') || (res.data && typeof res.data === 'string')) {
          return res;
        }
      } catch {
        // continue trying
      }
    }
    return null;
  }

  parseJsonFeed(json) {
    const data = typeof json === 'string' ? JSON.parse(json) : json;
    const items = (data.items || []).map((item) => ({
      guid: item.id || item.url,
      title: item.title,
      content: item.content_html || item.content_text,
      contentSnippet: item.summary || item.content_text,
      link: item.url,
      pubDate: item.date_published || item.date_modified,
      author: Array.isArray(data.authors) ? data.authors.map(a => a.name).join(', ') : data.author?.name,
      enclosure: item.image ? { url: item.image } : undefined,
    }));
    return { items };
  }
  sanitizeXml(rawXml) {
    const htmlEntityMap = {
      nbsp: '&#160;',
      ndash: '&#8211;',
      mdash: '&#8212;',
      hellip: '&#8230;',
      copy: '&#169;',
      reg: '&#174;',
      trade: '&#8482;',
      rsquo: '&#8217;',
      lsquo: '&#8216;',
      rdquo: '&#8221;',
      ldquo: '&#8220;',
    };

    let sanitized = rawXml.replace(/&([a-zA-Z]+);/g, (match, entity) => {
      if (['amp', 'lt', 'gt', 'quot', 'apos'].includes(entity)) {
        return match;
      }
      if (htmlEntityMap[entity]) {
        return htmlEntityMap[entity];
      }
      return `&amp;${entity};`;
    });

    sanitized = sanitized.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g, '&amp;');
    return sanitized;
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
