import React, { useState, useEffect } from 'react';
import api from '@/api/api';
import { Star, MessageSquare, User, Monitor, Clock, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function StarDisplay({ rating }) {
  if (!rating) return <span className="text-xs text-muted-foreground">sem nota</span>;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={cn('w-3.5 h-3.5', n <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20')}
        />
      ))}
    </div>
  );
}

function ratingColor(rating) {
  if (!rating) return 'bg-muted text-muted-foreground';
  if (rating >= 4) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
  if (rating === 3) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
  return 'bg-red-500/10 text-red-600 dark:text-red-400';
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminFeedbacks() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/feedback/', { params: { limit: 100 } });
      setFeedbacks(data);
    } catch {
      toast.error('Erro ao carregar feedbacks');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const avgRating = (() => {
    const rated = feedbacks.filter(f => f.rating);
    if (!rated.length) return null;
    return (rated.reduce((s, f) => s + f.rating, 0) / rated.length).toFixed(1);
  })();

  const byPage = feedbacks.reduce((acc, f) => {
    const p = f.page || 'Desconhecida';
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Feedbacks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            O que os usuários estão dizendo sobre o app
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          Atualizar
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-bold mt-1">{feedbacks.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Nota média</p>
          <div className="flex items-end gap-1.5 mt-1">
            <p className="text-2xl font-bold">{avgRating ?? '—'}</p>
            {avgRating && <Star className="w-4 h-4 fill-amber-400 text-amber-400 mb-1" />}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Usuários únicos</p>
          <p className="text-2xl font-bold mt-1">
            {new Set(feedbacks.map(f => f.username)).size}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">Página mais citada</p>
          <p className="text-sm font-semibold mt-1 truncate">
            {Object.keys(byPage).sort((a, b) => byPage[b] - byPage[a])[0] ?? '—'}
          </p>
        </div>
      </div>

      {/* Feedback list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl border bg-card p-4 animate-pulse h-24" />
          ))}
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="rounded-xl border bg-card flex flex-col items-center gap-3 py-16 text-center">
          <MessageSquare className="w-10 h-10 text-muted-foreground/30" />
          <div>
            <p className="font-medium text-sm">Nenhum feedback ainda</p>
            <p className="text-xs text-muted-foreground mt-0.5">Os feedbacks dos usuários aparecerão aqui.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {feedbacks.map(fb => (
            <div key={fb.id} className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-start gap-3">
                {/* Avatar placeholder */}
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm">{fb.username || 'anônimo'}</span>
                    <div className={cn('rounded-full px-2 py-0.5 text-xs font-medium flex items-center gap-1', ratingColor(fb.rating))}>
                      <StarDisplay rating={fb.rating} />
                    </div>
                    {fb.page && (
                      <Badge variant="secondary" className="text-xs gap-1 font-normal">
                        <Monitor className="w-3 h-3" />
                        {fb.page}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                      <Clock className="w-3 h-3" />
                      {formatDate(fb.created_at)}
                    </span>
                  </div>

                  <p className="text-sm mt-2 text-foreground/80 whitespace-pre-wrap leading-relaxed">
                    {fb.message}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
