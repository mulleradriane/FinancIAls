import React, { useState, useEffect, useMemo } from 'react';
import api from '@/api/api';
import analyticsApi from '@/api/analyticsApi';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Line, ComposedChart
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  TrendingUp, TrendingDown, PieChartIcon, BarChart3,
  ArrowUpRight, ArrowDownRight, ChevronRight, Calculator, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import PrivateValue from '@/components/ui/PrivateValue';
import { usePrivacy } from '@/context/PrivacyContext';
import SankeyDiagram from '@/components/reports/SankeyDiagram';

const Relatorios = () => {
  const { isPrivate } = usePrivacy();
  const today = new Date();

  // States
  const [activeTab, setActiveTab] = useState('mensal');
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [quarter, setQuarter] = useState(Math.ceil((today.getMonth() + 1) / 3));

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState(null);
  const [periodSummary, setPeriodSummary] = useState(null);

  // Projection States
  const [projectionMonths, setProjectionMonths] = useState(6);
  const [projectionData, setProjectionData] = useState(null);
  const [projectionLoading, setProjectionLoading] = useState(false);

  // Constants
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const COLORS = ['#2563EB', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6'];

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch categories if not already loaded
      if (categories.length === 0) {
        const categoriesRes = await api.get('/categories/');
        setCategories(categoriesRes.data);
      }

      // 2. Fetch Tab Specific Data
      if (activeTab === 'mensal') {
        const [summaryRes, periodRes] = await Promise.all([
          api.get('/summary/month', { params: { year, month } }),
          analyticsApi.getPeriodSummary(year, month, year, month)
        ]);
        setSummary(summaryRes.data);
        setPeriodSummary(periodRes.data);
      }
      else if (activeTab === 'trimestral') {
        const startMonth = (quarter - 1) * 3 + 1;
        const endMonth = startMonth + 2;
        const periodRes = await analyticsApi.getPeriodSummary(year, startMonth, year, endMonth);
        setPeriodSummary(periodRes.data);
      }
      else if (activeTab === 'anual') {
        const periodRes = await analyticsApi.getPeriodSummary(year, 1, year, 12);
        setPeriodSummary(periodRes.data);
      }

    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Erro ao carregar dados do relatório.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, month, year, quarter]);

  useEffect(() => {
    const fetchProjection = async () => {
      if (activeTab !== 'projecao') return;

      setProjectionLoading(true);
      try {
        const res = await analyticsApi.getProjection(projectionMonths);
        setProjectionData(res.data);
      } catch (error) {
        console.error('Error fetching projection:', error);
        toast.error('Erro ao carregar projeção financeira');
      } finally {
        setProjectionLoading(false);
      }
    };

    fetchProjection();
  }, [activeTab, projectionMonths]);

  // Dados para o gráfico de pizza - com tratamento seguro
  const chartData = useMemo(() => {
    // Verifica se existe expenses_by_category e se é um objeto
    if (!summary?.expenses_by_category || typeof summary.expenses_by_category !== 'object') {
      return [];
    }
    
    return Object.entries(summary.expenses_by_category)
      .map(([name, value]) => ({
        name,
        value: Math.abs(parseFloat(value || 0))
      }))
      .filter(item => item.value > 0); // Remove categorias com valor zero
  }, [summary]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(date);
  };

  const SummaryCard = ({ title, value, variant = 'neutral', isPercentage = false }) => {
    const variants = {
      success: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 font-bold',
      danger: 'bg-red-50 dark:bg-red-950/20 text-red-500 font-bold',
      neutral: 'bg-secondary/30 text-foreground font-bold',
    };

    return (
      <Card className="border-none shadow-md overflow-hidden">
        <CardContent className={cn("p-6", variants[variant])}>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-70">{title}</p>
          <h3 className="text-2xl font-black mt-1">
            <PrivateValue value={isPercentage ? `${(value || 0).toFixed(1)}%` : formatCurrency(value || 0)} />
          </h3>
        </CardContent>
      </Card>
    );
  };

  const TopCategoriesList = ({ items = [], limit = 5 }) => {
    if (loading) return (
      <div className="space-y-4">
        {[...Array(limit)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
      </div>
    );

    return (
      <div className="space-y-4">
        {items.slice(0, limit).map((cat, i) => {
          const diff = cat.total - cat.previous_total;
          const diffPerc = cat.previous_total > 0 ? (diff / cat.previous_total) * 100 : 0;

          return (
            <div key={i} className="p-4 rounded-2xl bg-secondary/20 hover:bg-secondary/30 transition-all group">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg border"
                    style={{ backgroundColor: `${cat.category_color}15`, borderColor: `${cat.category_color}30` }}
                  >
                    {cat.category_icon || '💰'}
                  </div>
                  <div>
                    <p className="font-bold text-sm leading-tight">{cat.category_name}</p>
                    <p className="text-xs text-muted-foreground font-medium">
                      {cat.percentage.toFixed(1)}% do total
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-sm">
                    <PrivateValue value={formatCurrency(cat.total)} />
                  </p>
                  {cat.previous_total > 0 && (
                    <div className={cn(
                      "flex items-center justify-end gap-0.5 text-[10px] font-bold uppercase",
                      diff > 0 ? "text-red-500" : "text-emerald-500"
                    )}>
                      {diff > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {Math.abs(diffPerc).toFixed(0)}%
                    </div>
                  )}
                </div>
              </div>
              <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-1000"
                  style={{
                    width: `${cat.percentage}%`,
                    backgroundColor: cat.category_color || '#2563eb'
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground mt-1">Análise detalhada do seu desempenho financeiro.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
          <TabsList className="grid grid-cols-4 w-full md:w-[450px] bg-secondary/30 rounded-xl p-1">
            <TabsTrigger value="mensal" className="rounded-lg font-bold data-[state=active]:bg-background shadow-sm">Mensal</TabsTrigger>
            <TabsTrigger value="trimestral" className="rounded-lg font-bold data-[state=active]:bg-background shadow-sm">Trimestral</TabsTrigger>
            <TabsTrigger value="anual" className="rounded-lg font-bold data-[state=active]:bg-background shadow-sm">Anual</TabsTrigger>
            <TabsTrigger value="projecao" className="rounded-lg font-bold data-[state=active]:bg-background shadow-sm">Projeção</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab !== 'projecao' && (
      <Card className="border-none shadow-md rounded-2xl bg-secondary/10 overflow-hidden">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase text-muted-foreground ml-2">Período:</span>
            {activeTab === 'mensal' && (
              <Select value={month.toString()} onValueChange={(val) => setMonth(parseInt(val))}>
                <SelectTrigger className="w-[140px] bg-background border-none rounded-xl h-9 text-sm font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((name, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {activeTab === 'trimestral' && (
              <Select value={quarter.toString()} onValueChange={(val) => setQuarter(parseInt(val))}>
                <SelectTrigger className="w-[140px] bg-background border-none rounded-xl h-9 text-sm font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1º Trimestre</SelectItem>
                  <SelectItem value="2">2º Trimestre</SelectItem>
                  <SelectItem value="3">3º Trimestre</SelectItem>
                  <SelectItem value="4">4º Trimestre</SelectItem>
                </SelectContent>
              </Select>
            )}

            <Select value={year.toString()} onValueChange={(val) => setYear(parseInt(val))}>
              <SelectTrigger className="w-[100px] bg-background border-none rounded-xl h-9 text-sm font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      )}

      {/* SankeyDiagram is hidden for now */}
      {/*
      {!loading && activeTab === 'mensal' && sankeyData && (
        <div className="w-full">
          <SankeyDiagram data={sankeyData} />
        </div>
      )}
      */}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
      ) : (
        <Tabs value={activeTab} className="w-full space-y-8">
          <TabsContent value="mensal" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <SummaryCard title="Receitas" value={periodSummary?.totals.total_income} variant="success" />
              <SummaryCard title="Despesas" value={periodSummary?.totals.total_expense} variant="danger" />
              <SummaryCard
                title="Saldo Líquido"
                value={periodSummary?.totals.net_result}
                variant={(periodSummary?.totals.net_result || 0) >= 0 ? 'success' : 'danger'}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="border-none shadow-md rounded-3xl lg:col-span-1">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-black">Top Categorias</CardTitle>
                      <CardDescription>Onde você mais gastou</CardDescription>
                    </div>
                    <div className="p-2 bg-secondary/30 rounded-xl">
                      <PieChartIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <TopCategoriesList items={periodSummary?.top_categories} limit={5} />
                </CardContent>
              </Card>

              <Card className="border-none shadow-md rounded-3xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-black">Maiores Saídas</CardTitle>
                    <CardDescription>Transações individuais</CardDescription>
                  </div>
                  <div className="p-2 bg-red-500/10 rounded-xl">
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {summary?.top_transactions && summary.top_transactions.length > 0 ? (
                    summary.top_transactions.map((t, i) => {
                      const category = categories.find(c => c.name === t.category_name);
                      return (
                        <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-secondary/20 hover:bg-secondary/30 transition-all">
                          <div className="flex items-center gap-4">
                            <div
                              className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl border"
                              style={{ backgroundColor: `${category?.color}15`, borderColor: `${category?.color}30` }}
                            >
                              {category?.icon || '💰'}
                            </div>
                            <div>
                              <p className="font-bold text-sm leading-tight">{t.description}</p>
                              <Badge variant="outline" className="text-[10px] font-black uppercase h-5 px-2 mt-1 border-secondary/50">
                                {t.category_name}
                              </Badge>
                            </div>
                          </div>
                          <p className="font-black text-red-500">
                            <PrivateValue value={formatCurrency(t.amount)} />
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-20 text-muted-foreground italic">
                      Nenhum gasto registrado.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-none shadow-md rounded-3xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-black">Distribuição</CardTitle>
                    <CardDescription>Visão geral dos gastos</CardDescription>
                  </div>
                  <div className="p-2 bg-primary/10 rounded-xl">
                    <BarChart3 className="h-5 w-5 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px] w-full relative pt-4">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={90}
                            paddingAngle={8}
                            dataKey="value"
                          >
                            {chartData.map((entry, index) => {
                              const category = categories.find(c => c.name === entry.name);
                              return <Cell key={`cell-${index}`} fill={category?.color || COLORS[index % COLORS.length]} stroke="none" />;
                            })}
                          </Pie>
                          <Legend verticalAlign="bottom" height={36} />
                          <RechartsTooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <Card className="p-4 shadow-2xl border-none bg-background/95 backdrop-blur-md rounded-2xl">
                                    <div className="flex items-center gap-2 mb-1">
                                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: payload[0].payload.fill }} />
                                      <span className="font-black text-sm">{payload[0].name}</span>
                                    </div>
                                    <p className="font-black text-lg">
                                      {isPrivate ? '•••••' : formatCurrency(payload[0].value)}
                                    </p>
                                  </Card>
                                );
                              }
                              return null;
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                        <BarChart3 size={40} className="opacity-10" />
                        <p className="italic text-sm">Nenhum dado disponível.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trimestral" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <SummaryCard title="Receitas Total" value={periodSummary?.totals.total_income} variant="success" />
              <SummaryCard title="Despesas Total" value={periodSummary?.totals.total_expense} variant="danger" />
              <SummaryCard
                title="Saldo Líquido"
                value={periodSummary?.totals.net_result}
                variant={(periodSummary?.totals.net_result || 0) >= 0 ? 'success' : 'danger'}
              />
              <SummaryCard title="Média Mensal" value={(periodSummary?.totals.total_expense || 0) / 3} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="border-none shadow-md rounded-3xl lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-xl font-black">Fluxo do Trimestre</CardTitle>
                  <CardDescription>Comparativo mensal de receitas e despesas</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={periodSummary?.months}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                        <XAxis
                          dataKey="month_name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fontWeight: 700 }}
                          tickFormatter={(val) => val.substring(0, 3)}
                        />
                        <YAxis hide />
                        <RechartsTooltip
                          cursor={{ fill: '#88888810' }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              return (
                                <Card className="p-4 shadow-2xl border-none bg-background/95 backdrop-blur-md rounded-2xl min-w-[150px]">
                                  <p className="font-black text-xs uppercase text-muted-foreground mb-3">{payload[0].payload.month_name}</p>
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center gap-4">
                                      <span className="text-xs font-bold text-emerald-500">Receita</span>
                                      <span className="font-black text-sm">
                                        <PrivateValue value={formatCurrency(payload[0].value)} />
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center gap-4">
                                      <span className="text-xs font-bold text-red-500">Despesa</span>
                                      <span className="font-black text-sm">
                                        <PrivateValue value={formatCurrency(payload[1].value)} />
                                      </span>
                                    </div>
                                  </div>
                                </Card>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="total_income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                        <Bar dataKey="total_expense" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md rounded-3xl lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-xl font-black">Top Categorias</CardTitle>
                  <CardDescription>Gastos acumulados no trimestre</CardDescription>
                </CardHeader>
                <CardContent>
                  <TopCategoriesList items={periodSummary?.top_categories} limit={5} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="anual" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <SummaryCard title="Receitas Total" value={periodSummary?.totals.total_income} variant="success" />
              <SummaryCard title="Despesas Total" value={periodSummary?.totals.total_expense} variant="danger" />
              <SummaryCard
                title="Saldo Líquido"
                value={periodSummary?.totals.net_result}
                variant={(periodSummary?.totals.net_result || 0) >= 0 ? 'success' : 'danger'}
              />
              <SummaryCard title="Média Poupança" value={(periodSummary?.totals.avg_savings_rate || 0)} isPercentage={true} variant={(periodSummary?.totals.avg_savings_rate || 0) >= 0 ? 'success' : 'danger'} />
            </div>

            <Card className="border-none shadow-md rounded-3xl">
              <CardHeader>
                <CardTitle className="text-xl font-black">Evolução Anual</CardTitle>
                <CardDescription>Fluxo de caixa consolidado de {year}</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={periodSummary?.months}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                      <XAxis
                        dataKey="month_name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fontWeight: 700 }}
                        tickFormatter={(val) => val.substring(0, 3)}
                      />
                      <YAxis hide />
                      <RechartsTooltip
                        cursor={{ fill: '#88888810' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <Card className="p-4 shadow-2xl border-none bg-background/95 backdrop-blur-md rounded-2xl min-w-[150px]">
                                <p className="font-black text-xs uppercase text-muted-foreground mb-3">{payload[0].payload.month_name}</p>
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center gap-4">
                                    <span className="text-xs font-bold text-emerald-500">Receita</span>
                                    <span className="font-black text-sm">
                                      <PrivateValue value={formatCurrency(payload[0].value)} />
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center gap-4">
                                    <span className="text-xs font-bold text-red-500">Despesa</span>
                                    <span className="font-black text-sm">
                                      <PrivateValue value={formatCurrency(payload[1].value)} />
                                    </span>
                                  </div>
                                </div>
                              </Card>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="total_income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar dataKey="total_expense" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md rounded-3xl">
              <CardHeader>
                <CardTitle className="text-xl font-black">Maiores Categorias do Ano</CardTitle>
                <CardDescription>Distribuição acumulada de gastos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                  <TopCategoriesList items={periodSummary?.top_categories} limit={8} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="projecao" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-xl font-black">Projeção de Saldo</h2>
              <div className="flex bg-secondary/30 p-1 rounded-xl h-11">
                {[3, 6, 12].map((m) => (
                  <button
                    key={m}
                    onClick={() => setProjectionMonths(m)}
                    className={`px-6 rounded-lg font-bold text-sm transition-all ${
                      projectionMonths === m
                        ? 'bg-background shadow-sm text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {m}M
                  </button>
                ))}
              </div>
            </div>

            {projectionLoading && !projectionData ? (
              <div className="space-y-6">
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-[320px] w-full rounded-2xl" />
                <Skeleton className="h-64 w-full rounded-2xl" />
              </div>
            ) : (
              <>
                {!projectionData?.has_recurring_income && (
                  <Alert className="border-amber-500/50 bg-amber-500/5 rounded-2xl">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <AlertTitle className="text-amber-800 font-bold">Aviso</AlertTitle>
                    <AlertDescription className="text-amber-700/80">
                      ⚠️ Adicione receitas recorrentes para melhorar a precisão
                    </AlertDescription>
                  </Alert>
                )}

                <Card className="border-none shadow-md rounded-3xl overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-lg font-black">Evolução Projetada</CardTitle>
                    <CardDescription>Receitas e Despesas estimadas ({projectionMonths} meses)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[320px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={projectionData?.projections?.map(p => ({
                            name: formatDate(p.month),
                            receita: p.income,
                            despesas: p.recurring_expenses + p.installments + p.variable_expenses,
                            saldo: p.projected_balance
                          }))}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                          <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fontWeight: 700 }}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fontWeight: 700 }}
                            tickFormatter={(value) => isPrivate ? '•••' : `R$${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                          />
                          <RechartsTooltip
                            cursor={{ fill: '#88888810' }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <Card className="p-4 shadow-2xl border-none bg-background/95 backdrop-blur-md rounded-2xl min-w-[180px]">
                                    <p className="font-black text-xs uppercase text-muted-foreground mb-3">{payload[0].payload.name}</p>
                                    <div className="space-y-2">
                                      <div className="flex justify-between items-center gap-4">
                                        <span className="text-xs font-bold text-emerald-500">Receita</span>
                                        <span className="font-black text-sm">
                                          <PrivateValue value={formatCurrency(payload[0].value)} />
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center gap-4">
                                        <span className="text-xs font-bold text-red-500">Despesas</span>
                                        <span className="font-black text-sm">
                                          <PrivateValue value={formatCurrency(payload[1].value)} />
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center gap-4 pt-2 border-t">
                                        <span className="text-xs font-bold text-blue-500">Saldo</span>
                                        <span className="font-black text-sm">
                                          <PrivateValue value={formatCurrency(payload[2].value)} />
                                        </span>
                                      </div>
                                    </div>
                                  </Card>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend verticalAlign="top" align="right" />
                          <Bar dataKey="receita" name="Receita" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                          <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={30} />
                          <Line
                            type="monotone"
                            dataKey="saldo"
                            name="Saldo Projetado"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md rounded-3xl overflow-hidden">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs uppercase bg-secondary/30 font-black">
                          <tr>
                            <th className="px-6 py-4">Mês</th>
                            <th className="px-6 py-4">Receita</th>
                            <th className="px-6 py-4">Despesas</th>
                            <th className="px-6 py-4">Saldo Projetado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary/20">
                          {projectionData?.projections?.map((p, idx) => (
                            <tr key={idx} className="hover:bg-secondary/10 transition-colors">
                              <td className="px-6 py-4 font-bold uppercase">{formatDate(p.month)}</td>
                              <td className="px-6 py-4 font-black text-emerald-500">
                                <PrivateValue value={formatCurrency(p.income)} />
                              </td>
                              <td className="px-6 py-4 font-black text-red-500">
                                <PrivateValue value={formatCurrency(p.recurring_expenses + p.installments + p.variable_expenses)} />
                              </td>
                              <td className={cn(
                                "px-6 py-4 font-black",
                                p.projected_balance >= 0 ? "text-emerald-500" : "text-red-500"
                              )}>
                                <PrivateValue value={formatCurrency(p.projected_balance)} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Relatorios;