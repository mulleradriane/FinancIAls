import React, { useState } from 'react';
import { MessageSquarePlus, X, Star, Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import api from '@/api/api';
import { useLocation } from 'react-router-dom';

const PAGE_LABELS = {
  '/': 'Dashboard',
  '/transacoes': 'Transações',
  '/contas': 'Contas',
  '/categories': 'Categorias',
  '/recorrentes': 'Recorrentes',
  '/metas': 'Metas',
  '/importacao': 'Importação',
  '/analytics': 'Analytics',
};

export default function FeedbackWidget() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const pageName = PAGE_LABELS[location.pathname] || location.pathname;

  function handleOpen() {
    setOpen(true);
    setSent(false);
    setError('');
    setRating(0);
    setMessage('');
  }

  function handleClose() {
    setOpen(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim()) {
      setError('Escreva seu feedback antes de enviar.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/feedback/', {
        page: pageName,
        rating: rating || null,
        message: message.trim(),
      });
      setSent(true);
    } catch {
      setError('Falha ao enviar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleOpen}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full shadow-lg px-4 py-2.5',
          'bg-secondary text-secondary-foreground border hover:bg-muted transition-all duration-200',
          'text-sm font-medium',
          open && 'opacity-0 pointer-events-none',
        )}
        title="Dar feedback"
      >
        <MessageSquarePlus className="w-4 h-4" />
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-[60] w-80 rounded-2xl border bg-card shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b">
            <MessageSquarePlus className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-none">Dar feedback</p>
              <p className="text-xs text-muted-foreground mt-0.5">Página: {pageName}</p>
            </div>
            <button
              onClick={handleClose}
              className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {sent ? (
            <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              <div>
                <p className="font-semibold text-sm">Obrigado pelo feedback!</p>
                <p className="text-xs text-muted-foreground mt-1">Sua opinião ajuda a melhorar o app.</p>
              </div>
              <Button size="sm" variant="outline" className="mt-2" onClick={handleClose}>
                Fechar
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
              {/* Star rating */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Como está sua experiência? <span className="opacity-60">(opcional)</span></p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n === rating ? 0 : n)}
                      onMouseEnter={() => setHovered(n)}
                      onMouseLeave={() => setHovered(0)}
                      className="p-0.5 transition-transform hover:scale-110"
                    >
                      <Star
                        className={cn(
                          'w-6 h-6 transition-colors',
                          n <= (hovered || rating)
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-muted-foreground/30',
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Sua mensagem</p>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="O que achou? Algo que não funcionou? Sugestões..."
                  rows={4}
                  maxLength={2000}
                  className={cn(
                    'w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none',
                    'placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40',
                    error && 'border-destructive',
                  )}
                />
                {error && <p className="text-xs text-destructive mt-1">{error}</p>}
                <p className="text-xs text-muted-foreground/50 text-right mt-0.5">{message.length}/2000</p>
              </div>

              <Button type="submit" className="w-full gap-2" disabled={loading}>
                <Send className="w-3.5 h-3.5" />
                {loading ? 'Enviando...' : 'Enviar feedback'}
              </Button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
