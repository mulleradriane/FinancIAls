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
  FileText
} from 'lucide-react';
import './Sidebar.css';

function Sidebar() {
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
    </aside>
  );
}

export default Sidebar;
