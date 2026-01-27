import { Card, Badge, Button } from 'react-bootstrap';
import { BsHeart, BsHeartFill, BsBoxArrowUpRight } from 'react-icons/bs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function ArticleCard({ article, onFavorite, onRead }) {
  const handleClick = () => {
    onRead?.(article.id);
    window.open(article.link, '_blank', 'noopener,noreferrer');
  };

  const handleFavorite = (e) => {
    e.stopPropagation();
    onFavorite?.(article);
  };

  return (
    <Card className="mb-3 article-card" onClick={handleClick}>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start">
          <div className="flex-grow-1">
            <Card.Title className="line-clamp-2 mb-2">
              {article.title}
            </Card.Title>
            
            {article.description && (
              <Card.Text className="text-muted line-clamp-3 mb-3">
                {article.description}
              </Card.Text>
            )}

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <Badge bg="primary" pill>
                {article.feedSource}
              </Badge>
              
              <small className="text-muted">
                {format(new Date(article.pubDate), "dd 'de' MMM, yyyy", { locale: ptBR })}
              </small>

              {article.author && (
                <small className="text-muted">
                  {article.author}
                </small>
              )}
            </div>
          </div>

          <div className="d-flex gap-2 ms-3">
            <Button
              variant="link"
              onClick={handleFavorite}
              className={`p-2 ${article.isFavorite ? 'text-danger' : 'text-secondary'}`}
            >
              {article.isFavorite ? <BsHeartFill size={20} /> : <BsHeart size={20} />}
            </Button>
            
            <div className="p-2 text-secondary">
              <BsBoxArrowUpRight size={20} />
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}