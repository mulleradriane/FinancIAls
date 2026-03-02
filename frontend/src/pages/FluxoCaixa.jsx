import React, { useState, useEffect } from 'react';
import api from '@/api/api';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  ArrowUpCircle,
  ArrowDownCircle
} from 'lucide-react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import PrivateValue from '@/components/ui/PrivateValue';
import { usePrivacy } from '@/context/PrivacyContext';

const FluxoCaixa = () => {
  const { isPrivate } = usePrivacy();
  const [cashFlowData, setCashFlowData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(6);

  const fetchCashFlow = async (months) => {
    try {
      setLoading(true);
      const response = await api.get(`/summary/cash-flow-summary?months=${months}`);
      const formattedData = response.data.map(d => ({
        ...d,
        income: parseFloat(d.income),
        expense: parseFloat(d.expense),
        net: parseFloat(d.net)
      }));
      setCashFlowData(formattedData);
    } catch (error) {
      console.error('Error fetching cash flow summary:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashFlow(period);
  }, [period]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatMonthLabel = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    const label = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '');
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const lastMonth = cashFlowData.length > 0 ? cashFlowData[cashFlowData.length - 1] : null;

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fluxo de Caixa</h1>
          <p className="text-muted-foreground mt-1">Histórico real de receitas, despesas e resultado líquido mensal.</p>
        </div>
        <div className="flex bg-secondary/30 p-1 rounded-xl border border-secondary">
          {[3, 6, 12].map((m) => (
            <Button
              key={m}
              variant="ghost"
              size="sm"
              onClick={() => setPeriod(m)}
              className={cn(
                "rounded-lg px-4 font-semibold transition-all",
                period === m
                  ? "bg-background text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m}M
            </Button>
          ))}
        </div>
      </div>

      <Card className="border-none shadow-md rounded-2xl overflow-hidden">
        <CardHeader className="p-8 pb-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Movimentação Mensal</CardTitle>
              <CardDescription>Comparativo de entradas e saídas no período selecionado</CardDescription>
            </div>
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <BarChart3 size={24} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          {loading ? (
            <div className="h-[400px] w-full flex items-center justify-center">
              <Skeleton className="h-full w-full rounded-xl" />
            </div>
          ) : cashFlowData.length > 0 ? (
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={cashFlowData.map(d => ({ ...d, monthLabel: formatMonthLabel(d.month) }))}
                  margin={{ top: 20, right: 20, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground) / 0.1)" />
                  <XAxis
                    dataKey="monthLabel"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickFormatter={(value) => isPrivate ? '•••' : `R$${Math.abs(value) >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                  />
                  <RechartsTooltip
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
                                <span className="font-bold">{isPrivate ? '•••••' : formatCurrency(entry.value)}</span>
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
                    wrapperStyle={{ paddingTop: '0', paddingBottom: '30px' }}
                  />
                  <Bar dataKey="income" name="Receitas" fill="#22C55E" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="expense" name="Despesas" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={20} />
                  <Line
                    type="monotone"
                    dataKey="net"
                    name="Resultado"
                    stroke="#2563EB"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#2563EB', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground italic">
              Nenhum dado disponível para o período.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary of Last Month */}
      {lastMonth && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm bg-success/[0.03] border-success/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-success/10 rounded-xl text-success">
                  <ArrowUpCircle size={24} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Receitas do Mês</p>
                  <h3 className="text-2xl font-bold text-success mt-0.5"><PrivateValue value={formatCurrency(lastMonth.income)} /></h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-destructive/[0.03] border-destructive/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-destructive/10 rounded-xl text-destructive">
                  <ArrowDownCircle size={24} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Despesas do Mês</p>
                  <h3 className="text-2xl font-bold text-destructive mt-0.5"><PrivateValue value={formatCurrency(lastMonth.expense)} /></h3>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={cn(
            "border-none shadow-sm",
            lastMonth.net >= 0 ? "bg-success/[0.03] border-success/10" : "bg-destructive/[0.03] border-destructive/10"
          )}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-3 rounded-xl",
                  lastMonth.net >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                )}>
                  {lastMonth.net >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                </div>
                <div>
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Resultado Líquido</p>
                  <h3 className={cn(
                    "text-2xl font-bold mt-0.5",
                    lastMonth.net >= 0 ? "text-success" : "text-destructive"
                  )}>
                    <PrivateValue value={formatCurrency(lastMonth.net)} />
                  </h3>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default FluxoCaixa;