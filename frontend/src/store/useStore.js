import { create } from 'zustand';

const THEME_STORAGE_KEY = 'app_theme';
const getStoredTheme = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(THEME_STORAGE_KEY);
};
const setStoredTheme = (theme) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
};

export const useStore = create((set) => ({
  selectedView: 'articles',
  setSelectedView: (view) => set({ selectedView: view }),
  theme: getStoredTheme() || 'light',
  setTheme: (theme) => {
    setStoredTheme(theme);
    set({ theme });
  },
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'light' ? 'dark' : 'light';
      setStoredTheme(next);
      return { theme: next };
    }),
}));
