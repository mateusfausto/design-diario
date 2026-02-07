import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
});

const FAVORITES_STORAGE_KEY = 'design-diario:favorites';

const getStoredFavorites = () => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((item) => ({ ...item, isFavorite: true }));
  } catch {
    return [];
  }
};

const setStoredFavorites = (favorites) => {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
};

const toggleStoredFavorite = (article) => {
  const favorites = getStoredFavorites();
  const existingIndex = favorites.findIndex((item) => item.id === article.id);

  if (existingIndex >= 0) {
    const nextFavorites = favorites.filter((item) => item.id !== article.id);
    setStoredFavorites(nextFavorites);
    return { isFavorite: false, id: article.id };
  }

  const nextFavorites = [...favorites, { ...article, isFavorite: true }];
  setStoredFavorites(nextFavorites);
  return { ...article, isFavorite: true };
};

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error || error.message || 'An error occurred';
    return Promise.reject(new Error(message));
  }
);

export const feedsApi = {
  getAllFeeds: () => api.get('/feeds'),
  updateFeedStatus: (feedId, isActive) => api.patch(`/feeds/${feedId}`, { isActive }),
};

export const articlesApi = {
  getAllArticles: () => api.get('/articles'),
  refreshArticles: () => api.post('/articles/refresh'),
};

export const userApi = {
  toggleFavorite: (article) => Promise.resolve(toggleStoredFavorite(article)),
  getFavorites: () => Promise.resolve({ favorites: getStoredFavorites() }),
  markAsRead: (articleId) => api.post(`/read/${encodeURIComponent(articleId)}`),
};

export const favoritesStorage = {
  getFavorites: getStoredFavorites,
  setFavorites: setStoredFavorites,
};

const ARTICLES_CACHE_KEY = 'design-diario:articles-cache';
const ARTICLES_CACHE_TTL_MS = 30 * 60 * 1000;
const getArticlesCache = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = localStorage.getItem(ARTICLES_CACHE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    const ts = parsed.cachedAt || 0;
    if (Date.now() - ts > ARTICLES_CACHE_TTL_MS) {
      return null;
    }
    if (!parsed.payload) {
      return null;
    }
    return { payload: parsed.payload, cachedAt: ts };
  } catch {
    return null;
  }
};
const setArticlesCache = (payload) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const value = JSON.stringify({ cachedAt: Date.now(), payload });
    localStorage.setItem(ARTICLES_CACHE_KEY, value);
  } catch {
    return;
  }
};

export const articlesCache = {
  get: getArticlesCache,
  set: setArticlesCache,
};

export default api;
