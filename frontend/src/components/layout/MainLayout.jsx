import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Toaster } from '@/components/ui/sonner';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useTheme } from '@/context/ThemeContext';
import logoLight from '@/assets/images/logo-light.png';
import logoDark from '@/assets/images/logo-dark.png';

export default function MainLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme } = useTheme();
  const logoSrc = theme === 'dark' ? logoDark : logoLight;

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary transition-colors duration-300">
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      <main className="flex-1 overflow-y-auto">
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background sticky top-0 z-40">
          <img src={logoSrc} alt="FinancIAls" className="h-8 w-auto" />
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-[260px] border-none">
            <Sidebar isMobile={true} onNavigate={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="container max-w-7xl mx-auto px-6 py-8 lg:px-10 lg:py-12 animate-in fade-in duration-500">
          <Outlet />
        </div>
      </main>
      <Toaster
        position="top-right"
        closeButton
        richColors
        toastOptions={{
          style: { marginTop: '1rem', marginRight: '1rem' }
        }}
      />
    </div>
  );
}
