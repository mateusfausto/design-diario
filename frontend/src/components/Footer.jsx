import { Container } from 'react-bootstrap';

export function Footer() {
  return (
    <div className="border-top bg-white">
      <Container className="py-4">
        <h5 className="mb-2">DESIGN DIÁRIO</h5>
        <p className="text-muted mb-3">
          O agregador de notícias sobre design. Fique por dentro de tudo que acontece no Brasil e no mundo.
        </p>
        <div className="d-flex flex-wrap gap-3 mb-3">
          
        </div>
        <div className="text-muted mb-3">© 2026 Design Diário. Todos os direitos reservados.</div>
        <div className="small text-muted">
          AVISO LEGAL: Este site é um agregador automático que utiliza tecnologia RSS para organizar e exibir trechos de notícias. Todo o conteúdo, incluindo títulos, resumos e imagens, são de propriedade intelectual de seus respectivos autores e veículos. O "DESIGN DIÁRIO" não hospeda o conteúdo integral e sempre redireciona o usuário para o portal original através de links diretos, respeitando a autoria e gerando tráfego para os criadores. Este projeto não possui vínculo com nenhumas das fontes de notícias.
        </div>
      </Container>
    </div>
  );
}
