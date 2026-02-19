import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/api/api';
import {
  Wallet,
  Plus,
  List,
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  TrendingDown,
  ArrowRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TransactionForm from '@/components/TransactionForm';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const VariationBadge = ({ value, type }) => {
  if (value === 0 || value === undefined) return null;

  const isPositive = value > 0;
  let isGood = isPositive;
  if (type === 'expense') isGood = !isPositive;
  if (type === 'balance') isGood = isPositive;

  return (
    <div className={cn(
      "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold",
      isGood ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
    )}>
      {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {Math.abs(value).toFixed(1)}%
      <span className="font-normal opacity-70 ml-0.5 text-[8px] uppercase">vs mês ant.</span>
    </div>
  );
};

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState('');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dashboardRes, categoriesRes, accountsRes] = await Promise.all([
        api.get('/summary/dashboard'),
        api.get('/categories/'),
        api.get('/accounts/')
      ]);
      setData(dashboardRes.data);
      setCategories(categoriesRes.data);
      setAccounts(accountsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const userSettings = JSON.parse(localStorage.getItem('userSettings') || '{}');
    const name = userSettings.displayName || "Usuário";
    setGreeting(`${getGreeting()}, ${name}.`);
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading || !data) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-10 w-48 rounded-xl" />
            <Skeleton className="h-4 w-64 rounded-lg" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-40 rounded-xl" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Skeleton className="lg:col-span-2 h-[400px] rounded-2xl" />
          <Skeleton className="h-[400px] rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{greeting}</h1>
          <p className="text-muted-foreground">Bem-vindo ao seu controle financeiro premium.</p>
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

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-md overflow-hidden group">
          <CardContent className="p-0">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <VariationBadge value={data.balance_variation} type="balance" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Saldo Total</p>
              <h2 className={cn(
                "text-3xl font-bold mt-1",
                data.current_balance >= 0 ? "text-foreground" : "text-destructive"
              )}>
                {formatCurrency(data.current_balance)}
              </h2>
            </div>
            <div className="h-1 w-full bg-primary/10 group-hover:bg-primary/30 transition-colors" />
          </CardContent>
        </Card>

        <Card className="border-none shadow-md overflow-hidden group">
          <CardContent className="p-0">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-success/10 rounded-xl group-hover:scale-110 transition-transform">
                  <ArrowUpCircle className="h-5 w-5 text-success" />
                </div>
                <VariationBadge value={data.income_variation} type="income" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Receitas do Mês</p>
              <h2 className="text-3xl font-bold mt-1 text-success">
                {formatCurrency(data.monthly_income)}
              </h2>
            </div>
            <div className="h-1 w-full bg-success/10 group-hover:bg-success/30 transition-colors" />
          </CardContent>
        </Card>

        <Card className="border-none shadow-md overflow-hidden group">
          <CardContent className="p-0">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-destructive/10 rounded-xl group-hover:scale-110 transition-transform">
                  <ArrowDownCircle className="h-5 w-5 text-destructive" />
                </div>
                <VariationBadge value={data.expenses_variation} type="expense" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Despesas do Mês</p>
              <h2 className="text-3xl font-bold mt-1 text-destructive">
                {formatCurrency(data.monthly_expenses)}
              </h2>
            </div>
            <div className="h-1 w-full bg-destructive/10 group-hover:bg-destructive/30 transition-colors" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <Card className="lg:col-span-2 border-none shadow-md rounded-2xl">
          <CardHeader>
            <CardTitle>Evolução Mensal</CardTitle>
            <CardDescription>Comparativo de receitas e despesas nos últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chart_data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground) / 0.1)" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickFormatter={(value) => `R$${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <Card className="p-3 shadow-xl border-none bg-background/90 backdrop-blur-sm">
                            <p className="font-bold text-sm mb-2">{label}</p>
                            {payload.map((entry, index) => (
                              <div key={index} className="flex items-center gap-2 text-xs mb-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-muted-foreground">{entry.name}:</span>
                                <span className="font-bold">{formatCurrency(entry.value)}</span>
                              </div>
                            ))}
                          </Card>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ paddingTop: '0', paddingBottom: '20px' }}
                  />
                  <Bar dataKey="income" name="Receitas" fill="#22C55E" radius={[6, 6, 0, 0]} barSize={32} />
                  <Bar dataKey="expenses" name="Despesas" fill="#EF4444" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Categories Chart */}
        <Card className="border-none shadow-md rounded-2xl">
          <CardHeader>
            <CardTitle>Gastos por Categoria</CardTitle>
            <CardDescription>Distribuição percentual mensal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Object.entries(data.expenses_by_category).map(([name, value]) => ({
                      name,
                      value: Math.abs(parseFloat(value))
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {Object.entries(data.expenses_by_category).map(([name], index) => {
                      const category = categories.find(c => c.name === name);
                      return <Cell key={`cell-${index}`} fill={category?.color || 'hsl(var(--muted))'} stroke="none" />;
                    })}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <Card className="p-3 shadow-xl border-none bg-background/90 backdrop-blur-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].payload.fill }} />
                              <span className="font-bold text-sm">{payload[0].name}</span>
                            </div>
                            <p className="text-xs font-bold mt-1">{formatCurrency(payload[0].value)}</p>
                          </Card>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Total</p>
                <p className="text-xl font-bold">{formatCurrency(data.monthly_expenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top 5 Categories */}
        <Card className="border-none shadow-md rounded-2xl">
          <CardHeader>
            <CardTitle>Top 5 Despesas</CardTitle>
            <CardDescription>Categorias com maior volume financeiro</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(data.expenses_by_category)
              .sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]))
              .slice(0, 5)
              .map(([name, value], index) => {
                const category = categories.find(c => c.name === name);
                const percentage = (parseFloat(value) / parseFloat(data.monthly_expenses)) * 100;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-secondary text-base border" style={{ borderColor: `${category?.color}40` }}>
                          {category?.icon || '💰'}
                        </div>
                        <span className="font-semibold text-sm">{name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{formatCurrency(value)}</p>
                        <p className="text-[10px] text-muted-foreground">{percentage.toFixed(1)}% do total</p>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: category?.color || 'hsl(var(--primary))'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            {Object.keys(data.expenses_by_category).length === 0 && (
              <div className="text-center py-10">
                <p className="text-muted-foreground italic">Nenhuma despesa registrada este mês.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions & Recent Info */}
        <div className="space-y-6">
          <Card className="border-none shadow-md bg-primary text-primary-foreground rounded-2xl overflow-hidden relative">
            <div className="absolute top-[-20px] right-[-20px] w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <CardHeader>
              <CardTitle className="text-xl">O que deseja fazer agora?</CardTitle>
              <CardDescription className="text-primary-foreground/70">Ações rápidas para agilizar sua gestão</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => setIsModalOpen(true)}
                className="bg-white text-primary hover:bg-white/90 rounded-xl h-20 flex-col gap-2 font-bold transition-all hover:translate-y-[-2px]"
              >
                <Plus size={24} />
                Transação
              </Button>
              <Button
                onClick={() => navigate('/transactions')}
                variant="secondary"
                className="bg-primary-foreground/10 text-white hover:bg-primary-foreground/20 border-none rounded-xl h-20 flex-col gap-2 font-bold transition-all hover:translate-y-[-2px]"
              >
                <ArrowRight size={24} />
                Ver Extrato
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md rounded-2xl">
            <CardHeader>
              <CardTitle>Resumo de Saúde</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Comprometimento de Renda</span>
                  <Badge variant={ (data.monthly_expenses / data.monthly_income) > 0.7 ? "destructive" : "secondary"}>
                    {data.monthly_income > 0 ? ((data.monthly_expenses / data.monthly_income) * 100).toFixed(1) : 0}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Economia do Mês</span>
                  <span className="font-bold text-success">
                    {formatCurrency(Math.max(0, data.monthly_income - data.monthly_expenses))}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">Variação Patrimonial</span>
                  <VariationBadge value={data.balance_variation} type="balance" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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
