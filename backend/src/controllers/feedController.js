import { RSSService } from '../services/rssService.js';
import { defaultFeeds, getFeedsByCategory, getCategories } from '../config/feedSources.js';

const rssService = new RSSService();

let userFeeds = [...defaultFeeds];
let favorites = new Map();
let readArticles = new Set();

const getActiveFeeds = () => userFeeds.filter(feed => feed.isActive);

const refreshFeeds = async () => {
  const activeFeeds = getActiveFeeds();
  rssService.clearCache();
  const result = await rssService.fetchMultipleFeeds(activeFeeds);
  return { result, totalFeeds: activeFeeds.length };
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
      const activeFeeds = getActiveFeeds();
      const result = await rssService.fetchMultipleFeeds(activeFeeds);
      
      const articlesWithStatus = result.articles.map(article => ({
        ...article,
        isFavorite: favorites.has(article.id),
        isRead: readArticles.has(article.id),
      }));

      res.json({
        articles: articlesWithStatus,
        errors: result.errors,
        totalFeeds: activeFeeds.length,
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
        refreshedAt: new Date().toISOString(),
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
