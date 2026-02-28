import React from 'react';
import {
  ComposedChart,
  Bar,
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
import { Info } from 'lucide-react';
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const EvolutionChart = ({ data, loading }) => {
  const { isPrivate } = usePrivacy();
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' }).format(date);
  };

  if (loading) {
    return (
      <Card className="border-none shadow-md rounded-2xl animate-pulse">
        <div className="h-[450px] w-full bg-secondary/10 p-8" />
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-md rounded-2xl">
      <CardHeader className="p-8 pb-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-xl">Evolução Mensal</CardTitle>
          <TooltipProvider>
            <UiTooltip>
              <TooltipTrigger asChild>
                <Info className="h-[14px] w-[14px] text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px] text-center">
                <p>Histórico mensal de Receitas, Despesas e Resultado Líquido. Permite visualizar tendências e sazonalidades ao longo dos meses.</p>
              </TooltipContent>
            </UiTooltip>
          </TooltipProvider>
        </div>
        <CardDescription>Comparativo de receitas, despesas e resultado operacional</CardDescription>
      </CardHeader>
      <CardContent className="p-8">
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <Card className="p-3 shadow-xl border-none bg-background/90 backdrop-blur-sm">
                        <p className="font-bold text-sm mb-2 uppercase tracking-wider">{formatDate(label)}</p>
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
              <Bar dataKey="total_income" name="Receitas" fill="#22C55E" radius={[4, 4, 0, 0]} barSize={24} />
              <Bar dataKey="total_expenses" name="Despesas" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={24} />
              <Line
                type="monotone"
                dataKey="net_result"
                name="Resultado"
                stroke="#2563EB"
                strokeWidth={3}
                dot={{ r: 4, fill: '#2563EB', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default EvolutionChart;
