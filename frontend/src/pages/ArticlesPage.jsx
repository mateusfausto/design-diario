import { Container, Spinner, Alert, Button } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BsArrowClockwise, BsExclamationCircle, BsMoon, BsSun, BsArrowUp } from 'react-icons/bs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArticleCard } from '../components/ArticleCard';
import { Footer } from '../components/Footer';
import { FilterSection } from '../components/FilterSection';
import { articlesApi, userApi, favoritesStorage } from '../api/client';
import { useState, useMemo, useRef } from 'react';
import { useStore } from '../store/useStore';

export function ArticlesPage() {
  const queryClient = useQueryClient();
  const scrollContainerRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [sourceFilters, setSourceFilters] = useState([]);
  const theme = useStore((state) => state.theme);
  const toggleTheme = useStore((state) => state.toggleTheme);

  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['articles'],
    queryFn: articlesApi.getAllArticles,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    refetchIntervalInBackground: true,
  });

  const refreshMutation = useMutation({
    mutationFn: articlesApi.refreshArticles,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: userApi.toggleFavorite,
    onMutate: async (article) => {
      await queryClient.cancelQueries({ queryKey: ['articles'] });
      await queryClient.cancelQueries({ queryKey: ['favorites'] });

      const previousArticles = queryClient.getQueryData(['articles']);
      const previousFavorites = queryClient.getQueryData(['favorites']);
      const isCurrentlyFavorite = !!article.isFavorite;

      if (previousArticles?.articles) {
        queryClient.setQueryData(['articles'], {
          ...previousArticles,
          articles: previousArticles.articles.map((item) =>
            item.id === article.id ? { ...item, isFavorite: !isCurrentlyFavorite } : item
          ),
        });
      }

      if (previousFavorites?.favorites) {
        const nextFavorites = isCurrentlyFavorite
          ? previousFavorites.favorites.filter((item) => item.id !== article.id)
          : [...previousFavorites.favorites, { ...article, isFavorite: true }];
        queryClient.setQueryData(['favorites'], {
          ...previousFavorites,
          favorites: nextFavorites,
        });
      }

      return { previousArticles, previousFavorites };
    },
    onError: (error, article, context) => {
      if (context?.previousArticles) {
        queryClient.setQueryData(['articles'], context.previousArticles);
      }
      if (context?.previousFavorites) {
        queryClient.setQueryData(['favorites'], context.previousFavorites);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const readMutation = useMutation({
    mutationFn: userApi.markAsRead,
  });

  const articles = useMemo(() => {
    const baseArticles = data?.articles || [];
    const storedFavoriteIds = new Set(
      favoritesStorage.getFavorites().map((item) => item.id)
    );
    if (storedFavoriteIds.size === 0) {
      return baseArticles;
    }
    return baseArticles.map((article) =>
      storedFavoriteIds.has(article.id) ? { ...article, isFavorite: true } : article
    );
  }, [data?.articles]);

  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      const matchesSearch = article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (article.description && article.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesSource = sourceFilters.length === 0 || sourceFilters.includes(article.feedSource);

      const matchesPeriod = (() => {
        if (!periodFilter) {
          return true;
        }
        const articleDate = new Date(article.pubDate);
        if (Number.isNaN(articleDate.getTime())) {
          return false;
        }
        const now = new Date();
        if (periodFilter === 'today') {
          return articleDate.getFullYear() === now.getFullYear() &&
            articleDate.getMonth() === now.getMonth() &&
            articleDate.getDate() === now.getDate();
        }
        if (periodFilter === 'week') {
          const start = new Date(now);
          start.setDate(now.getDate() - 7);
          return articleDate >= start && articleDate <= now;
        }
        if (periodFilter === 'month') {
          const start = new Date(now);
          start.setDate(now.getDate() - 30);
          return articleDate >= start && articleDate <= now;
        }
        return true;
      })();
      
      return matchesSearch && matchesSource && matchesPeriod;
    });
  }, [articles, searchTerm, sourceFilters, periodFilter]);

  const sources = useMemo(() => {
    return [...new Set(articles.map(article => article.feedSource))].sort();
  }, [articles]);

  const loadingContent = (
    <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
      <div className="text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Carregando artigos...</p>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      loadingContent
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger" className="text-center">
          <BsExclamationCircle size={48} className="mb-3" />
          <h5>Erro ao carregar artigos</h5>
          <p>{error.message}</p>
          <Button variant="primary" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </Alert>
      </Container>
    );
  }

  const lastUpdatedLabel = dataUpdatedAt
    ? `Atualizado em ${format(new Date(dataUpdatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`
    : '';

  const handleManualRefresh = async () => {
    await refreshMutation.mutateAsync();
    await refetch();
  };

  const isManualRefreshing = refreshMutation.isPending;
  const isRefreshing = isFetching || isManualRefreshing;
  const handleScrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const handleTitleClick = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const isAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 8;
    if (isAtBottom) {
      handleScrollToTop();
    }
  };

  return (
    <div className="d-flex flex-column h-100 articles-page">
      <div className="border-bottom bg-white">
        <Container className="py-3 d-flex justify-content-between align-items-center">
          <div>
            <h2 className="mb-1 page-title-clickable" onClick={handleTitleClick}>
              DESIGN DIÁRIO
            </h2>
            <p className="text-muted mb-0 small">
              {articles.length} artigos disponíveis
            </p>
            {lastUpdatedLabel && (
              <p className="text-muted mb-0 small">
                {lastUpdatedLabel}
              </p>
            )}
          </div>
          <div className="d-flex align-items-center gap-2">
            <Button
              variant="outline-primary"
              onClick={handleManualRefresh}
              className="d-flex align-items-center gap-2"
              disabled={isRefreshing}
              aria-label="Atualizar artigos"
            >
              {isManualRefreshing ? <Spinner animation="border" size="sm" /> : <BsArrowClockwise />}
              <span className="d-none d-md-inline">
                {isManualRefreshing ? 'Atualizando' : 'Atualizar'}
              </span>
            </Button>
            <Button
              variant="outline-primary"
              onClick={toggleTheme}
              className="d-flex d-md-none align-items-center justify-content-center"
              aria-label="Alternar tema"
            >
              {theme === 'dark' ? <BsSun /> : <BsMoon />}
            </Button>
          </div>
        </Container>
      </div>

      <div className="articles-filters">
        <FilterSection
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          sourceFilters={sourceFilters}
          setSourceFilters={setSourceFilters}
          periodFilter={periodFilter}
          setPeriodFilter={setPeriodFilter}
          sources={sources}
          onClearFilters={() => {
            setSearchTerm('');
            setSourceFilters([]);
            setPeriodFilter('');
          }}
        />
      </div>

      <div className="flex-grow-1 overflow-auto" ref={scrollContainerRef}>
        <Container className="py-4">
          {isManualRefreshing ? (
            loadingContent
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted mb-2">
                {articles.length === 0 ? 'Nenhum artigo disponível no momento' : 'Nenhum artigo encontrado com os filtros aplicados'}
              </p>
              <small className="text-muted">
                {articles.length === 0 ? 'Atualize para buscar novos artigos' : 'Tente ajustar os filtros de pesquisa'}
              </small>
            </div>
          ) : (
            filteredArticles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onFavorite={(article) => favoriteMutation.mutate(article)}
                onRead={(id) => readMutation.mutate(id)}
              />
            ))
          )}
          <Footer />
        </Container>
      </div>
      <Button
        variant="primary"
        className="scroll-top-button d-flex align-items-center justify-content-center"
        onClick={handleScrollToTop}
        aria-label="Voltar ao topo"
      >
        <BsArrowUp />
      </Button>
    </div>
  );
}
