import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { usePrivacy } from '@/context/PrivacyContext';
import PrivateValue from '@/components/ui/PrivateValue';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SpendingPaceCard = ({ data, loading, year, month }) => {
  const { isPrivate } = usePrivacy();

  if (loading || !data) {
    return (
      <Card className="border-none shadow-md rounded-2xl animate-pulse">
        <div className="h-[400px] w-full bg-secondary/10 p-8" />
      </Card>
    );
  }

  const { current_month, previous_month } = data;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;
  const currentDay = now.getDate();
  const isCurrentMonth = year === currentYear && month === currentMonthNum;

  const totalDays = Math.max(current_month.length, previous_month.length);
  const chartData = [];

  for (let i = 1; i <= totalDays; i++) {
    const entry = { day: i };
    const curr = current_month.find(d => d.day === i);
    const prev = previous_month.find(d => d.day === i);

    if (curr && (!isCurrentMonth || i <= currentDay)) {
      entry.actual = parseFloat(curr.cumulative);
    }
    if (prev) {
      entry.previous = parseFloat(prev.cumulative);
    }
    chartData.push(entry);
  }

  const lastActual = parseFloat(current_month.find(d => d.day === (isCurrentMonth ? currentDay : current_month.length))?.cumulative || 0);
  const prevMonthSameDay = parseFloat(previous_month.find(d => d.day === (isCurrentMonth ? currentDay : current_month.length))?.cumulative || 0);

  const diff = lastActual - prevMonthSameDay;
  const paceStatus = diff > 0 ? 'ABOVE' : 'BELOW';

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <TooltipProvider>
      <Card className="border-none shadow-md rounded-2xl h-full">
        <CardHeader className="p-8 pb-0 flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">Ritmo de Gastos</CardTitle>
              <UiTooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <button 
                    type="button"
                    className="inline-flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                    aria-label="Informações sobre ritmo de gastos"
                  >
                    <Info className="h-[14px] w-[14px] text-muted-foreground" />
                  </button>
                </TooltipTrigger>
                <TooltipContent 
                  side="top" 
                  align="center"
                  className="max-w-[250px] text-center bg-popover text-popover-foreground shadow-lg"
                >
                  <p className="text-sm">
                    Compara o ritmo atual dos seus gastos com o mês passado no mesmo período. 
                    Ajuda a identificar se você está gastando mais ou menos do que o esperado para este ponto do mês.
                  </p>
                </TooltipContent>
              </UiTooltip>
            </div>
            <CardDescription>Acompanhamento diário comparado ao mês anterior</CardDescription>
          </div>
          <div className="md:text-right">
            <div className="mt-1 flex md:justify-end">
              <Badge
                variant="outline"
                className={cn(
                  "font-bold border-none text-sm px-3 py-1",
                  paceStatus === 'ABOVE' ? "bg-destructive/10 text-destructive" :
                  paceStatus === 'BELOW' ? "bg-success/10 text-success" :
                  "bg-muted text-muted-foreground"
                )}
              >
                {paceStatus === 'ABOVE' ? <TrendingUp className="w-4 h-4 mr-1.5" /> : <TrendingDown className="w-4 h-4 mr-1.5" />}
                <PrivateValue value={`${formatCurrency(Math.abs(diff))} ${paceStatus === 'ABOVE' ? 'acima' : 'abaixo'}`} />
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground) / 0.1)" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickFormatter={(value) => isPrivate ? '•••' : `R$${value >= 1000 ? (value/1000).toFixed(1) + 'k' : value}`}
                />
                <RechartsTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <Card className="p-3 shadow-xl border-none bg-background/90 backdrop-blur-sm">
                          <p className="font-bold text-sm mb-2 uppercase tracking-wider">Dia {label}</p>
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
                  wrapperStyle={{ paddingTop: '0', paddingBottom: '20px' }}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Este mês"
                  stroke="#2563EB"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="previous"
                  name="Mês passado"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

export default SpendingPaceCard;