import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  AlertCircle,
  Calendar,
  ChevronRight,
  Info,
  ArrowUpCircle,
  ArrowDownCircle,
  Package,
  Tv,
  Wallet
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@/components/ui/tabs';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import PrivateValue from '@/components/ui/PrivateValue';
import { usePrivacy } from '@/context/PrivacyContext';
import analyticsApi from '@/api/analyticsApi';
import { toast } from 'sonner';

const Projection = () => {
  const { isPrivate } = usePrivacy();
  const [months, setMonths] = useState(6);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProjection = async (m) => {
    try {
      setLoading(true);
      const res = await analyticsApi.getProjection(m);
      setData(res.data);
    } catch (error) {
      console.error('Error fetching projection:', error);
      toast.error('Erro ao carregar projeção financeira');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjection(months);
  }, [months]);

  const formatCurrency = (val) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(date);
  };

  const formatDateFull = (dateStr) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
  };

  if (loading && !data) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-20 bg-secondary/20 rounded-2xl" />
        <div className="h-[400px] bg-secondary/10 rounded-2xl" />
        <div className="h-[300px] bg-secondary/10 rounded-2xl" />
      </div>
    );
  }

  const chartData = data?.projections.map(p => ({
    ...p,
    name: formatDate(p.month),
    // For stacked area, we might want to separate types.
    // In our case we have Income, Recurring, Installments, Variable.
    // We'll show them as positive values for visualization in the area chart if they are stacked.
    // But usually projection shows balance.
  })) || [];

  return (
    <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="text-primary" />
            Projeção de Saldo
          </h1>
          <p className="text-muted-foreground mt-1">Visualize a evolução estimada do seu patrimônio líquido.</p>
        </div>

        <div className="flex bg-secondary/30 p-1 rounded-xl h-11">
          {[3, 6, 12].map((m) => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className={`px-6 rounded-lg font-bold text-sm transition-all ${
                months === m
                  ? 'bg-background shadow-sm text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {m}M
            </button>
          ))}
        </div>
      </div>

      {/* Warning Banner */}
      {!data?.has_recurring_income && (
        <Alert variant="warning" className="border-amber-500/50 bg-amber-500/5 rounded-2xl">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <AlertTitle className="text-amber-800 font-bold">Nenhuma receita configurada</AlertTitle>
          <AlertDescription className="text-amber-700/80 flex items-center justify-between">
            Adicione suas fontes de receita para melhorar a precisão da projeção.
            <Link to="/recorrentes" className="flex items-center gap-1 font-bold text-amber-800 hover:underline">
              Configurar Receitas <ChevronRight size={16} />
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Chart Card */}
      <Card className="border-none shadow-md rounded-2xl overflow-hidden">
        <CardHeader className="p-8 pb-0">
          <CardTitle className="text-xl">Evolução Projetada</CardTitle>
          <CardDescription>Receitas e Despesas estimadas para os próximos {months} meses</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground) / 0.1)" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickFormatter={formatDate}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickFormatter={(value) => isPrivate ? '•••' : `R$${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                />
                <Tooltip
                  cursor={{ stroke: 'hsl(var(--muted-foreground) / 0.2)', strokeWidth: 2 }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <Card className="p-4 shadow-xl border-none bg-background/95 backdrop-blur-md min-w-[200px]">
                          <p className="font-bold text-sm mb-3 uppercase tracking-wider border-bottom pb-2 border-muted">
                            {formatDateFull(label)}
                          </p>
                          <div className="space-y-2">
                            {payload.map((entry, index) => (
                              <div key={index} className="flex items-center justify-between gap-4 text-xs">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                  <span className="text-muted-foreground">{entry.name}:</span>
                                </div>
                                <span className="font-bold">{isPrivate ? '•••••' : formatCurrency(entry.value)}</span>
                              </div>
                            ))}
                          </div>
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
                  wrapperStyle={{ paddingTop: '0', paddingBottom: '30px' }}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Receitas"
                  stroke="#22C55E"
                  fill="#22C55E"
                  fillOpacity={0.1}
                  stackId="1"
                />
                <Area
                  type="monotone"
                  dataKey="recurring_expenses"
                  name="Recorrências"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.1}
                  stackId="2"
                />
                <Area
                  type="monotone"
                  dataKey="installments"
                  name="Parcelamentos"
                  stroke="#F59E0B"
                  fill="#F59E0B"
                  fillOpacity={0.1}
                  stackId="2"
                />
                <Area
                  type="monotone"
                  dataKey="variable_expenses"
                  name="Variável (Média)"
                  stroke="#94A3B8"
                  fill="#94A3B8"
                  fillOpacity={0.1}
                  stackId="2"
                />
                <Line
                  type="monotone"
                  dataKey="projected_balance"
                  name="Saldo Projetado"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "#fff" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detalhamento Section */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold px-1">Detalhamento do Mês</h2>

        <Tabs defaultValue="month-0" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="bg-secondary/30 p-1 rounded-xl h-11 overflow-x-auto justify-start flex-nowrap max-w-full no-scrollbar">
              {data?.projections.map((p, idx) => (
                <TabsTrigger
                  key={idx}
                  value={`month-${idx}`}
                  className="rounded-lg px-6 font-bold text-sm data-[state=active]:bg-background transition-all whitespace-nowrap"
                >
                  {formatDate(p.month)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {data?.projections.map((p, idx) => (
            <TabsContent key={idx} value={`month-${idx}`} className="space-y-6 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-none shadow-sm bg-primary/5 rounded-2xl">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <Wallet size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Saldo Inicial</p>
                      <h3 className="text-xl font-black"><PrivateValue value={formatCurrency(p.initial_balance)} /></h3>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-green-500/5 rounded-2xl">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-600">
                      <ArrowUpCircle size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Entradas Totais</p>
                      <h3 className="text-xl font-black"><PrivateValue value={formatCurrency(p.income)} /></h3>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-blue-500/5 rounded-2xl">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                      <Wallet size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Saldo Final</p>
                      <h3 className="text-xl font-black"><PrivateValue value={formatCurrency(p.projected_balance)} /></h3>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Receitas Breakdown */}
                <Card className="border-none shadow-sm rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ArrowUpCircle className="text-green-500" size={20} />
                      Receitas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {p.income_items.length > 0 ? p.income_items.map((item, i) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b border-muted last:border-0">
                        <span className="text-sm font-medium">{item.description}</span>
                        <span className="font-bold text-green-600"><PrivateValue value={formatCurrency(item.amount)} /></span>
                      </div>
                    )) : (
                      <div className="flex justify-between items-center py-2 border-b border-muted">
                        <span className="text-sm text-muted-foreground italic">Média de Receitas Históricas</span>
                        <span className="font-bold text-green-600"><PrivateValue value={formatCurrency(p.income)} /></span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recurring Breakdown */}
                <Card className="border-none shadow-sm rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Tv className="text-blue-500" size={20} />
                      Assinaturas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {p.recurring_items.length > 0 ? p.recurring_items.map((item, i) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b border-muted last:border-0">
                        <span className="text-sm font-medium">{item.description}</span>
                        <span className="font-bold text-blue-600"><PrivateValue value={formatCurrency(item.amount)} /></span>
                      </div>
                    )) : (
                      <p className="text-sm text-muted-foreground italic py-2">Nenhuma assinatura para este mês.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Installments Breakdown */}
                <Card className="border-none shadow-sm rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="text-amber-500" size={20} />
                      Parcelamentos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {p.installment_items.length > 0 ? p.installment_items.map((item, i) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b border-muted last:border-0">
                        <span className="text-sm font-medium">{item.description}</span>
                        <span className="font-bold text-amber-600"><PrivateValue value={formatCurrency(item.amount)} /></span>
                      </div>
                    )) : (
                      <p className="text-sm text-muted-foreground italic py-2">Nenhum parcelamento para este mês.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Variable Breakdown */}
                <Card className="border-none shadow-sm rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ArrowDownCircle className="text-slate-500" size={20} />
                      Despesas Variáveis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center py-2">
                      <div className="space-y-1">
                        <span className="text-sm font-medium">Estimativa Variável</span>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Média dos últimos 3 meses</p>
                      </div>
                      <span className="font-bold text-slate-600"><PrivateValue value={formatCurrency(p.variable_expenses)} /></span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default Projection;
