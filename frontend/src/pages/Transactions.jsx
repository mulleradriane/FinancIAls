import React, { useState, useEffect } from 'react';
import api from '@/api/api';
import { toast } from 'sonner';
import TransactionForm from '@/components/TransactionForm';
import TransactionList from '@/components/TransactionList';
import { Plus, Filter, X, ArrowUpCircle, ArrowDownCircle, Wallet, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";

const Transactions = () => {
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [highlightId, setHighlightId] = useState(null);

  // Filters
  const [period, setPeriod] = useState('month');
  const [accountId, setAccountId] = useState('all');
  const [categoryId, setCategoryId] = useState('all');
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

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = {};
      if (accountId !== 'all') params.account_id = accountId;
      if (categoryId !== 'all') params.category_id = categoryId;

      let start = startDate;
      let end = endDate;

      if (period !== 'custom') {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        end = today;

        if (period === '30days') {
          const d = new Date();
          d.setDate(d.getDate() - 30);
          start = d.toISOString().split('T')[0];
        } else if (period === '60days') {
          const d = new Date();
          d.setDate(d.getDate() - 60);
          start = d.toISOString().split('T')[0];
        } else if (period === '90days') {
          const d = new Date();
          d.setDate(d.getDate() - 90);
          start = d.toISOString().split('T')[0];
        } else if (period === 'month') {
          const d = new Date(now.getFullYear(), now.getMonth(), 1);
          start = d.toISOString().split('T')[0];
        }
      }

      if (start) params.start_date = start;
      if (end) params.end_date = end;

      const response = await api.get('/transactions/', { params });
      setTransactions(response.data);
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
    fetchTransactions();
  }, [period, accountId, categoryId, startDate, endDate]);

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleTransactionCreated = async (newTransaction) => {
    await fetchTransactions();
    if (newTransaction && newTransaction.id) {
      setHighlightId(newTransaction.id);
      setTimeout(() => setHighlightId(null), 2000);
    }
  };

  const clearFilters = () => {
    setPeriod('month');
    setAccountId('all');
    setCategoryId('all');
    setStartDate('');
    setEndDate('');
  };

  const totals = transactions.reduce((acc, t) => {
    if (t.category_is_system) return acc;
    const val = parseFloat(t.amount);
    if (val > 0) acc.incomes += val;
    else acc.expenses += Math.abs(val);
    return acc;
  }, { incomes: 0, expenses: 0 });

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleDelete = async (transaction) => {
    const type = transaction.is_transfer ? 'transferência' : 'transação';
    if (window.confirm(`Tem certeza que deseja excluir esta ${type}?`)) {
      try {
        await api.delete(`/transactions/${transaction.id}`);
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} excluída!`);
        fetchTransactions();
      } catch (error) {
        console.error(`Error deleting ${type}:`, error);
        const detail = error.response?.data?.detail || `Erro ao excluir ${type}.`;
        toast.error(detail);
      }
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transações</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas movimentações financeiras.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} size="lg" className="rounded-xl shadow-lg shadow-primary/20">
          <Plus className="mr-2 h-5 w-5" /> Nova Transação
        </Button>
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
              <h3 className="text-2xl font-bold text-success">{formatCurrency(totals.incomes)}</h3>
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
              <h3 className="text-2xl font-bold text-destructive">{formatCurrency(totals.expenses)}</h3>
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
              <h3 className="text-2xl font-bold text-primary">{formatCurrency(totals.incomes - totals.expenses)}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <Card className="border-none shadow-sm bg-secondary/30">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row items-end gap-4">
            <div className="w-full lg:w-auto space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Período</label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-full lg:w-[180px] bg-background rounded-xl border-none shadow-sm">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Mês Atual</SelectItem>
                  <SelectItem value="30days">Últimos 30 dias</SelectItem>
                  <SelectItem value="60days">Últimos 60 dias</SelectItem>
                  <SelectItem value="90days">Últimos 90 dias</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
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
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="w-full lg:w-[200px] bg-background rounded-xl border-none shadow-sm">
                  <SelectValue placeholder="Todas as Contas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Contas</SelectItem>
                  {accounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full lg:w-auto space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Categoria</label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="w-full lg:w-[200px] bg-background rounded-xl border-none shadow-sm">
                  <SelectValue placeholder="Todas as Categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  {categories
                    .filter(cat => !cat.is_system)
                    .map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Button variant="ghost" onClick={clearFilters} className="rounded-xl h-10 px-4 hover:bg-background">
              <X className="mr-2 h-4 w-4" /> Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingTransaction ? "Editar Transação" : "Nova Transação"}</DialogTitle>
          </DialogHeader>
          <TransactionForm
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

      <div className="mt-8">
        <div className="flex items-center justify-between mb-6 px-1">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            Histórico
            {!loading && <Badge variant="secondary" className="rounded-full px-2 py-0 text-xs">{transactions.length}</Badge>}
          </h2>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : transactions.length > 0 ? (
          <TransactionList
            transactions={transactions}
            onEdit={handleEdit}
            onDelete={handleDelete}
            highlightId={highlightId}
          />
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
