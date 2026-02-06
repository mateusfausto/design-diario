import { RSSService } from '../services/rssService.js';
import { defaultFeeds, getFeedsByCategory, getCategories } from '../config/feedSources.js';

const rssService = new RSSService();

let userFeeds = [...defaultFeeds];
let favorites = new Map();
let readArticles = new Set();
let cachedArticles = [];
let cachedErrors = null;
let cachedAt = 0;
let cachedTotalFeeds = 0;
let refreshPromise = null;
const cacheTtlMs = 5 * 60 * 1000;

const getActiveFeeds = () => userFeeds.filter(feed => feed.isActive);

const buildArticlesWithStatus = (articles) => {
  return articles.map(article => ({
    ...article,
    isFavorite: favorites.has(article.id),
    isRead: readArticles.has(article.id),
  }));
};

const isCacheFresh = () => cachedArticles.length > 0 && (Date.now() - cachedAt) < cacheTtlMs;

const storeCache = (result, totalFeeds) => {
  cachedArticles = result.articles;
  cachedErrors = result.errors;
  cachedAt = Date.now();
  cachedTotalFeeds = totalFeeds;
};

const refreshFeeds = async () => {
  if (refreshPromise) {
    return refreshPromise;
  }
  refreshPromise = (async () => {
    const activeFeeds = getActiveFeeds();
    const result = await rssService.fetchMultipleFeeds(activeFeeds);
    storeCache(result, activeFeeds.length);
    return { result, totalFeeds: activeFeeds.length };
  })();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
};

export const feedController = {
  getAllFeeds: async (req, res) => {
    res.json({
      feeds: userFeeds,
      categories: getCategories(),
    });
  },

  getFeedsByCategory: async (req, res) => {
    res.json(getFeedsByCategory());
  },

  getAllArticles: async (req, res) => {
    try {
      if (isCacheFresh()) {
        const articlesWithStatus = buildArticlesWithStatus(cachedArticles);
        return res.json({
          articles: articlesWithStatus,
          errors: cachedErrors,
          totalFeeds: cachedTotalFeeds || getActiveFeeds().length,
        });
      }

      if (cachedArticles.length > 0) {
        refreshFeeds().catch(() => {});
        const articlesWithStatus = buildArticlesWithStatus(cachedArticles);
        return res.json({
          articles: articlesWithStatus,
          errors: cachedErrors,
          totalFeeds: cachedTotalFeeds || getActiveFeeds().length,
        });
      }

      const { result, totalFeeds } = await refreshFeeds();
      const articlesWithStatus = buildArticlesWithStatus(result.articles);

      res.json({
        articles: articlesWithStatus,
        errors: result.errors,
        totalFeeds,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateFeedStatus: async (req, res) => {
    try {
      const { feedId } = req.params;
      const { isActive } = req.body;
      
      const feed = userFeeds.find(f => f.id === feedId);
      
      if (!feed) {
        return res.status(404).json({ error: 'Feed not found' });
      }

      feed.isActive = isActive;
      cachedArticles = [];
      cachedErrors = null;
      cachedAt = 0;
      cachedTotalFeeds = 0;
      res.json(feed);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  refreshFeeds: async () => {
    const { result } = await refreshFeeds();
    return result;
  },

  refreshArticles: async (req, res) => {
    try {
      const { result, totalFeeds } = await refreshFeeds();
      res.json({
        refreshedAt: new Date(cachedAt || Date.now()).toISOString(),
        totalFeeds,
        errors: result.errors,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  toggleFavorite: async (req, res) => {
    const { articleId } = req.params;
    const articleData = req.body;

    if (favorites.has(articleId)) {
      favorites.delete(articleId);
      res.json({ isFavorite: false, id: articleId });
    } else {
      // Armazena o artigo completo, garantindo que isFavorite seja true
      favorites.set(articleId, { ...articleData, isFavorite: true });
      res.json({ isFavorite: true, ...articleData });
    }
  },

  getFavorites: async (req, res) => {
    // Retorna os objetos de artigo completos armazenados no Map
    res.json({
      favorites: Array.from(favorites.values()),
    });
  },

  markAsRead: async (req, res) => {
    const { articleId } = req.params;
    readArticles.add(articleId);
    res.json({ isRead: true });
  },
};
