import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Toaster } from '@/components/ui/sonner';

export default function MainLayout() {
  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary transition-colors duration-300">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
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
