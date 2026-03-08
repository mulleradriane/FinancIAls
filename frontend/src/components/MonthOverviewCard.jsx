import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, TrendingUp, Receipt, Clock, ArrowDownCircle, Target } from 'lucide-react';
import InfoTooltip from '@/components/ui/InfoTooltip';
import PrivateValue from '@/components/ui/PrivateValue';
import { formatCurrency, cn } from '@/lib/utils';

const MetricItem = ({ icon: Icon, label, value, tooltip, isPositive, highlight, colorClass }) => (
  <div className={cn("p-6 flex flex-col gap-2", highlight && "md:col-span-1")}>
    <div className="flex items-center gap-2">
      <div className={cn("p-2 rounded-lg", colorClass || "bg-muted")}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <InfoTooltip content={tooltip} />
    </div>
    <p className={cn(
      "text-2xl font-bold tracking-tight mt-1",
      highlight ? (isPositive ? "text-success text-3xl" : "text-destructive text-3xl") : ""
    )}>
      <PrivateValue value={formatCurrency(value)} />
    </p>
  </div>
);

const MonthOverviewCard = ({ accounts, transactions, loading }) => {
  if (loading) {
    return (
      <Card className="border-none shadow-md rounded-2xl overflow-hidden">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-b border-border">
            {[1, 2, 3].map(i => <div key={i} className="p-6 space-y-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-32" /></div>)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 bg-muted/30">
            {[4, 5, 6].map(i => <div key={i} className="p-6 space-y-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-32" /></div>)}
          </div>
        </CardContent>
      </Card>
    );
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Format Month/Year title
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(now);
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const titleDate = `${capitalizedMonth}/${year}`;

  // Use a stable "today" string for comparison (YYYY-MM-DD) in local time
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // 1. Saldo Disponível: Soma de current_balance de contas com type = 'banco'
  const saldoDisponivel = accounts
    .filter(acc => acc.type === 'banco')
    .reduce((sum, acc) => sum + Number(acc.current_balance || 0), 0);

  // 2. Investido: Soma de current_balance de contas com type = 'investimento'
  const investido = accounts
    .filter(acc => acc.type === 'investimento')
    .reduce((sum, acc) => sum + Number(acc.current_balance || 0), 0);

  // 3. Já gastei este mês: EXPENSE, date <= hoje
  const jaGastei = transactions
    .filter(t => t.nature === 'EXPENSE' && t.date <= todayStr)
    .reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);

  // 4. Recorrências pendentes: EXPENSE or TRANSFER (neg), date > hoje
  const recorrenciasPendentes = transactions
    .filter(t => (t.nature === 'EXPENSE' || (t.nature === 'TRANSFER' && Number(t.amount) < 0)) && t.date > todayStr)
    .reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);

  // 5. Ainda entra este mês: INCOME, date > hoje
  const aindaEntra = transactions
    .filter(t => t.nature === 'INCOME' && t.date > todayStr)
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // 6. Projeção fim do mês: Saldo Disponível - Recorrências Pendentes + Ainda Entra
  const projecaoFimMes = saldoDisponivel - recorrenciasPendentes + aindaEntra;

  return (
    <Card className="border-none shadow-md rounded-2xl overflow-hidden">
      <CardHeader className="pb-4 pt-6 px-6">
        <CardTitle className="text-xl font-bold text-foreground">
          Visão do Mês — {titleDate}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Linha de Cima: Situação Atual */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-b border-border/50">
          <MetricItem
            icon={Wallet}
            label="Saldo Disponível"
            value={saldoDisponivel}
            tooltip="Soma dos saldos atuais de todas as contas do tipo banco. Não inclui cartões de crédito nem investimentos."
            colorClass="bg-primary/10 text-primary"
          />
          <MetricItem
            icon={TrendingUp}
            label="Investido"
            value={investido}
            tooltip="Soma dos saldos de todas as contas do tipo investimento."
            colorClass="bg-indigo-500/10 text-indigo-500"
          />
          <MetricItem
            icon={Receipt}
            label="Já gastei este mês"
            value={jaGastei}
            tooltip="Total de despesas (EXPENSE) registradas no mês atual até hoje."
            colorClass="bg-destructive/10 text-destructive"
          />
        </div>

        {/* Linha de Baixo: Projeção */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 bg-muted/30">
          <MetricItem
            icon={Clock}
            label="Recorrências pendentes"
            value={recorrenciasPendentes}
            tooltip="Soma das transações futuras do mês atual (despesas com date > hoje e date <= fim do mês)."
            colorClass="bg-amber-500/10 text-amber-500"
          />
          <MetricItem
            icon={ArrowDownCircle}
            label="Ainda entra este mês"
            value={aindaEntra}
            tooltip="Soma das receitas futuras do mês atual (INCOME com date > hoje e date <= fim do mês)."
            colorClass="bg-success/10 text-success"
          />
          <MetricItem
            icon={Target}
            label="Projeção fim do mês"
            value={projecaoFimMes}
            tooltip="Estimativa de saldo disponível no fim do mês: Saldo Disponível − Recorrências Pendentes + Ainda Entra."
            highlight={true}
            isPositive={projecaoFimMes >= 0}
            colorClass={projecaoFimMes >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthOverviewCard;
