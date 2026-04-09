import React, { useState, useEffect } from 'react';
import api from '@/api/api';
import analyticsApi from '@/api/analyticsApi';
import {
  ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
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
  TrendingUp, TrendingDown, PieChartIcon,
  Calculator, AlertCircle,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import PrivateValue from '@/components/ui/PrivateValue';
import InfoTooltip from '@/components/ui/InfoTooltip';
import { usePrivacy } from '@/context/PrivacyContext';

// ── Utilitários de nível de módulo ─────────────────────────────────────────────
const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);

const formatDate = (dateStr) =>
  new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(new Date(dateStr));

// ── Componentes auxiliares (fora do pai para evitar remontagem a cada render) ──
const SummaryCard = ({ title, value, variant = 'neutral', isPercentage = false }) => {
  const variants = {
    success: 'bg-success/10 text-success font-bold',
    danger:  'bg-destructive/10 text-destructive font-bold',
    neutral: 'bg-secondary/30 text-foreground font-bold',
  };
  return (
    <Card className="border-none shadow-md overflow-hidden">
      <CardContent className={cn('p-6', variants[variant])}>
        <p className="text-xs font-semibold uppercase tracking-widest opacity-70">{title}</p>
        <h3 className="text-2xl font-black mt-1">
          <PrivateValue value={isPercentage ? `${(value || 0).toFixed(1)}%` : formatCurrency(value || 0)} />
        </h3>
      </CardContent>
    </Card>
  );
};

const TopCategoriesList = ({ items = [], initialLimit = 6, loading = false }) => {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, initialLimit);

  if (loading) return (
    <div className="space-y-3">
      {[...Array(initialLimit)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
    </div>
  );

  if (items.length === 0) return (
    <p className="text-sm text-muted-foreground italic py-4 text-center">Nenhum dado disponível.</p>
  );

  return (
    <div className="space-y-3">
      {visible.map((cat, i) => {
        const diff     = cat.total - cat.previous_total;
        const diffPerc = cat.previous_total > 0 ? (diff / cat.previous_total) * 100 : 0;
        return (
          <div key={i} className="p-3.5 rounded-xl bg-secondary/20 hover:bg-secondary/30 transition-all">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-base border flex-shrink-0"
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
              <div className="text-right flex-shrink-0">
                <p className="font-black text-sm">
                  <PrivateValue value={formatCurrency(cat.total)} />
                </p>
                {cat.previous_total > 0 && (
                  <div className={cn(
                    'flex items-center justify-end gap-0.5 text-[10px] font-bold',
                    diff > 0 ? 'text-red-500' : 'text-emerald-500'
                  )}>
                    {diff > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {Math.abs(diffPerc).toFixed(0)}% vs anterior
                  </div>
                )}
              </div>
            </div>
            <div className="h-1.5 w-full bg-secondary/50 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-700"
                style={{ width: `${cat.percentage}%`, backgroundColor: cat.category_color || '#2563eb' }}
              />
            </div>
          </div>
        );
      })}
      {items.length > initialLimit && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="w-full text-xs font-bold text-muted-foreground hover:text-foreground transition-colors py-2 flex items-center justify-center gap-1"
        >
          {showAll
            ? <><ChevronUp size={14} /> Mostrar menos</>
            : <><ChevronDown size={14} /> Ver mais {items.length - initialLimit} categorias</>
          }
        </button>
      )}
    </div>
  );
};

// ── Página ──────────────────────────────────────────────────────────────────────
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
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);

  // Constants
  const currentYear = today.getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

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
                {yearOptions.map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
      ) : (
        <Tabs value={activeTab} className="w-full space-y-8">
          <TabsContent value="mensal" className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
            {(() => {
              const income  = periodSummary?.totals.total_income  || 0;
              const expense = periodSummary?.totals.total_expense || 0;
              const net     = periodSummary?.totals.net_result    || 0;
              const savingsRate = income > 0 ? (net / income) * 100 : null;
              return (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <SummaryCard title="Receitas" value={income} variant="success" />
                  <SummaryCard title="Despesas" value={expense} variant="danger" />
                  <SummaryCard
                    title="Saldo Líquido"
                    value={net}
                    variant={net >= 0 ? 'success' : 'danger'}
                  />
                  <Card className="border-none shadow-md overflow-hidden">
                    <CardContent className={cn('p-6', savingsRate !== null && savingsRate >= 0 ? 'bg-success/10 text-success font-bold' : 'bg-secondary/30 text-foreground font-bold')}>
                      <p className="text-xs font-semibold uppercase tracking-widest opacity-70">Taxa de Poupança</p>
                      <h3 className="text-2xl font-black mt-1">
                        {savingsRate !== null ? `${savingsRate.toFixed(1)}%` : '—'}
                      </h3>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              <Card className="border-none shadow-md rounded-3xl lg:col-span-2">
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
                <CardContent className="pt-2">
                  <TopCategoriesList items={periodSummary?.top_categories ?? []} loading={loading} />
                </CardContent>
              </Card>

              <Card className="border-none shadow-md rounded-3xl lg:col-span-3">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-black">Maiores Saídas</CardTitle>
                    <CardDescription>Transações individuais do mês</CardDescription>
                  </div>
                  <div className="p-2 bg-red-500/10 rounded-xl">
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  </div>
                </CardHeader>
                <CardContent className="pt-2 space-y-3">
                  {summary?.top_transactions && summary.top_transactions.length > 0 ? (
                    summary.top_transactions.map((t, i) => {
                      const category = categories.find(c => c.name === t.category_name);
                      return (
                        <div key={i} className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/20 hover:bg-secondary/30 transition-all gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg border flex-shrink-0"
                              style={{ backgroundColor: `${category?.color}15`, borderColor: `${category?.color}30` }}
                            >
                              {category?.icon || '💰'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm leading-tight truncate">{t.description}</p>
                              <Badge variant="outline" className="text-[10px] font-bold uppercase h-5 px-2 mt-1 border-secondary/50">
                                {t.category_name}
                              </Badge>
                            </div>
                          </div>
                          <p className="font-black text-red-500 flex-shrink-0">
                            <PrivateValue value={formatCurrency(t.amount)} />
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-muted-foreground italic text-sm">
                      Nenhum gasto registrado.
                    </div>
                  )}
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
                  <TopCategoriesList items={periodSummary?.top_categories ?? []} loading={loading} />
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
                <CardDescription>Distribuição acumulada de gastos em {year}</CardDescription>
              </CardHeader>
              <CardContent>
                <TopCategoriesList items={periodSummary?.top_categories ?? []} initialLimit={8} loading={loading} />
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

                <div className="border border-primary/20 bg-primary/5 rounded-2xl p-4">
                  <button
                    onClick={() => setIsInfoExpanded(!isInfoExpanded)}
                    className="flex items-center justify-between w-full text-foreground font-bold"
                  >
                    <span className="flex items-center gap-2 text-primary">
                      <Calculator size={16} /> Como funciona esta projeção?
                    </span>
                    {isInfoExpanded ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
                  </button>

                  {isInfoExpanded && (
                    <div className="mt-4 text-sm text-muted-foreground space-y-2 animate-in fade-in slide-in-from-top-2">
                      <p>Esta projeção estima sua evolução financeira com base em:</p>
                      <ul className="space-y-1 ml-1">
                        <li>• <strong className="text-foreground">Receita:</strong> suas recorrências de receita cadastradas ou, se não houver, a média dos últimos 3 meses de receitas reais.</li>
                        <li>• <strong className="text-foreground">Despesas fixas:</strong> assinaturas e parcelamentos ativos cadastrados em Recorrentes.</li>
                        <li>• <strong className="text-foreground">Despesas variáveis:</strong> média dos seus gastos variáveis dos últimos 3 meses.</li>
                        <li>• <strong className="text-foreground">Saldo inicial:</strong> saldo atual consolidado de todas as suas contas.</li>
                      </ul>
                      <p className="pt-2 font-medium text-foreground/70">Os valores são estimativas. Quanto mais recorrências você cadastrar, mais precisa será a projeção.</p>
                    </div>
                  )}
                </div>

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
                            receita: parseFloat(p.income) || 0,
                            despesas: (parseFloat(p.recurring_expenses) || 0) +
                                     (parseFloat(p.installments) || 0) +
                                     (parseFloat(p.variable_expenses) || 0),
                            saldo: parseFloat(p.projected_balance) || 0
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
                            <th className="px-6 py-4">
                              <div className="flex items-center gap-1.5">
                                Receita
                                <InfoTooltip content="Receita esperada para o mês. Se você tem receitas recorrentes cadastradas (ex: salário), usa esse valor. Caso contrário, usa a média das receitas dos últimos 3 meses." />
                              </div>
                            </th>
                            <th className="px-6 py-4">
                              <div className="flex items-center gap-1.5">
                                Despesas
                                <InfoTooltip content="Soma das despesas fixas recorrentes + parcelamentos ativos + estimativa de gastos variáveis (média dos últimos 3 meses)." />
                              </div>
                            </th>
                            <th className="px-6 py-4">
                              <div className="flex items-center gap-1.5">
                                Sobra Mensal
                                <InfoTooltip content="Quanto deve sobrar no mês: Receita − Despesas. Valor positivo indica que você vai gastar menos do que recebe naquele mês." />
                              </div>
                            </th>
                            <th className="px-6 py-4">
                              <div className="flex items-center gap-1.5">
                                Saldo Projetado
                                <InfoTooltip content="Saldo acumulado estimado ao final do mês, considerando seu saldo atual mais todas as sobras mensais anteriores." />
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary/20">
                          {projectionData?.projections?.map((p, idx) => {
                            const income = parseFloat(p.income) || 0;
                            const expenses = (parseFloat(p.recurring_expenses) || 0) +
                                            (parseFloat(p.installments) || 0) +
                                            (parseFloat(p.variable_expenses) || 0);
                            const leftover = income - expenses;

                            return (
                              <tr key={idx} className="hover:bg-secondary/10 transition-colors">
                                <td className="px-6 py-4 font-bold uppercase">{formatDate(p.month)}</td>
                                <td className="px-6 py-4 font-black text-emerald-500">
                                  <PrivateValue value={formatCurrency(income)} />
                                </td>
                                <td className="px-6 py-4 font-black text-red-500">
                                  <PrivateValue value={formatCurrency(expenses)} />
                                </td>
                                <td className={cn(
                                  "px-6 py-4 font-black",
                                  leftover >= 0 ? "text-emerald-500" : "text-red-500"
                                )}>
                                  <PrivateValue value={formatCurrency(leftover)} />
                                </td>
                                <td className={cn(
                                  "px-6 py-4 font-black",
                                  (parseFloat(p.projected_balance) || 0) >= 0 ? "text-emerald-500" : "text-red-500"
                                )}>
                                  <PrivateValue value={formatCurrency(parseFloat(p.projected_balance) || 0)} />
                                </td>
                              </tr>
                            );
                          })}
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