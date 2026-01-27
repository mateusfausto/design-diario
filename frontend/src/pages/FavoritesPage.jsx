import { Container, Button } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BsHeart, BsMoon, BsSun, BsArrowUp } from 'react-icons/bs';
import { ArticleCard } from '../components/ArticleCard';
import { userApi } from '../api/client';
import { useStore } from '../store/useStore';
import { Footer } from '../components/Footer';
import { useRef } from 'react';

export function FavoritesPage() {
  const queryClient = useQueryClient();
  const scrollContainerRef = useRef(null);
  const theme = useStore((state) => state.theme);
  const toggleTheme = useStore((state) => state.toggleTheme);

  const { data: favoritesResponse, isLoading, error } = useQuery({
    queryKey: ['favorites'],
    queryFn: userApi.getFavorites,
  });

  const favoriteArticles = favoritesResponse?.favorites || [];

  const favoriteMutation = useMutation({
    mutationFn: userApi.toggleFavorite,
    onMutate: async (article) => {
      await queryClient.cancelQueries({ queryKey: ['favorites'] });
      await queryClient.cancelQueries({ queryKey: ['articles'] });

      const previousFavorites = queryClient.getQueryData(['favorites']);
      const previousArticles = queryClient.getQueryData(['articles']);
      const isCurrentlyFavorite = !!article.isFavorite;

      if (previousFavorites?.favorites) {
        const nextFavorites = isCurrentlyFavorite
          ? previousFavorites.favorites.filter((item) => item.id !== article.id)
          : [...previousFavorites.favorites, { ...article, isFavorite: true }];
        queryClient.setQueryData(['favorites'], {
          ...previousFavorites,
          favorites: nextFavorites,
        });
      }

      if (previousArticles?.articles) {
        queryClient.setQueryData(['articles'], {
          ...previousArticles,
          articles: previousArticles.articles.map((item) =>
            item.id === article.id ? { ...item, isFavorite: !isCurrentlyFavorite } : item
          ),
        });
      }

      return { previousFavorites, previousArticles };
    },
    onError: (error, article, context) => {
      if (context?.previousFavorites) {
        queryClient.setQueryData(['favorites'], context.previousFavorites);
      }
      if (context?.previousArticles) {
        queryClient.setQueryData(['articles'], context.previousArticles);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
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
    <div className="d-flex flex-column h-100">
      <div className="border-bottom bg-white">
        <Container className="py-3 d-flex justify-content-between align-items-center">
          <div>
            <h2 className="mb-1 page-title-clickable" onClick={handleTitleClick}>
              DESIGN DIÁRIO
            </h2>
            <p className="text-muted mb-0 small">
              {favoriteArticles.length} artigos favoritados
            </p>
          </div>
          <Button
            variant="outline-primary"
            onClick={toggleTheme}
            className="d-flex d-md-none align-items-center justify-content-center"
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? <BsSun /> : <BsMoon />}
          </Button>
        </Container>
      </div>

      <div className="flex-grow-1 overflow-auto" ref={scrollContainerRef}>
        <Container className="py-4">
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Carregando...</span>
              </div>
              <p className="mt-3 text-muted">Carregando favoritos...</p>
            </div>
          ) : error ? (
            <div className="text-center py-5">
              <p className="text-danger mb-2">Erro ao carregar favoritos</p>
              <small className="text-muted">{error.message}</small>
            </div>
          ) : favoriteArticles.length === 0 ? (
            <div className="text-center py-5">
              <BsHeart size={48} className="text-muted mb-3" />
              <p className="text-muted mb-2">Nenhum artigo favoritado ainda</p>
              <small className="text-muted">
                Clique no ícone de coração nos artigos para salvá-los aqui
              </small>
            </div>
          ) : (
            favoriteArticles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onFavorite={(article) => favoriteMutation.mutate(article)}
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
