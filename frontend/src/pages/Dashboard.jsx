import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/api/api';
import analyticsApi from '@/api/analyticsApi';
import { Plus, List, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import TransactionForm from '@/components/TransactionForm';
import { toast } from 'sonner';
import { cn, formatCurrency } from '@/lib/utils';

import NetWorthCard from '@/components/dashboard/NetWorthCard';
import SpendingPaceCard from '@/components/dashboard/SpendingPaceCard';
import EvolutionChart from '@/components/dashboard/EvolutionChart';
import GoalsCard from '@/components/dashboard/GoalsCard';
import RecentTransactionsCard from '@/components/dashboard/RecentTransactionsCard';
import UpcomingExpensesCard from '@/components/dashboard/UpcomingExpensesCard';
import MonthOverviewCard from '@/components/MonthOverviewCard';

// ── Utilitários de navegação de mês ───────────────────────────────────────────
const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

const isSameMonth = (year, month) => {
  const now = new Date();
  return year === now.getFullYear() && month === now.getMonth() + 1;
};

const prevMonth = (year, month) =>
  month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };

const nextMonth = (year, month) =>
  month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };

// ── Seletor de Mês ─────────────────────────────────────────────────────────────
const MonthSelector = ({ year, month, onPrev, onNext, isCurrentMonth }) => (
  <div className="flex items-center gap-1 bg-secondary/50 rounded-xl p-1">
    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-background" onClick={onPrev}>
      <ChevronLeft className="h-4 w-4" />
    </Button>
    <div className="flex items-center gap-1.5 px-2 min-w-[140px] justify-center">
      <span className="text-sm font-semibold">{MONTH_NAMES[month - 1]} {year}</span>
      {!isCurrentMonth && (
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted rounded-full px-1.5 py-0.5">
          histórico
        </span>
      )}
    </div>
    <Button
      variant="ghost"
      size="icon"
      className={cn('h-8 w-8 rounded-lg hover:bg-background', isCurrentMonth && 'opacity-30 cursor-not-allowed')}
      onClick={onNext}
      disabled={isCurrentMonth}
    >
      <ChevronRight className="h-4 w-4" />
    </Button>
  </div>
);

// ── Dashboard ──────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();

  const now = new Date();
  const [selectedYear, setSelectedYear]   = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const isCurrentMonth = isSameMonth(selectedYear, selectedMonth);

  const [loading, setLoading]     = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [greeting, setGreeting]   = useState('');

  // Dados estáticos (não dependem do mês)
  const [netWorth, setNetWorth]               = useState(0);
  const [assetsLiabilities, setAssetsLiabilities] = useState([]);
  const [operationalMonthly, setOperationalMonthly] = useState([]);
  const [goals, setGoals]                     = useState([]);
  const [accounts, setAccounts]               = useState([]);
  const [categories, setCategories]           = useState([]);

  // Dados dependentes do mês
  const [monthTransactions, setMonthTransactions] = useState([]);
  const [dailyExpenses, setDailyExpenses]         = useState(null);
  const [historicalBalances, setHistoricalBalances] = useState(null);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'Bom dia';
    if (h >= 12 && h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // ── Fetch dados estáticos ─────────────────────────────────────────────────
  const fetchStaticData = useCallback(async () => {
    // Gera recorrências silenciosamente — sem bloquear o carregamento
    api.post('/recurring-expenses/generate').catch((err) => {
      console.warn('Falha ao gerar recorrências:', err?.response?.data ?? err.message);
    });

    const results = await Promise.allSettled([
      analyticsApi.getNetWorth(),           // 0
      analyticsApi.getAssetsLiabilities(),  // 1
      analyticsApi.getOperationalMonthly(), // 2
      analyticsApi.getGoalsProgress(),      // 3
      api.get('/accounts/'),                // 4
      api.get('/categories/'),              // 5
    ]);

    if (results[0].status === 'fulfilled') setNetWorth(results[0].value.data?.net_worth ?? 0);
    if (results[1].status === 'fulfilled') setAssetsLiabilities(results[1].value.data ?? []);
    if (results[2].status === 'fulfilled') setOperationalMonthly(results[2].value.data ?? []);
    if (results[3].status === 'fulfilled') setGoals(results[3].value.data ?? []);
    if (results[4].status === 'fulfilled') setAccounts(results[4].value.data ?? []);
    if (results[5].status === 'fulfilled') setCategories(results[5].value.data ?? []);
  }, []);

  // ── Fetch dados do mês selecionado ────────────────────────────────────────
  const fetchMonthData = useCallback(async (year, month) => {
    setLoading(true);
    try {
      const lastDay   = new Date(year, month, 0).getDate();
      const startDate = `${year}-${String(month).padStart(2,'0')}-01`;
      const endDate   = `${year}-${String(month).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
      const isCurrent = isSameMonth(year, month);

      const results = await Promise.allSettled([
        api.get('/transactions/', {
          params: { date_from: startDate, date_to: endDate, limit: 500, include_future: isCurrent },
        }),                                          // 0
        analyticsApi.getDailyExpenses(year, month),  // 1
        !isCurrent
          ? api.get(`/analytics/account-balances-history?year=${year}&month=${month}`)
          : Promise.resolve(null),                   // 2
      ]);

      if (results[0].status === 'fulfilled') setMonthTransactions(results[0].value.data.items || []);
      if (results[1].status === 'fulfilled') setDailyExpenses(results[1].value.data);
      if (!isCurrent && results[2].status === 'fulfilled' && results[2].value) {
        setHistoricalBalances(results[2].value.data);
      } else {
        setHistoricalBalances(null);
      }
    } catch (err) {
      console.error('fetchMonthData error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Efeitos ───────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchStaticData();
    setGreeting(`${getGreeting()}, ${localStorage.getItem('display_name') || 'Usuário'}.`);
  }, [fetchStaticData]);

  useEffect(() => {
    fetchMonthData(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, fetchMonthData]);

  // Escuta evento global de nova transação (vindo do quick-add no MainLayout)
  useEffect(() => {
    const handler = () => {
      fetchStaticData();
      fetchMonthData(selectedYear, selectedMonth);
    };
    window.addEventListener('transaction:created', handler);
    return () => window.removeEventListener('transaction:created', handler);
  }, [selectedYear, selectedMonth, fetchStaticData, fetchMonthData]);

  const totalAssets      = assetsLiabilities.find(a => a.classification === 'asset')?.total || 0;
  const totalLiabilities = assetsLiabilities.find(a => a.classification === 'liability')?.total || 0;

  const handlePrevMonth = () => {
    const { year, month } = prevMonth(selectedYear, selectedMonth);
    setSelectedYear(year); setSelectedMonth(month);
  };
  const handleNextMonth = () => {
    if (isCurrentMonth) return;
    const { year, month } = nextMonth(selectedYear, selectedMonth);
    setSelectedYear(year); setSelectedMonth(month);
  };

  const handleTransactionCreated = () => {
    fetchStaticData();
    fetchMonthData(selectedYear, selectedMonth);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">{greeting}</h1>
          <p className="text-muted-foreground mt-1 text-base">Controle da sua saúde financeira.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <MonthSelector
            year={selectedYear}
            month={selectedMonth}
            onPrev={handlePrevMonth}
            onNext={handleNextMonth}
            isCurrentMonth={isCurrentMonth}
          />
          <Button variant="outline" onClick={() => navigate('/transactions')} className="rounded-xl">
            <List className="mr-2 h-4 w-4" /> Extrato
          </Button>
          <Button onClick={() => setIsModalOpen(true)} className="rounded-xl shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-5 w-5" /> Nova Transação
          </Button>
        </div>
      </div>

      {/* ── BLOCO 1: Situação do Mês + Patrimônio ── */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Situação do mês</h2>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MonthOverviewCard ocupa 2/3 */}
        <div className="lg:col-span-2">
          <MonthOverviewCard
            accounts={accounts}
            transactions={monthTransactions}
            loading={loading}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            historicalBalances={historicalBalances}
          />
        </div>
        {/* NetWorthCard ocupa 1/3 */}
        <NetWorthCard
          netWorth={netWorth}
          assets={totalAssets}
          liabilities={totalLiabilities}
          loading={loading}
        />
      </div>

      {/* ── BLOCO 2: Ritmo de Gastos ── */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Ritmo de gastos</h2>
        <div className="flex-1 h-px bg-border" />
      </div>
      <SpendingPaceCard
        data={dailyExpenses}
        loading={loading}
        year={selectedYear}
        month={selectedMonth}
      />

      {/* ── BLOCO 3: Evolução Patrimonial ── */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Evolução patrimonial</h2>
        <div className="flex-1 h-px bg-border" />
      </div>
      <EvolutionChart data={operationalMonthly} loading={loading} />

      {/* ── Alertas de orçamento (só no mês atual, só se houver categorias no limite) ── */}
      {isCurrentMonth && (() => {
        const overBudget = categories.filter((c) => {
          const limit = parseFloat(c.monthly_budget || 0);
          const spent = parseFloat(c.current_spending || 0);
          return limit > 0 && c.type === 'expense' && spent / limit >= 0.8;
        });
        if (overBudget.length === 0) return null;
        return (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex flex-wrap items-start gap-3">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider">Atenção ao orçamento</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {overBudget.map((c) => {
                const pct = Math.round((parseFloat(c.current_spending) / parseFloat(c.monthly_budget)) * 100);
                const isOver = pct >= 100;
                return (
                  <span
                    key={c.id}
                    className={cn(
                      'inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-0.5',
                      isOver
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
                    )}
                  >
                    <span>{c.icon || '💰'}</span>
                    {c.name}
                    <span className="opacity-70">{pct}%</span>
                  </span>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── BLOCO 4: Metas + Próximas despesas + Atividade recente ── */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Metas e atividade recente</h2>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GoalsCard goals={goals} loading={loading} />
        <RecentTransactionsCard />
      </div>

      {/* ── BLOCO 5: Próximas despesas ── */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Próximas despesas</h2>
        <div className="flex-1 h-px bg-border" />
      </div>
      <UpcomingExpensesCard />

      {/* Modal Nova Transação */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nova Transação</DialogTitle>
          </DialogHeader>
          <TransactionForm
            categories={categories}
            accounts={accounts}
            onTransactionCreated={handleTransactionCreated}
            onClose={() => setIsModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
