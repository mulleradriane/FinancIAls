import React, { useState, useEffect } from 'react';
import api from '@/api/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Wallet, PieChartIcon, ArrowRight, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import PrivateValue from '@/components/ui/PrivateValue';
import { usePrivacy } from '@/context/PrivacyContext';

const Relatorios = () => {
  const { isPrivate } = usePrivacy();
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summaryRes, categoriesRes] = await Promise.all([
        api.get('/summary/month', { params: { year, month } }),
        api.get('/categories/')
      ]);
      setSummary(summaryRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error fetching reporting data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [year, month]);

  const chartData = summary ? Object.entries(summary.expenses_by_category).map(([name, value]) => ({
    name,
    value: Math.abs(parseFloat(value))
  })) : [];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const COLORS = ['#2563EB', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground mt-1">Análise detalhada do seu desempenho mensal.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={month.toString()} onValueChange={(val) => setMonth(parseInt(val))}>
            <SelectTrigger className="w-[150px] bg-secondary/30 border-none rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthNames.map((name, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year.toString()} onValueChange={(val) => setYear(parseInt(val))}>
            <SelectTrigger className="w-[100px] bg-secondary/30 border-none rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[50vh]">
          <div className="animate-pulse text-muted-foreground font-medium">Processando relatórios...</div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-none shadow-md bg-success/5">
              <CardContent className="p-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Receitas</p>
                <h3 className="text-2xl font-bold text-success mt-1"><PrivateValue value={formatCurrency(summary?.total_income || 0)} /></h3>
              </CardContent>
            </Card>
            <Card className="border-none shadow-md bg-destructive/5">
              <CardContent className="p-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Despesas</p>
                <h3 className="text-2xl font-bold text-destructive mt-1"><PrivateValue value={formatCurrency(summary?.total_expenses || 0)} /></h3>
              </CardContent>
            </Card>
            <Card className="border-none shadow-md bg-primary/5">
              <CardContent className="p-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Investido</p>
                <h3 className="text-2xl font-bold text-primary mt-1"><PrivateValue value={formatCurrency(summary?.total_invested || 0)} /></h3>
              </CardContent>
            </Card>
            <Card className="border-none shadow-md bg-secondary/30">
              <CardContent className="p-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Saldo Líquido</p>
                <h3 className={cn(
                  "text-2xl font-bold mt-1",
                  (summary?.balance || 0) >= 0 ? "text-foreground" : "text-destructive"
                )}>
                  <PrivateValue value={formatCurrency(summary?.balance || 0)} />
                </h3>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-none shadow-md rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                  <CardTitle>Composição de Gastos</CardTitle>
                  <CardDescription>Distribuição por categoria</CardDescription>
                </div>
                <PieChartIcon className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="h-[350px] w-full relative">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {chartData.map((entry, index) => {
                            const category = categories.find(c => c.name === entry.name);
                            return <Cell key={`cell-${index}`} fill={category?.color || COLORS[index % COLORS.length]} stroke="none" />;
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
                                  <p className="text-xs font-bold mt-1">{isPrivate ? '•••••' : formatCurrency(payload[0].value)}</p>
                                </Card>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                      <BarChart3 size={40} className="opacity-20" />
                      <p className="italic">Nenhuma despesa no período.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md rounded-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                  <CardTitle>Maiores Saídas</CardTitle>
                  <CardDescription>Principais transações do mês</CardDescription>
                </div>
                <TrendingDown className="h-5 w-5 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {summary?.top_transactions.map((t, i) => {
                    const category = categories.find(c => c.name === t.category_name);
                    return (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 hover:bg-secondary/30 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-lg border"
                            style={{ backgroundColor: `${category?.color}15`, borderColor: `${category?.color}30` }}
                          >
                            {category?.icon || '💰'}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{t.description}</p>
                            <Badge variant="outline" className="text-[9px] font-bold uppercase h-4 px-1 mt-0.5">
                              {t.category_name}
                            </Badge>
                          </div>
                        </div>
                        <p className="font-black text-destructive"><PrivateValue value={formatCurrency(t.amount)} /></p>
                      </div>
                    );
                  })}
                  {summary?.top_transactions.length === 0 && (
                    <div className="text-center py-20 text-muted-foreground italic">
                      Nenhum gasto relevante identificado.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default Relatorios;
