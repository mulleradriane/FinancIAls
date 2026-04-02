import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, TrendingUp, Receipt, Clock, ArrowDownCircle, Target, History } from 'lucide-react';
import InfoTooltip from '@/components/ui/InfoTooltip';
import PrivateValue from '@/components/ui/PrivateValue';
import { formatCurrency, cn, parseLocalDate } from '@/lib/utils';

const MetricItem = ({ icon: Icon, label, value, tooltip, isPositive, highlight, colorClass }) => (
  <div className={cn('p-6 flex flex-col gap-2', highlight && 'md:col-span-1')}>
    <div className="flex items-center gap-2">
      <div className={cn('p-2 rounded-lg', colorClass || 'bg-muted')}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <InfoTooltip content={tooltip} />
    </div>
    <p
      className={cn(
        'text-2xl font-bold tracking-tight mt-1',
        highlight ? (isPositive ? 'text-success text-3xl' : 'text-destructive text-3xl') : ''
      )}
    >
      <PrivateValue value={formatCurrency(value)} />
    </p>
  </div>
);

/**
 * MonthOverviewCard
 *
 * Props:
 *  - accounts: Account[]  — lista de contas (saldo atual, usado apenas para mês corrente)
 *  - transactions: Transaction[]  — transações do mês selecionado (incluindo futuras quando mês atual)
 *  - loading: boolean
 *  - selectedYear: number  — ano do mês que o dashboard está exibindo
 *  - selectedMonth: number — mês (1–12) que o dashboard está exibindo
 *  - historicalBalances: { [account_id]: number } | null
 *    — saldos das contas no fim do mês histórico (vindo de balance_history).
 *      Null quando mês corrente (usa accounts.balance diretamente).
 */
const MonthOverviewCard = ({
  accounts,
  transactions,
  loading,
  selectedYear,
  selectedMonth,
  historicalBalances = null,
}) => {
  if (loading) {
    return (
      <Card className="border-none shadow-md rounded-2xl overflow-hidden">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-b border-border">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 bg-muted/30">
            {[4, 5, 6].map((i) => (
              <div key={i} className="p-6 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Determinar se estamos no mês corrente ou em histórico ──────────────────
  const now = new Date();
  const isCurrentMonth =
    selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;

  // Datas de referência para filtro (garantindo 00:00:00 local)
  const hoje = isCurrentMonth
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
    : new Date(selectedYear, selectedMonth - 1 + 1, 0); // último dia do mês histórico

  const inicioMes = new Date(selectedYear, selectedMonth - 1, 1);
  const fimMes = new Date(selectedYear, selectedMonth - 1 + 1, 0);

  // Format Month/Year title
  const refDate = new Date(selectedYear, selectedMonth - 1, 1);
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(refDate);
  const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const titleDate = `${capitalizedMonth}/${selectedYear}`;

  // ── Saldo Disponível ───────────────────────────────────────────────────────
  // Mês corrente: usa account.balance ao vivo
  // Mês histórico: usa historicalBalances se disponível, caso contrário exibe 0 e indica que não há dado
  const saldoDisponivel = (() => {
    if (isCurrentMonth) {
      return accounts
        .filter((acc) => acc.type === 'banco')
        .reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
    }
    if (historicalBalances) {
      return accounts
        .filter((acc) => acc.type === 'banco')
        .reduce((sum, acc) => sum + Number(historicalBalances[acc.id] || 0), 0);
    }
    return null; // sem dado histórico
  })();

  // ── Investido ──────────────────────────────────────────────────────────────
  const investido = (() => {
    if (isCurrentMonth) {
      return accounts
        .filter((acc) => acc.type === 'investimento')
        .reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
    }
    if (historicalBalances) {
      return accounts
        .filter((acc) => acc.type === 'investimento')
        .reduce((sum, acc) => sum + Number(historicalBalances[acc.id] || 0), 0);
    }
    return null;
  })();

  // ── Gastos realizados no mês ───────────────────────────────────────────────
  // Histórico: TODAS as despesas do mês (não limitado a "até hoje")
  const jaGastei = transactions
    .filter((t) => {
      const data = parseLocalDate(t.date);
      return t.nature === 'EXPENSE' && data >= inicioMes && data <= hoje;
    })
    .reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);

  // ── Receitas realizadas no mês ─────────────────────────────────────────────
  const receitasRealizadas = transactions
    .filter((t) => {
      const data = parseLocalDate(t.date);
      return t.nature === 'INCOME' && data >= inicioMes && data <= hoje;
    })
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // ── Resultado do mês histórico ─────────────────────────────────────────────
  const resultadoMes = receitasRealizadas - jaGastei;

  // ── Dados exclusivos do mês corrente (projeção) ────────────────────────────
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);

  const recorrenciasPendentes = isCurrentMonth
    ? transactions
        .filter((t) => {
          const data = parseLocalDate(t.date);
          const isNegativeTransfer = t.nature === 'TRANSFER' && Number(t.amount) < 0;
          return (
            (t.nature === 'EXPENSE' || isNegativeTransfer) &&
            data >= amanha &&
            data <= fimMes
          );
        })
        .reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0)
    : 0;

  const aindaEntra = isCurrentMonth
    ? transactions
        .filter((t) => {
          const data = parseLocalDate(t.date);
          return t.nature === 'INCOME' && data >= amanha && data <= fimMes;
        })
        .reduce((sum, t) => sum + Number(t.amount || 0), 0)
    : 0;

  const projecaoFimMes =
    isCurrentMonth && saldoDisponivel !== null
      ? saldoDisponivel - recorrenciasPendentes + aindaEntra
      : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  const semDadoHistorico = !isCurrentMonth && historicalBalances === null;

  return (
    <Card className="border-none shadow-md rounded-2xl overflow-hidden">
      <CardHeader className="pb-4 pt-6 px-6">
        <div className="flex items-center gap-3">
          <CardTitle className="text-xl font-bold text-foreground">
            Visão do Mês — {titleDate}
          </CardTitle>
          {!isCurrentMonth && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/50 rounded-full px-2.5 py-1">
              <History className="h-3 w-3" />
              Histórico
            </span>
          )}
        </div>
        {semDadoHistorico && (
          <p className="text-xs text-muted-foreground mt-1">
            Saldos por conta não disponíveis para este mês — apenas gastos e receitas são exibidos.
          </p>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {/* ── Linha superior ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-b border-border/50">
          {/* Saldo disponível — só exibe se tiver dado */}
          {saldoDisponivel !== null ? (
            <MetricItem
              icon={Wallet}
              label="Saldo Disponível"
              value={saldoDisponivel}
              tooltip={
                isCurrentMonth
                  ? 'Soma dos saldos atuais de todas as contas do tipo banco. Não inclui cartões de crédito nem investimentos.'
                  : 'Saldo das contas bancárias no encerramento deste mês.'
              }
              colorClass="bg-primary/10 text-primary"
            />
          ) : (
            <div className="p-6 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-muted">
                  <Wallet className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Saldo disponível
                </p>
              </div>
              <p className="text-sm text-muted-foreground italic">Sem dado histórico</p>
            </div>
          )}

          {investido !== null ? (
            <MetricItem
              icon={TrendingUp}
              label="Investido"
              value={investido}
              tooltip="Soma dos saldos de todas as contas do tipo investimento."
              colorClass="bg-indigo-500/10 text-indigo-500"
            />
          ) : (
            <div className="p-6 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-muted">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Investido
                </p>
              </div>
              <p className="text-sm text-muted-foreground italic">Sem dado histórico</p>
            </div>
          )}

          <MetricItem
            icon={Receipt}
            label={isCurrentMonth ? 'Já gastei este mês' : 'Total gasto no mês'}
            value={jaGastei}
            tooltip={
              isCurrentMonth
                ? 'Total de despesas (EXPENSE) registradas no mês atual até hoje.'
                : 'Total de despesas registradas neste mês.'
            }
            colorClass="bg-destructive/10 text-destructive"
          />
        </div>

        {/* ── Linha inferior: projeção (mês corrente) ou resultado (histórico) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 bg-muted/30">
          {isCurrentMonth ? (
            <>
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
                label="Saldo estimado (só fixos)"
                value={projecaoFimMes}
                tooltip="Estimativa de saldo disponível no fim do mês considerando apenas compromissos fixos. Não inclui gastos variáveis como mercado, restaurante e lazer."
                highlight
                isPositive={projecaoFimMes >= 0}
                colorClass={
                  projecaoFimMes >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                }
              />
            </>
          ) : (
            <>
              <MetricItem
                icon={ArrowDownCircle}
                label="Receitas do mês"
                value={receitasRealizadas}
                tooltip="Total de receitas (INCOME) registradas neste mês."
                colorClass="bg-success/10 text-success"
              />
              <MetricItem
                icon={Receipt}
                label="Despesas do mês"
                value={jaGastei}
                tooltip="Total de despesas (EXPENSE) registradas neste mês."
                colorClass="bg-destructive/10 text-destructive"
              />
              <MetricItem
                icon={Target}
                label="Resultado do mês"
                value={resultadoMes}
                tooltip="Receitas menos Despesas registradas neste mês."
                highlight
                isPositive={resultadoMes >= 0}
                colorClass={
                  resultadoMes >= 0 ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                }
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthOverviewCard;
