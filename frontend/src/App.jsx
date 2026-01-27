import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { ArticlesPage } from './pages/ArticlesPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { useStore } from './store/useStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  const selectedView = useStore((state) => state.selectedView);
  const theme = useStore((state) => state.theme);

  useEffect(() => {
    document.body.classList.toggle('theme-dark', theme === 'dark');
    document.body.classList.toggle('theme-light', theme === 'light');
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="d-flex h-100 app-shell">
        <Navigation />
        
        <main className="flex-grow-1 d-flex flex-column overflow-hidden content-area">
          {selectedView === 'articles' && <ArticlesPage />}          
          {selectedView === 'favorites' && <FavoritesPage />}
        </main>
      </div>
    </QueryClientProvider>
  );
}

export default App;
