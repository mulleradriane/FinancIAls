import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/api/api';
import analyticsApi from '@/api/analyticsApi';
import { Plus, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import TransactionForm from '@/components/TransactionForm';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Dashboard Components
import NetWorthCard from '@/components/dashboard/NetWorthCard';
import MonthlySummaryCard from '@/components/dashboard/MonthlySummaryCard';
import SpendingPaceCard from '@/components/dashboard/SpendingPaceCard';
import BurnRateCard from '@/components/dashboard/BurnRateCard';
import EvolutionChart from '@/components/dashboard/EvolutionChart';
import GoalsCard from '@/components/dashboard/GoalsCard';
import RecentTransactionsCard from '@/components/dashboard/RecentTransactionsCard';
import MonthlyCommitmentCard from '@/components/dashboard/MonthlyCommitmentCard';
import MonthOverviewCard from '@/components/MonthOverviewCard';

// ── Utilitários de data ────────────────────────────────────────────────────────
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function isSameMonth(year, month) {
  const now = new Date();
  return year === now.getFullYear() && month === now.getMonth() + 1;
}

function prevMonth(year, month) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

function nextMonth(year, month) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

// ── Seletor de Mês ─────────────────────────────────────────────────────────────
const MonthSelector = ({ year, month, onPrev, onNext, isCurrentMonth }) => {
  return (
    <div className="flex items-center gap-1 bg-secondary/50 rounded-xl p-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-lg hover:bg-background"
        onClick={onPrev}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-1.5 px-2 min-w-[140px] justify-center">
        <span className="text-sm font-semibold">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        {!isCurrentMonth && (
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted rounded-full px-1.5 py-0.5">
            histórico
          </span>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-8 w-8 rounded-lg hover:bg-background',
          isCurrentMonth && 'opacity-30 cursor-not-allowed'
        )}
        onClick={onNext}
        disabled={isCurrentMonth}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

// ── Dashboard ──────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const navigate = useNavigate();

  // ── Mês selecionado ──────────────────────────────────────────────────────
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);

  const isCurrentMonth = isSameMonth(selectedYear, selectedMonth);

  // ── UI State ─────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [greeting, setGreeting] = useState('');

  // ── Data: sempre fixo (patrimônio, burnrate, metas — não dependem do mês) ─
  const [netWorth, setNetWorth] = useState(0);
  const [assetsLiabilities, setAssetsLiabilities] = useState([]);
  const [operationalMonthly, setOperationalMonthly] = useState([]);
  const [burnRate, setBurnRate] = useState({
    avg_monthly_expense_last_3m: 0,
    previous_3m_avg: 0,
    trend: 'STABLE',
  });
  const [goals, setGoals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);

  // ── Data: depende do mês selecionado ─────────────────────────────────────
  const [monthTransactions, setMonthTransactions] = useState([]);
  const [dailyExpenses, setDailyExpenses] = useState(null);
  const [monthlyCommitment, setMonthlyCommitment] = useState(null);
  const [selectedMonthData, setSelectedMonthData] = useState({
    total_income: 0,
    total_expenses: 0,
    net_result: 0,
  });
  const [historicalBalances, setHistoricalBalances] = useState(null);

  // ── Saudação ──────────────────────────────────────────────────────────────
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // ── Fetch dados estáticos (só uma vez ao montar) ──────────────────────────
  const fetchStaticData = useCallback(async () => {
    try {
      // Auto-gera recorrências do mês atual silenciosamente
      api.post('/recurring-expenses/generate').catch(() => {});

      const results = await Promise.allSettled([
        analyticsApi.getNetWorth(),          // 0
        analyticsApi.getAssetsLiabilities(), // 1
        analyticsApi.getOperationalMonthly(),// 2
        analyticsApi.getBurnRate(),          // 3
        analyticsApi.getGoalsProgress(),     // 4
        api.get('/accounts/'),               // 5
        api.get('/categories/'),             // 6
      ]);

      if (results[0].status === 'fulfilled') setNetWorth(results[0].value.data.net_worth);
      if (results[1].status === 'fulfilled') setAssetsLiabilities(results[1].value.data);
      if (results[2].status === 'fulfilled') setOperationalMonthly(results[2].value.data);
      if (results[3].status === 'fulfilled') setBurnRate(results[3].value.data);
      if (results[4].status === 'fulfilled') setGoals(results[4].value.data);
      if (results[5].status === 'fulfilled') setAccounts(results[5].value.data);
      if (results[6].status === 'fulfilled') setCategories(results[6].value.data);

      results.forEach((r, i) => {
        if (r.status === 'rejected') console.error(`fetchStaticData[${i}] failed`, r.reason);
      });
    } catch (err) {
      console.error('fetchStaticData unexpected error', err);
    }
  }, []);

  // ── Fetch dados do mês selecionado ────────────────────────────────────────
  const fetchMonthData = useCallback(
    async (year, month) => {
      setLoading(true);
      try {
        const lastDay = new Date(year, month, 0).getDate();
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        const isCurrentM = isSameMonth(year, month);

        const results = await Promise.allSettled([
          // Transações do mês (inclui futuras se for mês atual)
          api.get('/transactions/', {
            params: {
              date_from: startDate,
              date_to: endDate,
              limit: 500,
              include_future: isCurrentM,
            },
          }),                                         // 0
          analyticsApi.getDailyExpenses(year, month), // 1
          analyticsApi.getMonthlyCommitment(),        // 2
          // Saldos históricos (apenas para meses passados)
          !isCurrentM
            ? api.get(`/analytics/account-balances-history?year=${year}&month=${month}`)
            : Promise.resolve(null),                  // 3
        ]);

        if (results[0].status === 'fulfilled') {
          setMonthTransactions(results[0].value.data.items || []);
        }
        if (results[1].status === 'fulfilled') {
          setDailyExpenses(results[1].value.data);
        }
        if (results[2].status === 'fulfilled') {
          setMonthlyCommitment(results[2].value.data);
        }
        if (!isCurrentM && results[3].status === 'fulfilled' && results[3].value) {
          setHistoricalBalances(results[3].value.data);
        } else {
          setHistoricalBalances(null);
        }

        results.forEach((r, i) => {
          if (r.status === 'rejected') console.error(`fetchMonthData[${i}] failed`, r.reason);
        });
      } catch (err) {
        console.error('fetchMonthData unexpected error', err);
        toast.error('Erro inesperado ao carregar dados do mês.');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ── Efeitos ───────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchStaticData();
    setGreeting(`${getGreeting()}, ${localStorage.getItem('display_name') || 'Usuário'}.`);
  }, [fetchStaticData]);

  useEffect(() => {
    fetchMonthData(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, fetchMonthData]);

  // ── Derived: resumo do mês selecionado a partir de operationalMonthly ─────
  useEffect(() => {
    const found = operationalMonthly.find((d) => {
      const dDate = new Date(d.month);
      return (
        dDate.getUTCFullYear() === selectedYear &&
        dDate.getUTCMonth() + 1 === selectedMonth
      );
    });
    setSelectedMonthData(
      found || { total_income: 0, total_expenses: 0, net_result: 0 }
    );
  }, [operationalMonthly, selectedYear, selectedMonth]);

  const totalAssets = assetsLiabilities.find((a) => a.classification === 'asset')?.total || 0;
  const totalLiabilities = assetsLiabilities.find((a) => a.classification === 'liability')?.total || 0;

  // ── Navegação de mês ──────────────────────────────────────────────────────
  const handlePrevMonth = () => {
    const { year, month } = prevMonth(selectedYear, selectedMonth);
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  const handleNextMonth = () => {
    if (isCurrentMonth) return;
    const { year, month } = nextMonth(selectedYear, selectedMonth);
    setSelectedYear(year);
    setSelectedMonth(month);
  };

  // ── Refresh após nova transação ───────────────────────────────────────────
  const handleTransactionCreated = () => {
    fetchStaticData();
    fetchMonthData(selectedYear, selectedMonth);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">{greeting}</h1>
          <p className="text-muted-foreground mt-1 text-base">
            Consolidado da sua saúde financeira.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <MonthSelector
            year={selectedYear}
            month={selectedMonth}
            onPrev={handlePrevMonth}
            onNext={handleNextMonth}
            isCurrentMonth={isCurrentMonth}
          />
          <Button
            variant="outline"
            onClick={() => navigate('/transactions')}
            className="rounded-xl"
          >
            <List className="mr-2 h-4 w-4" /> Extrato
          </Button>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="rounded-xl shadow-lg shadow-primary/20"
          >
            <Plus className="mr-2 h-5 w-5" /> Nova Transação
          </Button>
        </div>
      </div>

      {/* ── Resumo do Mês ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
          Resumo do Mês
        </h2>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <MonthlySummaryCard
          data={{
            totalIncome: selectedMonthData.total_income,
            totalExpense: selectedMonthData.total_expenses,
          }}
          loading={loading}
        />
        <BurnRateCard
          avgMonthlyExpense={burnRate.avg_monthly_expense_last_3m}
          trend={burnRate.trend}
          previousAvg={burnRate.previous_3m_avg}
          loading={loading}
        />
        <NetWorthCard
          netWorth={netWorth}
          assets={totalAssets}
          liabilities={totalLiabilities}
          loading={loading}
        />
      </div>

      {/* ── Comprometimento Mensal ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
          Comprometimento Mensal
        </h2>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="grid grid-cols-1 gap-8">
        <MonthlyCommitmentCard data={monthlyCommitment} loading={loading} />
      </div>

      {/* ── Visão do Mês ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
          Visão do Mês
        </h2>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="grid grid-cols-1 gap-8">
        <MonthOverviewCard
          accounts={accounts}
          transactions={monthTransactions}
          loading={loading}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          historicalBalances={historicalBalances}
        />
      </div>

      {/* ── Ritmo de Gastos ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
          Ritmo de Gastos
        </h2>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="grid grid-cols-1 gap-8">
        <SpendingPaceCard
          data={dailyExpenses}
          loading={loading}
          year={selectedYear}
          month={selectedMonth}
        />
      </div>

      {/* ── Evolução Patrimonial ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
          Evolução Patrimonial
        </h2>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="grid grid-cols-1 gap-8">
        <EvolutionChart data={operationalMonthly} loading={loading} />
      </div>

      {/* ── Metas e Atividade Recente ─────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
          Metas e Atividade Recente
        </h2>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <GoalsCard goals={goals} loading={loading} />
        <RecentTransactionsCard />
      </div>

      {/* ── Transaction Modal ─────────────────────────────────────────────── */}
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
