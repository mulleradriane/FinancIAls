import React, { useState } from 'react';
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
  Moon,
  ChevronLeft,
  ChevronRight,
  Settings
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

// Importar as imagens
import logoLight from '@/assets/images/logo-light.png';
import logoDark from '@/assets/images/logo-dark.png';

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

export function Sidebar() {
  const { theme, toggleTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // CORES FIXAS - baseadas no tema
  const styles = {
    light: {
      background: '#ffffff',
      border: '#e5e7eb',
      text: '#1f2937',
      textMuted: '#4b5563',
      hover: '#f3f4f6',
      active: '#2563eb',
      activeText: '#ffffff',
    },
    dark: {
      background: '#111827',
      border: '#374151',
      text: '#f9fafb',
      textMuted: '#d1d5db',
      hover: '#1f2937',
      active: '#3b82f6',
      activeText: '#ffffff',
    }
  };

  const currentStyle = theme === 'dark' ? styles.dark : styles.light;
  
  // Escolher a logo baseada no tema
  const logoSrc = theme === 'dark' ? logoDark : logoLight;

  return (
    <aside
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        borderRight: `1px solid ${currentStyle.border}`,
        backgroundColor: currentStyle.background,
        transition: 'all 0.5s ease-in-out',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        width: isCollapsed ? '80px' : '260px',
      }}
    >
      {/* Header com logo - CENTRALIZADO */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.5rem 1rem',
        width: '100%',
        borderBottom: `1px solid ${currentStyle.border}`,
      }}>
        {!isCollapsed ? (
          <>
            {/* Espaçador invisível com a MESMA largura do botão */}
            <div style={{ width: '32px' }} />
            
            {/* Container da logo para garantir centralização */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              flex: 1,
            }}>
              <img 
                src={logoSrc}
                alt="Ronromia"
                style={{
                  height: '40px',
                  width: 'auto',
                  maxWidth: '140px',
                  objectFit: 'contain',
                }}
              />
            </div>
            
            {/* Botão com largura fixa */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: currentStyle.text,
                padding: '0.25rem',
                borderRadius: '0.375rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
              }}
            >
              {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: currentStyle.text,
              padding: '0.25rem',
              borderRadius: '0.375rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              width: '32px',
              height: '32px',
            }}
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        )}
      </div>

      {/* Menu de navegação */}
      <nav style={{
        flex: 1,
        padding: '1rem 0.75rem',
      }}>
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: isCollapsed ? '0.625rem 0' : '0.625rem 0.75rem',
              borderRadius: '0.75rem',
              width: isCollapsed ? '2.5rem' : 'auto',
              margin: isCollapsed ? '0 auto' : '0',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              backgroundColor: isActive ? currentStyle.active : 'transparent',
              color: isActive ? currentStyle.activeText : currentStyle.text,
              textDecoration: 'none',
              transition: 'all 0.2s',
              marginBottom: '0.25rem',
            })}
            onMouseEnter={(e) => {
              if (!e.currentTarget.style.backgroundColor.includes(currentStyle.active)) {
                e.currentTarget.style.backgroundColor = currentStyle.hover;
                e.currentTarget.style.color = currentStyle.text;
              }
            }}
            onMouseLeave={(e) => {
              if (!e.currentTarget.style.backgroundColor.includes(currentStyle.active)) {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = currentStyle.text;
              }
            }}
          >
            <item.icon size={20} />
            {!isCollapsed && (
              <span style={{ fontWeight: 500 }}>{item.label}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Área inferior com Configurações e Tema */}
      <div style={{
        padding: '1rem',
        borderTop: `1px solid ${currentStyle.border}`,
      }}>
        {/* Item Configurações */}
        <NavLink
          to="/settings"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: isCollapsed ? '0.625rem 0' : '0.625rem 0.75rem',
            borderRadius: '0.75rem',
            width: isCollapsed ? '2.5rem' : '100%',
            margin: isCollapsed ? '0 auto' : '0',
            marginBottom: '0.5rem',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            backgroundColor: isActive ? currentStyle.active : 'transparent',
            color: isActive ? currentStyle.activeText : currentStyle.text,
            textDecoration: 'none',
            transition: 'all 0.2s',
          })}
          onMouseEnter={(e) => {
            if (!e.currentTarget.style.backgroundColor.includes(currentStyle.active)) {
              e.currentTarget.style.backgroundColor = currentStyle.hover;
              e.currentTarget.style.color = currentStyle.text;
            }
          }}
          onMouseLeave={(e) => {
            if (!e.currentTarget.style.backgroundColor.includes(currentStyle.active)) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = currentStyle.text;
            }
          }}
        >
          <Settings size={20} />
          {!isCollapsed && <span style={{ fontWeight: 500 }}>Configurações</span>}
        </NavLink>

        {/* Botão de tema */}
        <button
          onClick={toggleTheme}
          style={{
            width: isCollapsed ? '2.5rem' : '100%',
            height: '2.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            padding: isCollapsed ? '0' : '0 0.75rem',
            borderRadius: '0.75rem',
            border: `1px solid ${currentStyle.border}`,
            backgroundColor: 'transparent',
            color: currentStyle.text,
            cursor: 'pointer',
            transition: 'all 0.2s',
            margin: isCollapsed ? '0 auto' : '0',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = currentStyle.hover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          {!isCollapsed && (
            <span>{theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}</span>
          )}
        </button>
      </div>
    </aside>
  );
}