import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { usePrivacy } from '@/context/PrivacyContext';
import PrivateValue from '@/components/ui/PrivateValue';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

const SpendingPaceCard = ({ data, loading, year, month }) => {
  const { isPrivate } = usePrivacy();

  if (loading || !data) {
    return (
      <Card className="border-none shadow-md rounded-2xl animate-pulse">
        <div className="h-[400px] w-full bg-secondary/10 p-8" />
      </Card>
    );
  }

  const { daily_data, previous_month_total } = data;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();
  const isCurrentMonth = year === currentYear && month === currentMonth;

  const daysInMonth = new Date(year, month, 0).getDate();

  const chartData = daily_data.map(d => {
    const entry = { day: d.day };

    // Este mês line
    if (!isCurrentMonth || d.day <= currentDay) {
      entry.actual = parseFloat(d.cumulative);
    }

    // Ritmo ideal line (only if previous_month_total > 0)
    if (previous_month_total > 0) {
      entry.ideal = (parseFloat(previous_month_total) / daysInMonth) * d.day;
    }

    return entry;
  });

  const lastActual = parseFloat(daily_data.find(d => d.day === (isCurrentMonth ? currentDay : daysInMonth))?.cumulative || 0);

  // Projection logic
  let projection = null;
  let paceStatus = null; // 'ABOVE', 'BELOW', 'STABLE'

  if (isCurrentMonth && currentDay > 0) {
    projection = (lastActual / currentDay) * daysInMonth;

    const idealPaceToday = (parseFloat(previous_month_total) / daysInMonth) * currentDay;
    if (previous_month_total > 0) {
      const diff = (lastActual / idealPaceToday) - 1;
      if (diff > 0.05) paceStatus = 'ABOVE';
      else if (diff < -0.05) paceStatus = 'BELOW';
      else paceStatus = 'STABLE';
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Card className="border-none shadow-md rounded-2xl h-full">
      <CardHeader className="p-8 pb-0 flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <CardTitle className="text-xl">Ritmo de Gastos</CardTitle>
          <CardDescription>Acompanhamento diário comparado ao mês anterior</CardDescription>
        </div>
        {projection !== null && (
          <div className="md:text-right">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Projeção p/ o mês</p>
            <p className="text-xl font-bold">
              <PrivateValue value={formatCurrency(projection)} />
            </p>
            {paceStatus && (
              <div className="mt-1 flex md:justify-end">
                <Badge
                  variant="outline"
                  className={cn(
                    "font-bold border-none",
                    paceStatus === 'ABOVE' ? "bg-destructive/10 text-destructive" :
                    paceStatus === 'BELOW' ? "bg-success/10 text-success" :
                    "bg-muted text-muted-foreground"
                  )}
                >
                  {paceStatus === 'ABOVE' ? <TrendingUp className="w-3 h-3 mr-1" /> :
                   paceStatus === 'BELOW' ? <TrendingDown className="w-3 h-3 mr-1" /> :
                   <Minus className="w-3 h-3 mr-1" />}
                  {paceStatus === 'ABOVE' ? 'Acima do ritmo' :
                   paceStatus === 'BELOW' ? 'Abaixo do ritmo' :
                   'No ritmo'}
                </Badge>
              </div>
            )}
          </div>
        )}
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
              <Tooltip
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
              />
              {previous_month_total > 0 && (
                <Line
                  type="monotone"
                  dataKey="ideal"
                  name="Ritmo ideal"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default SpendingPaceCard;
