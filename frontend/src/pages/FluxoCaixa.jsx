import React, { useState, useEffect } from 'react';
import api from '@/api/api';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const FluxoCaixa = () => {
  const [cashFlow, setCashFlow] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCashFlow = async () => {
    try {
      setLoading(true);
      const response = await api.get('/summary/cash-flow');
      setCashFlow(response.data);
    } catch (error) {
      console.error('Error fetching cash flow:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashFlow();
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T12:00:00');
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', weekday: 'short' }).format(date);
  };

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Fluxo de Caixa</h1>
        <p className="text-muted-foreground mt-1">Acompanhe a evolução do seu saldo dia a dia com base nas projeções.</p>
      </div>

      <Card className="border-none shadow-md rounded-2xl overflow-hidden">
        <CardHeader className="bg-secondary/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Projeção Mensal</CardTitle>
              <CardDescription>Entradas e saídas previstas para os próximos 30 dias</CardDescription>
            </div>
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <Calendar size={24} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b bg-secondary/10">
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Data</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Entradas</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">Saídas</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-right">Saldo Acumulado</th>
                  <th className="p-4 text-xs font-bold uppercase tracking-widest text-muted-foreground text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {cashFlow.map((day, index) => {
                  const isToday = day.date === new Date().toISOString().split('T')[0];
                  return (
                    <tr
                      key={index}
                      className={cn(
                        "transition-colors hover:bg-secondary/5",
                        day.balance < 0 ? "bg-destructive/5" : "",
                        isToday ? "bg-primary/5 ring-1 ring-inset ring-primary/20" : ""
                      )}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{formatDate(day.date)}</span>
                          {isToday && (
                            <Badge className="bg-primary hover:bg-primary text-[10px] h-4 px-1">HOJE</Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-success font-medium">
                        {day.income > 0 ? `+ ${formatCurrency(day.income)}` : '-'}
                      </td>
                      <td className="p-4 text-destructive font-medium">
                        {day.expense > 0 ? `- ${formatCurrency(day.expense)}` : '-'}
                      </td>
                      <td className={cn(
                        "p-4 font-bold text-right",
                        day.balance < 0 ? "text-destructive" : ""
                      )}>
                        {formatCurrency(day.balance)}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center">
                          {day.balance < 0 ? (
                            <div className="flex items-center gap-1 text-destructive text-xs font-bold">
                              <AlertCircle size={14} /> ALERTA
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-success text-xs font-bold">
                              <CheckCircle2 size={14} /> OK
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {cashFlow.length === 0 && !loading && (
            <div className="p-20 text-center text-muted-foreground italic">
              Nenhum dado disponível para o período.
            </div>
          )}
          {loading && (
            <div className="p-20 text-center animate-pulse text-muted-foreground">
              Calculando projeções...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FluxoCaixa;
