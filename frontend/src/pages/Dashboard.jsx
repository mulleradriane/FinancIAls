import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/api/api';
import analyticsApi from '@/api/analyticsApi';
import { Plus, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TransactionForm from '@/components/TransactionForm';
import { toast } from 'sonner';

// Dashboard Components
import NetWorthCard from '@/components/dashboard/NetWorthCard';
import MonthlySummaryCard from '@/components/dashboard/MonthlySummaryCard';
import SpendingPaceCard from '@/components/dashboard/SpendingPaceCard';
import BurnRateCard from '@/components/dashboard/BurnRateCard';
import EvolutionChart from '@/components/dashboard/EvolutionChart';
import GoalsCard from '@/components/dashboard/GoalsCard';
import ForecastCard from '@/components/dashboard/ForecastCard';
import RecentTransactionsCard from '@/components/dashboard/RecentTransactionsCard';
import UpcomingExpensesCard from '@/components/dashboard/UpcomingExpensesCard';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [greeting, setGreeting] = useState('');

  // Data State
  const [netWorth, setNetWorth] = useState(0);
  const [assetsLiabilities, setAssetsLiabilities] = useState([]);
  const [operationalMonthly, setOperationalMonthly] = useState([]);
  const [savingsRate, setSavingsRate] = useState([]);
  const [burnRate, setBurnRate] = useState({ avg_monthly_expense_last_3m: 0, previous_3m_avg: 0, trend: 'STABLE' });
  const [goals, setGoals] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [dailyExpenses, setDailyExpenses] = useState(null);

  // Form requirements
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);

  const navigate = useNavigate();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      const [
        netWorthRes,
        alRes,
        omRes,
        srRes,
        brRes,
        goalsRes,
        forecastRes,
        dailyExpensesRes,
        categoriesRes,
        accountsRes
      ] = await Promise.all([
        analyticsApi.getNetWorth(),
        analyticsApi.getAssetsLiabilities(),
        analyticsApi.getOperationalMonthly(),
        analyticsApi.getSavingsRate(),
        analyticsApi.getBurnRate(),
        analyticsApi.getGoalsProgress(),
        analyticsApi.getForecast(),
        analyticsApi.getDailyExpenses(year, month),
        api.get('/categories/'),
        api.get('/accounts/')
      ]);

      setNetWorth(netWorthRes.data.net_worth);
      setAssetsLiabilities(alRes.data);
      setOperationalMonthly(omRes.data);
      setSavingsRate(srRes.data);
      setBurnRate(brRes.data);
      setGoals(goalsRes.data);
      setForecast(forecastRes.data);
      setDailyExpenses(dailyExpensesRes.data);
      setCategories(categoriesRes.data);
      setAccounts(accountsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const name = localStorage.getItem('display_name') || "Usuário";
    setGreeting(`${getGreeting()}, ${name}.`);
  }, []);

  const currentMonthData = operationalMonthly[operationalMonthly.length - 1] || { total_income: 0, total_expenses: 0, net_result: 0 };
  const currentSavingsRate = savingsRate[savingsRate.length - 1]?.savings_rate || 0;

  const totalAssets = assetsLiabilities.find(a => a.classification === 'asset')?.total || 0;
  const totalLiabilities = assetsLiabilities.find(a => a.classification === 'liability')?.total || 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">{greeting}</h1>
          <p className="text-muted-foreground mt-1 text-base">Consolidado da sua saúde financeira.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/transactions')} className="rounded-xl">
            <List className="mr-2 h-4 w-4" /> Extrato
          </Button>
          <Button onClick={() => setIsModalOpen(true)} className="rounded-xl shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-5 w-5" /> Nova Transação
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <NetWorthCard
          netWorth={netWorth}
          assets={totalAssets}
          liabilities={totalLiabilities}
          loading={loading}
        />
        <BurnRateCard
          avgMonthlyExpense={burnRate.avg_monthly_expense_last_3m}
          trend={burnRate.trend}
          previousAvg={burnRate.previous_3m_avg}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-8">
        <MonthlySummaryCard
          income={currentMonthData.total_income}
          expense={currentMonthData.total_expenses}
          result={currentMonthData.net_result}
          savingsRate={currentSavingsRate}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-8">
        <SpendingPaceCard
          data={dailyExpenses}
          loading={loading}
          year={new Date().getFullYear()}
          month={new Date().getMonth() + 1}
        />
      </div>

      <div className="grid grid-cols-1 gap-8">
        <EvolutionChart
          data={operationalMonthly}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-8">
        <GoalsCard goals={goals} loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-8">
        <ForecastCard forecast={forecast} loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <RecentTransactionsCard />
        <UpcomingExpensesCard />
      </div>

      {/* Transaction Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nova Transação</DialogTitle>
          </DialogHeader>
          <TransactionForm
            categories={categories}
            accounts={accounts}
            onTransactionCreated={fetchData}
            onClose={() => setIsModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
