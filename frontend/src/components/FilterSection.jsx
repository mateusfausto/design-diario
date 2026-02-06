import { Container, Row, Col, Form, Button, Dropdown } from 'react-bootstrap';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { BsChevronDown, BsChevronUp, BsSearch, BsX } from 'react-icons/bs';

export function FilterSection({ 
  searchTerm, 
  setSearchTerm, 
  sourceFilters, 
  setSourceFilters, 
  periodFilter, 
  setPeriodFilter, 
  sources,
  onClearFilters 
}) {
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const desktopSearchRef = useRef(null);
  const mobileSearchRef = useRef(null);
  const mobileToggleRef = useRef(null);
  const toggleSource = (source) => {
    const has = sourceFilters.includes(source);
    const next = has ? sourceFilters.filter(s => s !== source) : [...sourceFilters, source];
    setSourceFilters(next);
  };
  const clearSources = () => setSourceFilters([]);
  const label =
    sourceFilters.length === 0
      ? 'Todas as fontes'
      : `${sourceFilters.length} selecionada${sourceFilters.length > 1 ? 's' : ''}`;
  const SelectToggle = forwardRef(({ children, onClick, className, ...rest }, ref) => {
    return (
      <select
        ref={ref}
        onClick={(e) => {
          e.preventDefault();
          onClick?.(e);
        }}
        onMouseDown={(e) => {
          e.preventDefault();
        }}
        className={`form-select text-start w-100 ${className || ''}`}
        defaultValue=""
        {...rest}
      >
        <option value="">{children}</option>
      </select>
    );
  });
  const periodLabelMap = {
    '': 'Todos os períodos',
    today: 'Hoje',
    week: 'Esta semana',
    month: 'Este mês',
  };
  const activeFiltersCount = sourceFilters.length + (periodFilter ? 1 : 0);
  const mobileFiltersLabel = isMobileFiltersOpen
    ? 'Ocultar filtros'
    : `Mostrar filtros${activeFiltersCount ? ` (${activeFiltersCount})` : ''}`;
  const handleMobileToggle = () => {
    setIsMobileFiltersOpen((prev) => {
      const next = !prev;
      if (!next) {
        setTimeout(() => {
          mobileToggleRef.current?.blur();
        }, 0);
      }
      return next;
    });
  };
  const handleMobileToggleBlur = () => {
    mobileToggleRef.current?.blur();
  };
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (desktopSearchRef.current && !desktopSearchRef.current.contains(event.target)) {
        desktopSearchRef.current.blur();
      }
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(event.target)) {
        mobileSearchRef.current.blur();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  return (
    <div className="border-bottom bg-white px-4 py-3 filters-bar">
      <Container>
        <Row className="g-3 d-none d-md-flex">
          <Col md={4}>
            <div className="position-relative">
              <Form.Control
                type="text"
                placeholder="Pesquisar artigos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ps-5"
                ref={desktopSearchRef}
              />
              <BsSearch className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
            </div>
          </Col>
          <Col md={3}>
            <Dropdown autoClose="outside" className="w-100">
              <Dropdown.Toggle as={SelectToggle}>
                {label}
              </Dropdown.Toggle>
              <Dropdown.Menu className="w-100 p-2">
                <div className="d-flex flex-column gap-2">
                  <Button
                    variant="link"
                    className="p-0 text-primary text-start"
                    onClick={clearSources}
                  >
                    Limpar seleção
                  </Button>
                  {sources.map((source) => (
                    <Form.Check
                      key={source}
                      type="checkbox"
                      id={`source-${source}`}
                      label={source}
                      checked={sourceFilters.includes(source)}
                      onChange={() => toggleSource(source)}
                    />
                  ))}
                </div>
              </Dropdown.Menu>
            </Dropdown>
          </Col>
          <Col md={3}>
            <Dropdown autoClose="outside" className="w-100">
              <Dropdown.Toggle as={SelectToggle}>
                {periodLabelMap[periodFilter]}
              </Dropdown.Toggle>
              <Dropdown.Menu className="w-100 p-2">
                <div className="d-flex flex-column gap-2">
                  {Object.entries(periodLabelMap).map(([value, labelText]) => (
                    <Form.Check
                      key={value || 'all'}
                      type="radio"
                      name="period-filter"
                      id={`period-${value || 'all'}`}
                      label={labelText}
                      checked={periodFilter === value}
                      onChange={() => setPeriodFilter(value)}
                    />
                  ))}
                </div>
              </Dropdown.Menu>
            </Dropdown>
          </Col>
          <Col md={2}>
            <Button
              variant="outline-primary"
              onClick={onClearFilters}
              className="w-100 d-flex align-items-center justify-content-center gap-2"
            >
              <BsX size={18} />
              Limpar
            </Button>
          </Col>
        </Row>
        <div className="d-md-none">
          <Row className="g-3">
            <Col xs={12}>
              <Button
                variant="outline-secondary"
                onClick={handleMobileToggle}
                onPointerDown={(event) => event.preventDefault()}
                onPointerUp={handleMobileToggleBlur}
                className="w-100 d-flex align-items-center justify-content-between mobile-filters-toggle"
                ref={mobileToggleRef}
              >
                {mobileFiltersLabel}
                {isMobileFiltersOpen ? <BsChevronUp /> : <BsChevronDown />}
              </Button>
            </Col>
          </Row>
          <div className={isMobileFiltersOpen ? 'mt-3' : 'd-none'}>
            <Row className="g-3">
              <Col xs={12}>
                <div className="position-relative">
                  <Form.Control
                    type="text"
                    placeholder="Pesquisar artigos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="ps-5"
                    ref={mobileSearchRef}
                  />
                  <BsSearch className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" />
                </div>
              </Col>
              <Col xs={12}>
                <Dropdown autoClose="outside" className="w-100">
                  <Dropdown.Toggle as={SelectToggle}>
                    {label}
                  </Dropdown.Toggle>
                  <Dropdown.Menu className="w-100 p-2">
                    <div className="d-flex flex-column gap-2">
                      <Button
                        variant="link"
                        className="p-0 text-primary text-start"
                        onClick={clearSources}
                      >
                        Limpar seleção
                      </Button>
                      {sources.map((source) => (
                        <Form.Check
                          key={source}
                          type="checkbox"
                          id={`source-${source}`}
                          label={source}
                          checked={sourceFilters.includes(source)}
                          onChange={() => toggleSource(source)}
                        />
                      ))}
                    </div>
                  </Dropdown.Menu>
                </Dropdown>
              </Col>
              <Col xs={12}>
                <Dropdown autoClose="outside" className="w-100">
                  <Dropdown.Toggle as={SelectToggle}>
                    {periodLabelMap[periodFilter]}
                  </Dropdown.Toggle>
                  <Dropdown.Menu className="w-100 p-2">
                    <div className="d-flex flex-column gap-2">
                      {Object.entries(periodLabelMap).map(([value, labelText]) => (
                        <Form.Check
                          key={value || 'all'}
                          type="radio"
                          name="period-filter-mobile"
                          id={`period-${value || 'all'}-mobile`}
                          label={labelText}
                          checked={periodFilter === value}
                          onChange={() => setPeriodFilter(value)}
                        />
                      ))}
                    </div>
                  </Dropdown.Menu>
                </Dropdown>
              </Col>
              <Col xs={12}>
                <Button
                  variant="outline-primary"
                  onClick={onClearFilters}
                  className="w-100 d-flex align-items-center justify-content-center gap-2"
                >
                  <BsX size={18} />
                  Limpar
                </Button>
              </Col>
            </Row>
          </div>
        </div>
      </Container>
    </div>
  );
}
