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
  ChevronRight
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

  return (
    <aside
      className={cn(
        "flex flex-col h-screen border-r bg-card transition-all duration-500 ease-in-out sticky top-0 z-50",
        isCollapsed ? "w-[80px]" : "w-[260px]"
      )}
    >
      <div className="flex items-center justify-between p-6 h-20">
        {!isCollapsed && (
          <h2 className="text-2xl font-black tracking-tighter text-primary animate-in fade-in slide-in-from-left-4 duration-500">
            FinancIAls
          </h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn("ml-auto", isCollapsed && "mx-auto")}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </Button>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        <TooltipProvider delayDuration={0}>
          {menuItems.map((item) => (
            <Tooltip key={item.path} disableHoverableContent={!isCollapsed}>
              <TooltipTrigger asChild>
                <NavLink
                  to={item.path}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground",
                      isCollapsed && "justify-center px-0 w-10 mx-auto"
                    )
                  }
                >
                  <item.icon size={20} className={cn("shrink-0")} />
                  {!isCollapsed && <span className="font-medium">{item.label}</span>}
                </NavLink>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right" className="flex items-center gap-4">
                  {item.label}
                </TooltipContent>
              )}
            </Tooltip>
          ))}
        </TooltipProvider>
      </nav>

      <div className="p-4 border-t mt-auto">
        <TooltipProvider delayDuration={0}>
          <Tooltip disableHoverableContent={!isCollapsed}>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={toggleTheme}
                className={cn(
                  "w-full flex items-center gap-3 justify-start rounded-xl",
                  isCollapsed && "justify-center p-0 h-10 w-10 mx-auto"
                )}
              >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                {!isCollapsed && <span>{theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}</span>}
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">
                {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </aside>
  );
}
