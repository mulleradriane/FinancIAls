import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Toaster } from '@/components/ui/sonner';
import {
  Plus, LayoutDashboard, ArrowRightLeft, Landmark,
  MoreHorizontal, RefreshCw, Target, Tags, FileText,
  Upload, Settings, LogOut, Sun, Moon, Eye, EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTheme } from '@/context/ThemeContext';
import { usePrivacy } from '@/context/PrivacyContext';
import { cn } from '@/lib/utils';
import logoLight from '@/assets/images/logo-light.png';
import logoDark from '@/assets/images/logo-dark.png';
import QuickAddTransaction from '@/components/QuickAddTransaction';
import TransactionForm from '@/components/TransactionForm';
import FeedbackWidget from '@/components/FeedbackWidget';

// ── Mobile bottom nav items ───────────────────────────────────────────────────
const BOTTOM_NAV = [
  { path: '/',            label: 'Início',      icon: LayoutDashboard, end: true },
  { path: '/transactions',label: 'Extrato',     icon: ArrowRightLeft },
  { path: '/contas',      label: 'Contas',      icon: Landmark },
  { path: '/metas',       label: 'Metas',       icon: Target },
];

// All other pages shown in the "More" sheet
const MORE_PAGES = [
  { path: '/recorrentes', label: 'Recorrentes',  icon: RefreshCw },
  { path: '/categories',  label: 'Categorias',   icon: Tags },
  { path: '/relatorios',  label: 'Relatórios',   icon: FileText },
  { path: '/importacao',  label: 'Importar',     icon: Upload },
  { path: '/settings',    label: 'Configurações',icon: Settings },
];

// ── Mobile More Sheet ─────────────────────────────────────────────────────────
function MobileMoreSheet({ open, onClose }) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { isPrivate, togglePrivacy } = usePrivacy();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('display_name');
    navigate('/login');
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent side="bottom" className="rounded-t-2xl p-0 border-none max-h-[80vh] overflow-y-auto">
          <div className="p-5 space-y-1">
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
            {MORE_PAGES.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-muted',
                )}
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}

            <div className="h-px bg-border my-2" />

            <button
              onClick={() => { togglePrivacy(); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              {isPrivate ? <EyeOff size={18} /> : <Eye size={18} />}
              {isPrivate ? 'Modo Público' : 'Modo Privado'}
            </button>

            <button
              onClick={() => { toggleTheme(); onClose(); }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
            </button>

            <button
              onClick={() => setLogoutOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut size={18} />
              Sair
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent className="rounded-2xl border-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Sair da conta?</AlertDialogTitle>
            <AlertDialogDescription>Você será redirecionado para o login.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="rounded-xl bg-destructive hover:bg-destructive/90 text-white">
              Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Main Layout ───────────────────────────────────────────────────────────────
export default function MainLayout() {
  const [moreOpen, setMoreOpen]         = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [fullFormOpen, setFullFormOpen] = useState(false);
  const [fullFormPrefill, setFullFormPrefill] = useState(null);

  const { theme } = useTheme();
  const logoSrc = theme === 'dark' ? logoDark : logoLight;

  // Atalho N para quick-add
  React.useEffect(() => {
    const handler = (e) => {
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (['input', 'textarea', 'select'].includes(tag)) return;
        e.preventDefault();
        setQuickAddOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleOpenFull = (prefill) => {
    setFullFormPrefill(prefill ?? null);
    setFullFormOpen(true);
  };

  const handleCreated = () => {
    window.dispatchEvent(new CustomEvent('transaction:created'));
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary transition-colors duration-300">
      {/* Sidebar — apenas desktop */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      <main className="flex-1 overflow-y-auto min-w-0">
        {/* Header mobile — logo */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-40">
          <img src={logoSrc} alt="FinancIAls" className="h-7 w-auto" />
        </div>

        {/* Conteúdo */}
        <div className="container max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-10 lg:py-12
                        pb-28 md:pb-8 animate-in fade-in duration-500">
          <Outlet />
        </div>
      </main>

      {/* ── Feedback widget — desktop only ─────────────────────────────────── */}
      <div className="hidden md:block">
        <FeedbackWidget />
      </div>

      {/* ── FAB — desktop only ─────────────────────────────────────────────── */}
      <button
        onClick={() => setQuickAddOpen(true)}
        className={cn(
          'fixed bottom-20 right-6 z-50',
          'hidden md:flex items-center gap-2',
          'h-12 px-4 rounded-2xl',
          'bg-primary text-primary-foreground',
          'shadow-lg shadow-primary/30',
          'font-semibold text-sm',
          'transition-all duration-200',
          'hover:scale-105 hover:shadow-xl hover:shadow-primary/40 active:scale-95',
        )}
        title="Novo lançamento (N)"
      >
        <Plus size={18} strokeWidth={2.5} />
        <span>Lançamento rápido</span>
      </button>

      {/* ── Bottom navigation bar — mobile only ───────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border">
        <div className="flex items-center justify-around px-2 pb-safe">
          {BOTTOM_NAV.slice(0, 2).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => cn(
                'flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-colors min-w-[56px]',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <item.icon size={22} strokeWidth={isActive => isActive ? 2.5 : 1.8} />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </NavLink>
          ))}

          {/* FAB central */}
          <button
            onClick={() => setQuickAddOpen(true)}
            className="flex flex-col items-center justify-center w-14 h-14 -mt-5 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-all active:scale-95"
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>

          {BOTTOM_NAV.slice(2).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                'flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-colors min-w-[56px]',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <item.icon size={22} />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </NavLink>
          ))}

          {/* More */}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl text-muted-foreground min-w-[56px]"
          >
            <MoreHorizontal size={22} />
            <span className="text-[10px] font-semibold">Mais</span>
          </button>
        </div>
      </nav>

      {/* More sheet */}
      <MobileMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />

      {/* Quick-add */}
      <QuickAddTransaction
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onCreated={handleCreated}
        onOpenFull={handleOpenFull}
      />

      {/* Formulário completo */}
      <Dialog open={fullFormOpen} onOpenChange={setFullFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nova Transação</DialogTitle>
          </DialogHeader>
          <TransactionForm
            categories={[]}
            accounts={[]}
            prefill={fullFormPrefill}
            onTransactionCreated={() => { handleCreated(); setFullFormOpen(false); }}
            onClose={() => setFullFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Toaster
        position="top-right"
        closeButton
        richColors
        toastOptions={{ style: { marginTop: '1rem', marginRight: '1rem' } }}
      />
    </div>
  );
}
