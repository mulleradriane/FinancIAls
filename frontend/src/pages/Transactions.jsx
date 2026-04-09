import React, { useState, useEffect } from 'react';
import api from '@/api/api';
import { toast } from 'sonner';
import TransactionForm from '@/components/TransactionForm';
import TransactionList from '@/components/TransactionList';
import {
  Plus, Filter, X, ArrowUpCircle, ArrowDownCircle, Wallet,
  SearchX, Download, Calendar, Search, ChevronDown, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverClose,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import PrivateValue from '@/components/ui/PrivateValue';
import { cn, parseLocalDate, formatCurrency, localDateStr } from '@/lib/utils';


const Transactions = () => {
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ total_income: 0, total_expense: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const limit = 50;
  const [highlightId, setHighlightId] = useState(null);

  // Filters
  const [period, setPeriod] = useState('month');
  const [accountIds, setAccountIds] = useState([]);
  const [categoryIds, setCategoryIds] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories/');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await api.get('/accounts/');
      setAccounts(response.data);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const getFilterParams = (customLimit, customSkip) => {
    const params = new URLSearchParams();
    params.append('limit', customLimit ?? limit);
    params.append('skip', customSkip ?? 0);

    accountIds.forEach(id => params.append('account_id', id));
    categoryIds.forEach(id => params.append('category_id', id));

    if (debouncedSearch) params.append('search', debouncedSearch);

    let start = '';
    let end = '';
    const now = new Date();
    const today = localDateStr(now);

    switch (period) {
      case '30days':
        end = today;
        const d30 = new Date(); d30.setDate(d30.getDate() - 30);
        start = localDateStr(d30);
        break;
      case '90days':
        end = today;
        const d90 = new Date(); d90.setDate(d90.getDate() - 90);
        start = localDateStr(d90);
        break;
      case 'month':
        start = localDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
        end = localDateStr(new Date(now.getFullYear(), now.getMonth() + 1, 0));
        break;
      case 'last_month':
        start = localDateStr(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        end = localDateStr(new Date(now.getFullYear(), now.getMonth(), 0));
        break;
      case '6months':
        end = today;
        const d6m = new Date(); d6m.setDate(d6m.getDate() - 180);
        start = localDateStr(d6m);
        break;
      case 'year':
        start = localDateStr(new Date(now.getFullYear(), 0, 1));
        end = localDateStr(new Date(now.getFullYear(), 11, 31));
        break;
      case 'last_year':
        start = localDateStr(new Date(now.getFullYear() - 1, 0, 1));
        end = localDateStr(new Date(now.getFullYear() - 1, 11, 31));
        break;
      case 'custom':
        start = startDate;
        end = endDate;
        break;
      default:
        start = '';
        end = '';
        break;
    }

    if (start) params.append('start_date', start);
    if (end) params.append('end_date', end);

    return params;
  };

  const fetchTransactions = async (currentSkip = 0) => {
    try {
      setLoading(true);
      const params = getFilterParams(limit, currentSkip);
      const response = await api.get('/transactions/', { params });
      setTransactions(response.data.items);
      setSummary({
        total_income: response.data.total_income,
        total_expense: response.data.total_expense,
      });
      setTotal(response.data.total);
      setSkip(response.data.skip);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); fetchAccounts(); }, []);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    fetchTransactions(0);
  }, [period, accountIds, categoryIds, debouncedSearch, startDate, endDate]);

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleTransactionCreated = async (newTransaction) => {
    await Promise.all([fetchTransactions(), fetchAccounts()]);
    if (newTransaction?.id) {
      setHighlightId(newTransaction.id);
      setTimeout(() => setHighlightId(null), 2000);
    }
  };

  const clearFilters = () => {
    setPeriod('month');
    setAccountIds([]);
    setCategoryIds([]);
    setSearch('');
    setStartDate('');
    setEndDate('');
  };

  const periodOptions = [
    { value: 'all',        label: 'Todo período' },
    { value: '30days',     label: 'Últimos 30 dias' },
    { value: '90days',     label: 'Últimos 90 dias' },
    { value: 'month',      label: 'Este mês' },
    { value: 'last_month', label: 'Mês passado' },
    { value: '6months',    label: 'Últimos 6 meses' },
    { value: 'year',       label: 'Este ano' },
    { value: 'last_year',  label: 'Ano passado' },
    { value: 'custom',     label: 'Personalizado' },
  ];

  const currentPeriodLabel = periodOptions.find(o => o.value === period)?.label || 'Período';

  const activeFiltersCount =
    accountIds.length +
    categoryIds.length +
    (period !== 'month' ? 1 : 0) +
    (search !== '' ? 1 : 0);

  const hasActiveFilters = activeFiltersCount > 0;

  const handleDelete = (transaction) => setDeleteTarget(transaction);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const type = deleteTarget.is_transfer ? 'transferência' : 'transação';
    try {
      await api.delete(`/transactions/${deleteTarget.id}`);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} excluída!`);
      fetchTransactions();
      fetchAccounts();
    } catch (error) {
      const detail = error.response?.data?.detail || `Erro ao excluir ${type}.`;
      toast.error(detail);
    } finally {
      setDeleteTarget(null);
    }
  };

  const exportToCSV = async () => {
    try {
      toast.info('Preparando exportação...');
      const params = getFilterParams(-1, 0);
      const response = await api.get('/transactions/', { params });
      const data = response.data.items;

      if (data.length === 0) { toast.error('Nenhuma transação para exportar'); return; }

      const natureMap = {
        INCOME: 'Receita', EXPENSE: 'Despesa',
        INVESTMENT: 'Investimento', TRANSFER: 'Transferência', SYSTEM_ADJUSTMENT: 'Ajuste',
      };
      const headers = ['Data', 'Descrição', 'Categoria', 'Conta', 'Valor', 'Natureza'];
      const rows = data.map(t => [
        parseLocalDate(t.date).toLocaleDateString('pt-BR'),
        t.description,
        t.category_name || (t.category_is_system ? 'Sistema' : 'Sem Categoria'),
        t.account_name,
        t.amount.toString().replace('.', ','),
        natureMap[t.nature] || t.nature,
      ]);

      const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `transacoes_${new Date().toISOString().split('T')[0]}.csv`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Exportação concluída!');
    } catch (error) {
      toast.error('Erro ao exportar transações');
    }
  };

  const balance = Number(summary.total_income) + Number(summary.total_expense);

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transações</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas movimentações financeiras.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={exportToCSV} size="sm" className="rounded-xl text-muted-foreground">
            <Download className="h-4 w-4 mr-1.5" /> CSV
          </Button>
          <Button onClick={() => setIsModalOpen(true)} className="rounded-xl">
            <Plus className="h-4 w-4 mr-2" /> Nova Transação
          </Button>
        </div>
      </div>

      {/* ── Summary strip ── */}
      <Card className="border-none shadow-md rounded-2xl overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-border/50">
          <div className="flex items-center gap-3 p-4">
            <div className="p-2 bg-success/10 rounded-lg flex-shrink-0">
              <ArrowUpCircle className="h-4 w-4 text-success" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground leading-none mb-1">Entradas</p>
              <p className="text-lg font-bold text-success tabular-nums leading-none truncate">
                <PrivateValue value={formatCurrency(summary.total_income)} />
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4">
            <div className="p-2 bg-destructive/10 rounded-lg flex-shrink-0">
              <ArrowDownCircle className="h-4 w-4 text-destructive" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground leading-none mb-1">Saídas</p>
              <p className="text-lg font-bold text-destructive tabular-nums leading-none truncate">
                <PrivateValue value={formatCurrency(Math.abs(summary.total_expense))} />
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4">
            <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground leading-none mb-1">Saldo do Período</p>
              <p className={cn(
                'text-lg font-bold tabular-nums leading-none truncate',
                balance >= 0 ? 'text-success' : 'text-destructive',
              )}>
                <PrivateValue value={formatCurrency(balance)} />
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap gap-2 items-center">

        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-8 h-9 rounded-xl bg-secondary/40 border-none text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Period */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'h-9 rounded-xl border-none bg-secondary/40 font-normal text-sm gap-1.5',
                period !== 'month' && 'bg-primary/10 text-primary',
              )}
            >
              <Calendar className="h-4 w-4 opacity-60" />
              {currentPeriodLabel}
              <ChevronDown className="h-3.5 w-3.5 opacity-40" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-1 rounded-xl" align="start">
            {periodOptions.map((option) => (
              <PopoverClose key={option.value} asChild>
                <button
                  onClick={() => setPeriod(option.value)}
                  className={cn(
                    'flex items-center w-full px-3 py-2 text-sm rounded-lg transition-colors hover:bg-accent',
                    period === option.value
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground',
                  )}
                >
                  {option.label}
                </button>
              </PopoverClose>
            ))}
          </PopoverContent>
        </Popover>

        {/* Custom date range */}
        {period === 'custom' && (
          <div className="flex gap-2">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 rounded-xl bg-secondary/40 border-none text-sm w-[150px]"
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 rounded-xl bg-secondary/40 border-none text-sm w-[150px]"
            />
          </div>
        )}

        {/* Accounts */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'h-9 rounded-xl border-none bg-secondary/40 font-normal text-sm gap-1.5',
                accountIds.length > 0 && 'bg-primary/10 text-primary',
              )}
            >
              {accountIds.length === 0
                ? 'Todas as contas'
                : `${accountIds.length} conta${accountIds.length > 1 ? 's' : ''}`}
              <ChevronDown className="h-3.5 w-3.5 opacity-40" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-2 rounded-xl" align="start">
            <div className="space-y-0.5 max-h-[280px] overflow-y-auto">
              {accounts.map(acc => (
                <div
                  key={acc.id}
                  className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted cursor-pointer"
                  onClick={() => setAccountIds(prev =>
                    prev.includes(acc.id) ? prev.filter(id => id !== acc.id) : [...prev, acc.id]
                  )}
                >
                  <Checkbox checked={accountIds.includes(acc.id)} className="pointer-events-none" />
                  <span className="text-sm truncate">{acc.name}</span>
                </div>
              ))}
              {accounts.length === 0 && (
                <p className="text-xs text-muted-foreground p-2">Nenhuma conta</p>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Categories */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'h-9 rounded-xl border-none bg-secondary/40 font-normal text-sm gap-1.5',
                categoryIds.length > 0 && 'bg-primary/10 text-primary',
              )}
            >
              {categoryIds.length === 0
                ? 'Todas as categorias'
                : `${categoryIds.length} categoria${categoryIds.length > 1 ? 's' : ''}`}
              <ChevronDown className="h-3.5 w-3.5 opacity-40" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-2 rounded-xl" align="start">
            <div className="space-y-0.5 max-h-[280px] overflow-y-auto">
              {(() => {
                const filtered = categories.filter(c => !c.is_system);
                const topLevel = filtered.filter(c => !c.parent_id);
                const subMap = filtered.filter(c => c.parent_id).reduce((acc, c) => {
                  if (!acc[c.parent_id]) acc[c.parent_id] = [];
                  acc[c.parent_id].push(c);
                  return acc;
                }, {});
                const rows = [];
                topLevel.forEach(cat => {
                  rows.push(
                    <div
                      key={cat.id}
                      className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted cursor-pointer"
                      onClick={() => setCategoryIds(prev =>
                        prev.includes(cat.id) ? prev.filter(id => id !== cat.id) : [...prev, cat.id]
                      )}
                    >
                      <Checkbox checked={categoryIds.includes(cat.id)} className="pointer-events-none" />
                      <span className="text-sm">{cat.icon || '💰'}</span>
                      <span className="text-sm truncate">{cat.name}</span>
                    </div>
                  );
                  (subMap[cat.id] || []).forEach(sub => {
                    rows.push(
                      <div
                        key={sub.id}
                        className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted cursor-pointer pl-6"
                        onClick={() => setCategoryIds(prev =>
                          prev.includes(sub.id) ? prev.filter(id => id !== sub.id) : [...prev, sub.id]
                        )}
                      >
                        <Checkbox checked={categoryIds.includes(sub.id)} className="pointer-events-none" />
                        <span className="text-xs text-muted-foreground">↳</span>
                        <span className="text-sm">{sub.icon || '💰'}</span>
                        <span className="text-sm truncate">{sub.name}</span>
                      </div>
                    );
                  });
                });
                return rows;
              })()}
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={clearFilters}
            className="h-9 rounded-xl text-sm text-muted-foreground hover:text-foreground px-3 gap-1.5"
          >
            <X className="h-3.5 w-3.5" />
            Limpar
            <Badge variant="secondary" className="rounded-full px-1.5 h-4 min-w-[16px] flex items-center justify-center text-[10px] font-bold ml-0.5">
              {activeFiltersCount}
            </Badge>
          </Button>
        )}
      </div>

      {/* ── Transaction list ── */}
      <div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : transactions.length > 0 ? (
          <>
            {/* Count */}
            <div className="flex items-center justify-between mb-4 px-0.5">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{total}</span> transaç{total === 1 ? 'ão' : 'ões'}
                {hasActiveFilters && ' (filtradas)'}
              </p>
            </div>

            <TransactionList
              transactions={transactions}
              onEdit={handleEdit}
              onDelete={handleDelete}
              highlightId={highlightId}
            />

            {/* Pagination */}
            {total > limit && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 px-0.5">
                <p className="text-xs text-muted-foreground">
                  Mostrando{' '}
                  <span className="font-medium">{skip + 1}–{Math.min(skip + transactions.length, total)}</span>
                  {' '}de <span className="font-medium">{total}</span>
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchTransactions(skip - limit)}
                    disabled={skip === 0 || loading}
                    className="rounded-lg h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground tabular-nums">
                    {Math.floor(skip / limit) + 1} / {Math.ceil(total / limit) || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchTransactions(skip + limit)}
                    disabled={skip + limit >= total || loading}
                    className="rounded-lg h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={SearchX}
            title="Nenhuma transação"
            description="Não encontramos registros para os filtros selecionados."
            actionLabel="Adicionar Transação"
            onAction={() => setIsModalOpen(true)}
          />
        )}
      </div>

      {/* ── Modals ── */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        setIsModalOpen(open);
        if (!open) setEditingTransaction(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingTransaction ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
          </DialogHeader>
          <TransactionForm
            key={editingTransaction?.id ?? 'new'}
            categories={categories}
            accounts={accounts}
            transaction={editingTransaction}
            onTransactionCreated={handleTransactionCreated}
            onClose={() => { setIsModalOpen(false); setEditingTransaction(null); }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl border-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir {deleteTarget?.is_transfer ? 'a transferência' : 'a transação'}{' '}
              <strong>"{deleteTarget?.description}"</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Transactions;
