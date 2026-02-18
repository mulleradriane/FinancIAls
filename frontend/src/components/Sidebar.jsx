import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowRightLeft,
  BarChart3,
  Landmark,
  TrendingUp,
  RefreshCw,
  Tags,
  FileText,
  Sun,
  Moon
} from 'lucide-react';
import './Sidebar.css';
import { useTheme } from '../context/ThemeContext';

function Sidebar() {
  const { theme, toggleTheme } = useTheme();
  const menuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { path: '/transactions', label: 'Transações', icon: ArrowRightLeft },
    { path: '/fluxo-caixa', label: 'Fluxo de Caixa', icon: BarChart3 },
    { path: '/contas', label: 'Contas', icon: Landmark },
    { path: '/patrimonio', label: 'Patrimônio', icon: TrendingUp },
    { path: '/recorrentes', label: 'Recorrentes', icon: RefreshCw },
    { path: '/categories', label: 'Categorias', icon: Tags },
    { path: '/relatorios', label: 'Relatórios', icon: FileText },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h2>FinancIAls</h2>
      </div>
      <nav className="sidebar-nav">
        <ul>
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.end}
                className={({ isActive }) => isActive ? 'active' : ''}
              >
                <item.icon size={20} className="sidebar-icon" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div style={{ marginTop: 'auto', padding: '20px', borderTop: '1px solid var(--border-color)' }}>
        <button
          onClick={toggleTheme}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--card-bg)',
            color: 'var(--text-color)',
            cursor: 'pointer'
          }}
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          <span>{theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
