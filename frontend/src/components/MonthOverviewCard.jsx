import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, Receipt, Clock, ArrowDownCircle, TrendingUp, History } from 'lucide-react';
import InfoTooltip from '@/components/ui/InfoTooltip';
import PrivateValue from '@/components/ui/PrivateValue';
import { formatCurrency, cn, parseLocalDate } from '@/lib/utils';

const MetricBlock = ({ icon: Icon, label, value, tooltip, colorClass, valueClass, size = 'md', suffix }) => (
  <div className="flex flex-col gap-3 p-5 min-w-0">
    <div className="flex items-center gap-2 min-w-0">
      <div className={cn('p-1.5 rounded-lg shrink-0', colorClass || 'bg-muted text-muted-foreground')}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider leading-none truncate">
        {label}
      </p>
      {tooltip && <InfoTooltip content={tooltip} />}
    </div>
    <p className={cn(
      'font-bold tracking-tight tabular-nums leading-none truncate',
      size === 'lg' ? 'text-2xl xl:text-3xl' : 'text-lg xl:text-xl',
      valueClass,
    )}>
      <PrivateValue value={formatCurrency(value)} />
      {suffix && <span className="text-sm font-normal text-muted-foreground ml-1.5">{suffix}</span>}
    </p>
  </div>
);

const MonthOverviewCard = ({
  accounts = [],
  transactions = [],
  loading,
  selectedYear,
  selectedMonth,
  historicalBalances = null,
}) => {
  if (loading) {
    return (
      <Card className="border-none shadow-md rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-border/50">
            {[1,2,3].map(i => (
              <div key={i} className="p-5 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-36" />
              </div>
            ))}
          </div>
          <div className="h-px bg-border/50" />
          <div className="grid grid-cols-2 divide-x divide-border/50 bg-muted/20">
            {[4,5].map(i => (
              <div key={i} className="p-5 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-7 w-28" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const now = new Date();
  const isCurrentMonth =
    selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;

  const hoje      = isCurrentMonth
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
    : new Date(selectedYear, selectedMonth - 1 + 1, 0);
  const inicioMes = new Date(selectedYear, selectedMonth - 1, 1);
  const fimMes    = new Date(selectedYear, selectedMonth - 1 + 1, 0);
  const amanha    = new Date(hoje); amanha.setDate(amanha.getDate() + 1);

  const refDate   = new Date(selectedYear, selectedMonth - 1, 1);
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(refDate);
  const titleDate = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${selectedYear}`;

  // Saldo disponível
  const saldoDisponivel = (() => {
    const bankAccounts = accounts.filter(a => a.type === 'banco');
    if (isCurrentMonth) return bankAccounts.reduce((s, a) => s + Number(a.balance || 0), 0);
    if (historicalBalances) return bankAccounts.reduce((s, a) => s + Number(historicalBalances[a.id] || 0), 0);
    return null;
  })();

  // Investido
  const investido = (() => {
    const invAccounts = accounts.filter(a => a.type === 'investimento');
    if (isCurrentMonth) return invAccounts.reduce((s, a) => s + Number(a.balance || 0), 0);
    if (historicalBalances) return invAccounts.reduce((s, a) => s + Number(historicalBalances[a.id] || 0), 0);
    return null;
  })();

  // Despesas realizadas até hoje
  const jaGastei = transactions
    .filter(t => { const d = parseLocalDate(t.date); return t.nature === 'EXPENSE' && d >= inicioMes && d <= hoje; })
    .reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);

  // Receitas realizadas até hoje
  const receitasRealizadas = transactions
    .filter(t => { const d = parseLocalDate(t.date); return t.nature === 'INCOME' && d >= inicioMes && d <= hoje; })
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  // Despesas futuras previstas (apenas nature EXPENSE, não TRANSFER)
  const aGastarAinda = isCurrentMonth
    ? transactions
        .filter(t => { const d = parseLocalDate(t.date); return t.nature === 'EXPENSE' && d >= amanha && d <= fimMes; })
        .reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0)
    : 0;

  // Receitas futuras previstas
  const aindaEntra = isCurrentMonth
    ? transactions
        .filter(t => { const d = parseLocalDate(t.date); return t.nature === 'INCOME' && d >= amanha && d <= fimMes; })
        .reduce((s, t) => s + Number(t.amount || 0), 0)
    : 0;

  const resultadoMes = receitasRealizadas - jaGastei;

  if (isCurrentMonth) {
    return (
      <Card className="border-none shadow-md rounded-2xl overflow-hidden">
        <div className="px-5 pt-4 pb-1">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{titleDate}</p>
        </div>

        {/* Linha 1: Saldo | Já gastei | A gastar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-border/50">
          {/* Saldo — destaque */}
          <div className="flex flex-col gap-3 p-5 lg:p-6 min-w-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Wallet className="h-4 w-4" />
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Saldo disponível</p>
              <InfoTooltip content="Soma dos saldos das contas bancárias agora. Não inclui cartão de crédito nem investimentos." />
            </div>
            {saldoDisponivel !== null ? (
              <p className={cn('text-2xl xl:text-3xl font-bold tracking-tight tabular-nums truncate', saldoDisponivel < 0 && 'text-destructive')}>
                <PrivateValue value={formatCurrency(saldoDisponivel)} />
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">Sem dado</p>
            )}
          </div>

          <MetricBlock
            icon={Receipt}
            label="Já gastei este mês"
            value={jaGastei}
            tooltip="Total de despesas confirmadas desde o dia 1 até hoje."
            colorClass="bg-destructive/10 text-destructive"
            valueClass="text-destructive"
          />

          <MetricBlock
            icon={Clock}
            label="A gastar ainda"
            value={aGastarAinda}
            tooltip="Despesas já lançadas com data futura neste mês — recorrências e parcelamentos previstos."
            colorClass="bg-amber-500/10 text-amber-600"
            valueClass={aGastarAinda > 0 ? 'text-amber-600' : 'text-muted-foreground'}
            suffix={aGastarAinda === 0 ? '(nenhuma prevista)' : undefined}
          />
        </div>

        <div className="h-px bg-border/50" />

        {/* Linha 2: Ainda entra | Investido */}
        <div className="grid grid-cols-2 divide-x divide-border/50 bg-muted/20">
          <MetricBlock
            icon={ArrowDownCircle}
            label="Ainda entra este mês"
            value={aindaEntra}
            tooltip="Receitas já lançadas com data futura neste mês — salário e outras receitas previstas."
            colorClass="bg-success/10 text-success"
            valueClass={aindaEntra > 0 ? 'text-success' : 'text-muted-foreground'}
            suffix={aindaEntra === 0 ? '(nenhuma prevista)' : undefined}
          />
          {investido !== null ? (
            <MetricBlock
              icon={TrendingUp}
              label="Investido"
              value={investido}
              tooltip="Total nas contas de investimento."
              colorClass="bg-indigo-500/10 text-indigo-500"
              valueClass="text-indigo-500"
            />
          ) : (
            <div className="p-5 text-sm text-muted-foreground italic">Nenhuma conta de investimento</div>
          )}
        </div>
      </Card>
    );
  }

  // ── Histórico ─────────────────────────────────────────────────────────────
  return (
    <Card className="border-none shadow-md rounded-2xl overflow-hidden">
      <div className="px-5 pt-4 pb-1 flex items-center gap-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{titleDate}</p>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground bg-muted/50 rounded-full px-2 py-0.5">
          <History className="h-3 w-3" /> Histórico
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-border/50">
        <MetricBlock
          icon={ArrowDownCircle}
          label="Receitas do mês"
          value={receitasRealizadas}
          tooltip="Total de receitas registradas neste mês."
          colorClass="bg-success/10 text-success"
          valueClass="text-success"
        />
        <MetricBlock
          icon={Receipt}
          label="Despesas do mês"
          value={jaGastei}
          tooltip="Total de despesas registradas neste mês."
          colorClass="bg-destructive/10 text-destructive"
          valueClass="text-destructive"
        />
        <MetricBlock
          icon={Wallet}
          label="Resultado do mês"
          value={resultadoMes}
          tooltip="Receitas menos Despesas do mês."
          colorClass={resultadoMes >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}
          valueClass={resultadoMes >= 0 ? 'text-success' : 'text-destructive'}
          size="lg"
        />
      </div>
      {saldoDisponivel !== null && (
        <>
          <div className="h-px bg-border/50" />
          <div className="grid grid-cols-2 divide-x divide-border/50 bg-muted/20">
            <MetricBlock
              icon={Wallet}
              label="Saldo disponível no fim do mês"
              value={saldoDisponivel}
              tooltip="Saldo das contas bancárias no encerramento deste mês."
              colorClass="bg-primary/10 text-primary"
            />
            {investido !== null && (
              <MetricBlock
                icon={TrendingUp}
                label="Investido"
                value={investido}
                tooltip="Total nas contas de investimento no fim do mês."
                colorClass="bg-indigo-500/10 text-indigo-500"
                valueClass="text-indigo-500"
              />
            )}
          </div>
        </>
      )}
    </Card>
  );
};

export default MonthOverviewCard;
