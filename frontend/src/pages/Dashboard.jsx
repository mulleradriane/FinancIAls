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
import MonthlyCommitmentCard from '@/components/dashboard/MonthlyCommitmentCard';

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
  const [monthlyCommitment, setMonthlyCommitment] = useState(null);

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

      const results = await Promise.allSettled([
        analyticsApi.getNetWorth(),           // 0
        analyticsApi.getAssetsLiabilities(),  // 1
        analyticsApi.getOperationalMonthly(), // 2
        analyticsApi.getSavingsRate(),        // 3
        analyticsApi.getBurnRate(),           // 4
        analyticsApi.getGoalsProgress(),      // 5
        analyticsApi.getForecast(),           // 6
        analyticsApi.getDailyExpenses(year, month), // 7
        api.get('/categories/'),              // 8
        api.get('/accounts/'),                // 9
        analyticsApi.getMonthlyCommitment()   // 10
      ]);

      if (results[0].status === 'fulfilled') setNetWorth(results[0].value.data.net_worth);
      if (results[1].status === 'fulfilled') setAssetsLiabilities(results[1].value.data);
      if (results[2].status === 'fulfilled') setOperationalMonthly(results[2].value.data);
      if (results[3].status === 'fulfilled') setSavingsRate(results[3].value.data);
      if (results[4].status === 'fulfilled') setBurnRate(results[4].value.data);
      if (results[5].status === 'fulfilled') setGoals(results[5].value.data);
      if (results[6].status === 'fulfilled') setForecast(results[6].value.data);
      if (results[7].status === 'fulfilled') setDailyExpenses(results[7].value.data);
      if (results[8].status === 'fulfilled') setCategories(results[8].value.data);
      if (results[9].status === 'fulfilled') setAccounts(results[9].value.data);
      if (results[10].status === 'fulfilled') setMonthlyCommitment(results[10].value.data);

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`fetchData: endpoint index ${index} failed`, result.reason);
        }
      });

      const criticalFailed = [0, 2, 4].some(i => results[i].status === 'rejected');
      if (criticalFailed) {
        toast.error('Alguns dados não puderam ser carregados.');
      }
    } catch (error) {
      console.error('Unexpected error in fetchData:', error);
      toast.error('Erro inesperado ao carregar o dashboard.');
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
      {/* LINHA 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <MonthlySummaryCard
          data={{
            totalIncome: currentMonthData.total_income,
            totalExpense: currentMonthData.total_expenses,
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

      {/* LINHA 2 */}
      <div className="grid grid-cols-1 gap-8">
        <MonthlyCommitmentCard data={monthlyCommitment} loading={loading} />
      </div>

      {/* LINHA 3 */}
      <div className="grid grid-cols-1 gap-8">
        <SpendingPaceCard
          data={dailyExpenses}
          loading={loading}
          year={new Date().getFullYear()}
          month={new Date().getMonth() + 1}
        />
      </div>

      {/* LINHA 4 */}
      <div className="grid grid-cols-1 gap-8">
        <EvolutionChart
          data={operationalMonthly}
          loading={loading}
        />
      </div>

      {/* LINHA 5 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <GoalsCard goals={goals} loading={loading} />
        <RecentTransactionsCard />
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
