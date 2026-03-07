import React, { useState, useEffect } from 'react';
import api from '@/api/api';
import { toast } from 'sonner';
import TransactionForm from '@/components/TransactionForm';
import TransactionList from '@/components/TransactionList';
import { Plus, Filter, X, ArrowUpCircle, ArrowDownCircle, Wallet, SearchX, Download, Calendar, Search, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverClose,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import PrivateValue from '@/components/ui/PrivateValue';
import { cn, parseLocalDate } from '@/lib/utils';


const Transactions = () => {
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
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
    const today = now.toISOString().split('T')[0];

    switch (period) {
      case '30days':
        end = today;
        const d30 = new Date();
        d30.setDate(d30.getDate() - 30);
        start = d30.toISOString().split('T')[0];
        break;
      case '90days':
        end = today;
        const d90 = new Date();
        d90.setDate(d90.getDate() - 90);
        start = d90.toISOString().split('T')[0];
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
        end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
        break;
      case '6months':
        end = today;
        const d6m = new Date();
        d6m.setDate(d6m.getDate() - 180);
        start = d6m.toISOString().split('T')[0];
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        end = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
        break;
      case 'last_year':
        start = new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
        end = new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0];
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
      setTotal(response.data.total);
      setSkip(response.data.skip);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchAccounts();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
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
    await Promise.all([
      fetchTransactions(),
      fetchAccounts()
    ]);
    if (newTransaction && newTransaction.id) {
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
    { value: 'all', label: 'Todo período' },
    { value: '30days', label: 'Últimos 30 dias' },
    { value: '90days', label: 'Últimos 90 dias' },
    { value: 'month', label: 'Este mês' },
    { value: 'last_month', label: 'Mês passado' },
    { value: '6months', label: 'Últimos 6 meses' },
    { value: 'year', label: 'Este ano' },
    { value: 'last_year', label: 'Ano passado' },
    { value: 'custom', label: 'Personalizado' },
  ];

  const currentPeriodLabel = periodOptions.find(o => o.value === period)?.label || 'Período';

  const activeFiltersCount = accountIds.length +
    categoryIds.length +
    (period !== 'month' ? 1 : 0) +
    (search !== '' ? 1 : 0) +
    (startDate !== '' ? 1 : 0) +
    (endDate !== '' ? 1 : 0);

  const hasActiveFilters = activeFiltersCount > 0;

  const totals = transactions.reduce((acc, t) => {
    if (t.category_is_system) return acc;
    const val = parseFloat(t.amount);
    if (val > 0) acc.incomes += val;
    else acc.expenses += Math.abs(val);
    return acc;
  }, { incomes: 0, expenses: 0 });

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleDelete = (transaction) => {
    setDeleteTarget(transaction);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const type = deleteTarget.is_transfer ? 'transferência' : 'transação';
    try {
      await api.delete(`/transactions/${deleteTarget.id}`);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} excluída!`);
      fetchTransactions();
      fetchAccounts();
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
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

      if (data.length === 0) {
        toast.error('Nenhuma transação para exportar');
        return;
      }

      const natureMap = {
        'INCOME': 'Receita',
        'EXPENSE': 'Despesa',
        'INVESTMENT': 'Investimento',
        'TRANSFER': 'Transferência',
        'SYSTEM_ADJUSTMENT': 'Ajuste'
      };

      const headers = ['Data', 'Descrição', 'Categoria', 'Conta', 'Valor', 'Natureza'];
      const rows = data.map(t => [
        parseLocalDate(t.date).toLocaleDateString('pt-BR'),
        t.description,
        t.category_name || (t.category_is_system ? 'Sistema' : 'Sem Categoria'),
        t.account_name,
        t.amount.toString().replace('.', ','),
        natureMap[t.nature] || t.nature
      ]);

      const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.join(';'))
      ].join('\n');

      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `transacoes_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Exportação concluída!');
    } catch (error) {
      console.error('Error exporting transactions:', error);
      toast.error('Erro ao exportar transações');
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transações</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas movimentações financeiras.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={exportToCSV} size="lg" className="rounded-xl">
            <Download className="mr-2 h-5 w-5" /> Exportar CSV
          </Button>
          <Button onClick={() => setIsModalOpen(true)} size="lg" className="rounded-xl shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-5 w-5" /> Nova Transação
          </Button>
        </div>
      </div>

      {/* Resumo Rápido */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="border-none shadow-md bg-success/5">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-success/10 rounded-2xl">
              <ArrowUpCircle className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Entradas</p>
              <h3 className="text-2xl font-bold text-success"><PrivateValue value={formatCurrency(totals.incomes)} /></h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-destructive/5">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-destructive/10 rounded-2xl">
              <ArrowDownCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Saídas</p>
              <h3 className="text-2xl font-bold text-destructive"><PrivateValue value={formatCurrency(totals.expenses)} /></h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-md bg-primary/5">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Saldo do Período</p>
              <h3 className="text-2xl font-bold text-primary"><PrivateValue value={formatCurrency(totals.incomes - totals.expenses)} /></h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <Card className="border-none shadow-sm bg-secondary/30">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row items-end gap-4 flex-wrap">
            <div className="w-full lg:w-[260px] space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Busca</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-background rounded-xl border-none shadow-sm pl-9 pr-9 h-10"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="w-full lg:w-auto space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Período</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full lg:w-[200px] justify-start bg-background rounded-xl border-none shadow-sm font-normal">
                    <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                    {currentPeriodLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0" align="start">
                  <div className="flex flex-col">
                    {periodOptions.map((option) => (
                      <PopoverClose key={option.value} asChild>
                        <button
                          onClick={() => setPeriod(option.value)}
                          className={cn(
                            "flex items-center px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground w-full text-left",
                            period === option.value ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground"
                          )}
                        >
                          {option.label}
                        </button>
                      </PopoverClose>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {period === 'custom' && (
              <div className="flex gap-2 w-full lg:w-auto">
                <div className="space-y-1.5 flex-1 lg:w-[150px]">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Início</label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-background rounded-xl border-none shadow-sm" />
                </div>
                <div className="space-y-1.5 flex-1 lg:w-[150px]">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Fim</label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-background rounded-xl border-none shadow-sm" />
                </div>
              </div>
            )}

            <div className="w-full lg:w-auto space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Conta</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full lg:w-[200px] bg-background rounded-xl border-none shadow-sm justify-between font-normal h-10"
                  >
                    <span className="truncate">
                      {accountIds.length === 0
                        ? 'Todas as Contas'
                        : `${accountIds.length} conta${accountIds.length > 1 ? 's' : ''} selecionada${accountIds.length > 1 ? 's' : ''}`}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-2" align="start">
                  <div className="space-y-1 max-h-[300px] overflow-y-auto">
                    {accounts.map(acc => (
                      <div
                        key={acc.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer"
                        onClick={() => {
                          setAccountIds(prev =>
                            prev.includes(acc.id)
                              ? prev.filter(id => id !== acc.id)
                              : [...prev, acc.id]
                          );
                        }}
                      >
                        <Checkbox checked={accountIds.includes(acc.id)} />
                        <span className="text-sm truncate">{acc.name}</span>
                      </div>
                    ))}
                    {accounts.length === 0 && <p className="text-xs text-muted-foreground p-2">Nenhuma conta encontrada</p>}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="w-full lg:w-auto space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Categoria</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full lg:w-[200px] bg-background rounded-xl border-none shadow-sm justify-between font-normal h-10"
                  >
                    <span className="truncate">
                      {categoryIds.length === 0
                        ? 'Todas as Categorias'
                        : `${categoryIds.length} categoria${categoryIds.length > 1 ? 's' : ''} selecionada${categoryIds.length > 1 ? 's' : ''}`}
                    </span>
                    <ChevronDown className="ml-2 h-4 w-4 opacity-50 shrink-0" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-2" align="start">
                  <div className="space-y-1 max-h-[300px] overflow-y-auto">
                    {categories
                      .filter(cat => !cat.is_system)
                      .map(cat => (
                        <div
                          key={cat.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted cursor-pointer"
                          onClick={() => {
                            setCategoryIds(prev =>
                              prev.includes(cat.id)
                                ? prev.filter(id => id !== cat.id)
                                : [...prev, cat.id]
                            );
                          }}
                        >
                          <Checkbox checked={categoryIds.includes(cat.id)} />
                          <span className="text-sm truncate">{cat.name}</span>
                        </div>
                      ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-background rounded-xl px-3 h-10 border shadow-sm">
                  <Filter className="h-4 w-4 text-primary" />
                  <Badge variant="secondary" className="rounded-full px-1.5 h-5 min-w-[20px] flex items-center justify-center text-[10px] font-bold">{/* design-token: manter */}
                    {activeFiltersCount}
                  </Badge>
                </div>
                <Button variant="ghost" onClick={clearFilters} className="rounded-xl h-10 px-4 hover:bg-background">
                  <X className="mr-2 h-4 w-4" /> Limpar
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={(open) => {
        setIsModalOpen(open);
        if (!open) setEditingTransaction(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingTransaction ? "Editar Transação" : "Nova Transação"}</DialogTitle>
          </DialogHeader>
          <TransactionForm
            key={editingTransaction?.id ?? 'new'}
            categories={categories}
            accounts={accounts}
            transaction={editingTransaction}
            onTransactionCreated={handleTransactionCreated}
            onClose={() => {
              setIsModalOpen(false);
              setEditingTransaction(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl border-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta {deleteTarget?.is_transfer ? 'transferência' : 'transação'}?
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

      <div className="mt-8">
        <div className="flex items-center justify-between mb-6 px-1">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            Histórico
            {!loading && <Badge variant="secondary" className="rounded-full px-2 py-0 text-xs">{total}</Badge>}
          </h2>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : transactions.length > 0 ? (
          <>
            <TransactionList
              transactions={transactions}
              onEdit={handleEdit}
              onDelete={handleDelete}
              highlightId={highlightId}
            />

            {/* Paginação */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 px-1">
              <p className="text-sm text-muted-foreground">
                Mostrando <span className="font-medium">{transactions.length}</span> de <span className="font-medium">{total}</span> transações
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchTransactions(skip - limit)}
                  disabled={skip === 0 || loading}
                  className="rounded-lg h-9 w-9 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1 mx-2">
                  <span className="text-sm font-medium">Página {Math.floor(skip / limit) + 1}</span>
                  <span className="text-sm text-muted-foreground">de {Math.ceil(total / limit) || 1}</span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchTransactions(skip + limit)}
                  disabled={skip + limit >= total || loading}
                  className="rounded-lg h-9 w-9 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState
            icon={SearchX}
            title="Nenhuma transação"
            description="Não encontramos registros para os filtros selecionados no momento."
            actionLabel="Adicionar Transação"
            onAction={() => setIsModalOpen(true)}
          />
        )}
      </div>
    </div>
  );
};

export default Transactions;
