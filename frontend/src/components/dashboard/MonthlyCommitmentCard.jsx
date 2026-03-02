import React from 'react';
import { Wallet, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import PrivateValue from '@/components/ui/PrivateValue';
import { cn } from '@/lib/utils';

const MonthlyCommitmentCard = ({ data, loading }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  if (loading || !data) {
    return (
      <Card className="border-none shadow-md rounded-2xl overflow-hidden">
        <CardContent className="p-8">
          <div className="flex items-center gap-3 mb-8">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="grid grid-cols-3 gap-8 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-32" />
              </div>
            ))}
          </div>
          <Skeleton className="h-4 w-full mb-8" />
          <Skeleton className="h-6 w-64" />
        </CardContent>
      </Card>
    );
  }

  const {
    gasto_ate_hoje = 0,
    recorrentes_futuras = 0,
    receita_esperada = 0,
    saldo_projetado = 0
  } = data;

  const totalCommitted = gasto_ate_hoje + recorrentes_futuras;
  const percentage = receita_esperada > 0 ? (totalCommitted / receita_esperada) * 100 : 0;

  const getProgressColor = () => {
    if (percentage > 100) return "bg-destructive";
    if (percentage > 80) return "bg-amber-500";
    return "bg-success";
  };

  const isOverBudget = percentage > 100;

  return (
    <Card className="border-none shadow-md rounded-2xl overflow-hidden group">
      <CardContent className="p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-xl font-bold tracking-tight">Comprometimento do Mês</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Gasto até hoje</p>
            <p className="text-2xl font-bold text-destructive">
              <PrivateValue value={formatCurrency(gasto_ate_hoje)} />
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Recorrentes futuras</p>
            <p className="text-2xl font-bold text-amber-500">
              <PrivateValue value={formatCurrency(recorrentes_futuras)} />
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Receita esperada</p>
            <p className="text-2xl font-bold text-success">
              <PrivateValue value={formatCurrency(receita_esperada)} />
            </p>
          </div>
        </div>

        <div className="space-y-2 mb-8">
          <div className="flex justify-between items-end h-5">
            <span className="text-xs font-medium text-muted-foreground">
              {percentage.toFixed(1)}% do orçamento comprometido
            </span>
            {isOverBudget && (
              <span className="text-xs font-bold text-destructive flex items-center gap-1 animate-pulse">
                <AlertTriangle size={14} />
                ⚠️ Acima da receita
              </span>
            )}
          </div>
          <div className="relative h-4 w-full bg-secondary rounded-full overflow-hidden">
             <div
              className={cn("h-full transition-all duration-500", getProgressColor())}
              style={{ width: `${Math.min(percentage, 100)}%` }}
             />
          </div>
        </div>

        <div className="pt-4 border-t border-border/50">
          <p className="text-sm font-medium">
            Saldo projetado ao fim do mês:{' '}
            <span className={cn("font-bold text-lg ml-1", saldo_projetado >= 0 ? "text-success" : "text-destructive")}>
              <PrivateValue value={formatCurrency(saldo_projetado)} />
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlyCommitmentCard;
