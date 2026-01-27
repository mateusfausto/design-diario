import { BsFileText, BsRss, BsHeart, BsMoon, BsSun } from 'react-icons/bs';
import { useStore } from '../store/useStore';

const navItems = [
  { id: 'articles', label: 'Artigos', icon: BsFileText },
  { id: 'favorites', label: 'Favoritos', icon: BsHeart },
];

export function Navigation() {
  const { selectedView, setSelectedView, theme, toggleTheme } = useStore();

  return (
    <div className="sidebar">
      <div className="sidebar-content">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = selectedView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setSelectedView(item.id)}
              className={`sidebar-btn ${isActive ? 'active' : ''}`}
            >
              <Icon size={24} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
      <div className="sidebar-footer d-none d-md-flex">
        <button
          className="sidebar-btn"
          onClick={toggleTheme}
          aria-label="Alternar tema"
        >
          {theme === 'dark' ? <BsSun size={24} /> : <BsMoon size={24} />}
        </button>
      </div>
    </div>
  );
}
