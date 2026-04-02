import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Toaster } from '@/components/ui/sonner';
import { Menu, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import logoLight from '@/assets/images/logo-light.png';
import logoDark from '@/assets/images/logo-dark.png';
import QuickAddTransaction from '@/components/QuickAddTransaction';
import TransactionForm from '@/components/TransactionForm';

export default function MainLayout() {
  const [mobileMenuOpen, setMobileMenuOpen]   = useState(false);
  const [quickAddOpen, setQuickAddOpen]       = useState(false);
  const [fullFormOpen, setFullFormOpen]       = useState(false);
  const [fullFormPrefill, setFullFormPrefill] = useState(null);

  // Categorias e contas são carregados dentro do TransactionForm quando necessário
  const { theme } = useTheme();
  const logoSrc = theme === 'dark' ? logoDark : logoLight;

  // Atalho de teclado global: N abre quick-add (fora de inputs)
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
    // Dispara evento customizado para que páginas individuais possam
    // atualizar seus dados sem precisar de prop drilling
    window.dispatchEvent(new CustomEvent('transaction:created'));
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary transition-colors duration-300">
      {/* Sidebar desktop */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      <main className="flex-1 overflow-y-auto">
        {/* Header mobile */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background sticky top-0 z-40">
          <img src={logoSrc} alt="FinancIAls" className="h-8 w-auto" />
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Drawer mobile */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-[260px] border-none">
            <Sidebar isMobile onNavigate={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Conteúdo da página */}
        <div className="container max-w-7xl mx-auto px-6 py-8 lg:px-10 lg:py-12 animate-in fade-in duration-500">
          <Outlet />
        </div>
      </main>

      {/* ── Botão flutuante quick-add ─────────────────────────────────────── */}
      <button
        onClick={() => setQuickAddOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'flex items-center gap-2',
          'h-12 px-4 rounded-2xl',
          'bg-primary text-primary-foreground',
          'shadow-lg shadow-primary/30',
          'font-semibold text-sm',
          'transition-all duration-200',
          'hover:scale-105 hover:shadow-xl hover:shadow-primary/40',
          'active:scale-95',
          // Mobile: só ícone
          'md:px-4',
        )}
        title="Novo lançamento (N)"
      >
        <Plus size={18} strokeWidth={2.5} />
        <span className="hidden md:inline">Lançamento rápido</span>
      </button>

      {/* ── Quick-add modal ───────────────────────────────────────────────── */}
      <QuickAddTransaction
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        onCreated={handleCreated}
        onOpenFull={handleOpenFull}
      />

      {/* ── Formulário completo (fallback do quick-add) ───────────────────── */}
      <Dialog open={fullFormOpen} onOpenChange={setFullFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nova Transação</DialogTitle>
          </DialogHeader>
          <TransactionForm
            categories={[]}   // TransactionForm carrega internamente
            accounts={[]}
            prefill={fullFormPrefill}
            onTransactionCreated={() => {
              handleCreated();
              setFullFormOpen(false);
            }}
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
