import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/api/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowDownCircle, ArrowUpCircle, Plus, ExternalLink,
  Loader2, Sparkles,
} from 'lucide-react';
import { cn, localDateStr } from '@/lib/utils';

// ── Utilitários ────────────────────────────────────────────────────────────────
const toDisplay = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);

// ── QuickAddTransaction ────────────────────────────────────────────────────────
const QuickAddTransaction = ({ open, onOpenChange, onCreated, onOpenFull }) => {
  const [type, setType]               = useState('expense'); // 'expense' | 'income'
  const [displayAmount, setDisplayAmount] = useState('');
  const [amount, setAmount]           = useState(0);
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId]   = useState('');
  const [accountId, setAccountId]     = useState('');
  const [date, setDate]               = useState(localDateStr());
  const [submitting, setSubmitting]   = useState(false);

  // Dados carregados uma vez
  const [categories, setCategories]   = useState([]);
  const [accounts, setAccounts]       = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestLoading, setSuggestLoading]   = useState(false);

  const descRef = useRef(null);
  const suggestTimeout = useRef(null);

  // ── Carrega dados ao abrir ───────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    const load = async () => {
      try {
        const [catsRes, accsRes, descsRes] = await Promise.allSettled([
          api.get('/categories/'),
          api.get('/accounts/'),
          api.get('/transactions/descriptions/'),
        ]);
        if (catsRes.status === 'fulfilled') setCategories(catsRes.value.data);
        if (accsRes.status === 'fulfilled') {
          const accs = accsRes.value.data;
          setAccounts(accs);
          // Pré-seleciona conta padrão
          const def = accs.find((a) => a.is_default) ?? accs[0];
          if (def) setAccountId(def.id);
        }
        if (descsRes.status === 'fulfilled') setSuggestions(descsRes.value.data || []);
      } catch { /* silencioso */ }
    };

    load();
    // Foca no campo de valor ao abrir
    setTimeout(() => descRef.current?.focus(), 80);
  }, [open]);

  // Reseta ao fechar
  useEffect(() => {
    if (!open) {
      setType('expense');
      setDisplayAmount('');
      setAmount(0);
      setDescription('');
      setCategoryId('');
      setAccountId('');
      setDate(localDateStr());
    }
  }, [open]);

  // ── Categorias filtradas por tipo ────────────────────────────────────────
  const filteredCategories = categories.filter(
    (c) =>
      !c.is_system &&
      !['investimento', 'investimentos'].includes(c.name.toLowerCase()) &&
      c.type === (type === 'income' ? 'income' : 'expense')
  );

  // Reseta categoria quando troca tipo
  useEffect(() => { setCategoryId(''); }, [type]);

  // ── Autocomplete de descrição ────────────────────────────────────────────
  const filteredSuggestions = description
    ? suggestions.filter((s) =>
        s.toLowerCase().includes(description.toLowerCase()) && s !== description
      ).slice(0, 5)
    : [];

  // Sugestão automática de categoria ao digitar
  const fetchSuggestion = useCallback(async (desc) => {
    if (!desc || desc.length < 3) return;
    setSuggestLoading(true);
    try {
      const res = await api.get(`/transactions/suggestion?description=${encodeURIComponent(desc)}`);
      if (res.data?.category_id && !categoryId) {
        setCategoryId(res.data.category_id);
      }
      if (res.data?.account_id && !accountId) {
        setAccountId(res.data.account_id);
      }
    } catch { /* sem sugestão — normal */ }
    finally { setSuggestLoading(false); }
  }, [categoryId, accountId]);

  useEffect(() => {
    clearTimeout(suggestTimeout.current);
    if (description.length >= 3) {
      suggestTimeout.current = setTimeout(() => fetchSuggestion(description), 400);
    }
    return () => clearTimeout(suggestTimeout.current);
  }, [description, fetchSuggestion]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleAmountChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) { setDisplayAmount(''); setAmount(0); return; }
    const int = parseInt(raw, 10);
    setAmount(int / 100);
    setDisplayAmount(toDisplay(int / 100));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!description) { toast.error('Informe a descrição.'); return; }
    if (!amount)       { toast.error('Informe o valor.'); return; }
    if (!categoryId)   { toast.error('Selecione uma categoria.'); return; }
    if (!accountId)    { toast.error('Selecione uma conta.'); return; }

    setSubmitting(true);
    try {
      const selectedCategory = categories.find((c) => c.id === categoryId);
      const nature = selectedCategory?.type === 'income' ? 'INCOME' : 'EXPENSE';

      await api.post('/transactions/', {
        description,
        amount,
        nature,
        date,
        category_id: categoryId,
        account_id: accountId,
        is_recurring: false,
      });

      toast.success('Transação lançada!');
      onCreated?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao salvar transação.');
    } finally {
      setSubmitting(false);
    }
  };

  // Atalho de teclado: Ctrl/Cmd + Enter envia
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSubmit();
    if (e.key === 'Escape') onOpenChange(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm rounded-2xl p-0 overflow-hidden gap-0"
        onKeyDown={handleKeyDown}
      >
        {/* Toggle receita / despesa — header colorido */}
        <div className={cn(
          'transition-colors duration-200',
          type === 'expense' ? 'bg-destructive/5' : 'bg-success/5'
        )}>
          <div className="flex">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-all',
                type === 'expense'
                  ? 'bg-destructive/10 text-destructive border-b-2 border-destructive'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <ArrowDownCircle size={15} />
              Despesa
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-all',
                type === 'income'
                  ? 'bg-success/10 text-success border-b-2 border-success'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <ArrowUpCircle size={15} />
              Receita
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Valor — campo grande em destaque */}
          <div>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="R$ 0,00"
              value={displayAmount}
              onChange={handleAmountChange}
              className={cn(
                'text-center text-2xl font-bold h-14 border-none rounded-xl',
                type === 'expense' ? 'bg-destructive/5' : 'bg-success/5'
              )}
            />
          </div>

          {/* Descrição com autocomplete */}
          <div className="relative">
            <div className="relative">
              <Input
                ref={descRef}
                type="text"
                placeholder="Descrição (ex: Mercado, Salário...)"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                className="bg-secondary/40 border-none h-11 rounded-xl pr-8"
              />
              {suggestLoading && (
                <Sparkles size={13} className="absolute right-3 top-3.5 text-muted-foreground animate-pulse" />
              )}
            </div>

            {/* Dropdown de sugestões */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-popover border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                {filteredSuggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={() => {
                      setDescription(s);
                      setShowSuggestions(false);
                      fetchSuggestion(s);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/60 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Categoria + Conta em linha */}
          <div className="grid grid-cols-2 gap-3">
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="bg-secondary/40 border-none h-11 rounded-xl text-sm">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {(() => {
                  const topLevel = filteredCategories.filter((c) => !c.parent_id);
                  const subMap = filteredCategories.filter((c) => c.parent_id).reduce((acc, c) => {
                    if (!acc[c.parent_id]) acc[c.parent_id] = [];
                    acc[c.parent_id].push(c);
                    return acc;
                  }, {});
                  const items = [];
                  topLevel.forEach((c) => {
                    items.push(
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-1.5">
                          <span>{c.icon || '💰'}</span>
                          <span>{c.name}</span>
                        </span>
                      </SelectItem>
                    );
                    (subMap[c.id] || []).forEach((sub) => {
                      items.push(
                        <SelectItem key={sub.id} value={sub.id}>
                          <span className="flex items-center gap-1.5 pl-3">
                            <span className="text-muted-foreground text-xs">↳</span>
                            <span>{sub.icon || '💰'}</span>
                            <span>{sub.name}</span>
                          </span>
                        </SelectItem>
                      );
                    });
                  });
                  return items;
                })()}
              </SelectContent>
            </Select>

            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="bg-secondary/40 border-none h-11 rounded-xl text-sm">
                <SelectValue placeholder="Conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts
                  .filter((a) => a.type !== 'cartao_credito' || type === 'expense')
                  .map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data — discreto, só aparece se quiser mudar */}
          <div>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-secondary/40 border-none h-9 rounded-xl text-sm text-muted-foreground"
            />
          </div>

          {/* Ações */}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-foreground gap-1.5 px-2"
              onClick={() => {
                onOpenChange(false);
                onOpenFull?.({ type, amount, description, categoryId, accountId, date });
              }}
            >
              <ExternalLink size={12} />
              Mais opções
            </Button>

            <Button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className={cn(
                'flex-1 h-11 rounded-xl font-bold text-sm shadow-md',
                type === 'expense'
                  ? 'bg-destructive hover:bg-destructive/90 shadow-destructive/20'
                  : 'bg-success hover:bg-success/90 shadow-success/20'
              )}
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                `Lançar ${type === 'expense' ? 'despesa' : 'receita'}`
              )}
            </Button>
          </div>

          <p className="text-center text-[10px] text-muted-foreground">
            ⌘ + Enter para salvar rápido
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuickAddTransaction;
