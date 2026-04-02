import React, { useState, useEffect } from 'react';
import api from '@/api/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import AccountForm from '@/components/AccountForm';
import TransferForm from '@/components/TransferForm';
import InvoicePaymentForm from '@/components/InvoicePaymentForm';
import {
  Plus, ArrowLeftRight, CreditCard, Landmark, Wallet, PiggyBank,
  Briefcase, Pencil, Trash2, Star, ArrowRight, CalendarClock,
  TrendingUp, AlertCircle, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import PrivateValue from '@/components/ui/PrivateValue';
import { Progress } from '@/components/ui/progress';

// ── Utilitários ────────────────────────────────────────────────────────────────
const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);

const getAccountIcon = (type, size = 20) => {
  const props = { size, strokeWidth: 1.75 };
  switch (type) {
    case 'carteira':      return <Wallet {...props} />;
    case 'banco':         return <Landmark {...props} />;
    case 'poupanca':      return <PiggyBank {...props} />;
    case 'investimento':  return <Briefcase {...props} />;
    case 'cartao_credito':return <CreditCard {...props} />;
    default:              return <Landmark {...props} />;
  }
};

// Cor de acento por tipo de conta
const ACCOUNT_ACCENT = {
  banco:          { bg: 'bg-blue-500/10',    text: 'text-blue-600',    border: 'border-blue-500/20'    },
  carteira:       { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/20' },
  poupanca:       { bg: 'bg-teal-500/10',    text: 'text-teal-600',    border: 'border-teal-500/20'    },
  investimento:   { bg: 'bg-violet-500/10',  text: 'text-violet-600',  border: 'border-violet-500/20'  },
  cartao_credito: { bg: 'bg-rose-500/10',    text: 'text-rose-600',    border: 'border-rose-500/20'    },
  outros_ativos:  { bg: 'bg-amber-500/10',   text: 'text-amber-600',   border: 'border-amber-500/20'   },
  outros_passivos:{ bg: 'bg-orange-500/10',  text: 'text-orange-600',  border: 'border-orange-500/20'  },
};

const getAccent = (type) => ACCOUNT_ACCENT[type] ?? ACCOUNT_ACCENT.banco;

// ── Card de conta bancária / carteira / poupança / investimento ────────────────
const AccountCard = ({ account, onSelect, onEdit, onDelete, onSetDefault }) => {
  const accent = getAccent(account.type);
  const isPositive = Number(account.balance ?? 0) >= 0;

  return (
    <div
      onClick={() => onSelect(account)}
      className="group relative flex items-center gap-4 bg-card border border-border/50 hover:border-border rounded-2xl px-5 py-4 cursor-pointer transition-all hover:shadow-md"
    >
      {/* Ícone */}
      <div className={cn('flex-shrink-0 p-3 rounded-xl border', accent.bg, accent.text, accent.border)}>
        {getAccountIcon(account.type, 20)}
      </div>

      {/* Info principal */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm truncate">{account.name}</p>
          {account.is_default && (
            <Star size={12} className="text-amber-500 fill-amber-500 flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-muted-foreground capitalize mt-0.5">
          {account.type.replace('_', ' ')}
        </p>
      </div>

      {/* Saldo */}
      <div className="text-right flex-shrink-0">
        <p className={cn('font-bold text-base tabular-nums', isPositive ? '' : 'text-destructive')}>
          <PrivateValue value={formatCurrency(account.balance ?? 0)} />
        </p>
      </div>

      {/* Ações (aparecem no hover) */}
      <div
        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onSetDefault(e, account.id); }}
          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-amber-500 transition-colors"
          title="Definir como padrão"
        >
          <Star size={14} className={account.is_default ? 'fill-amber-500 text-amber-500' : ''} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(account); }}
          className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(account.id); }}
          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <ChevronRight size={14} className="text-muted-foreground/40 ml-1 flex-shrink-0" />
    </div>
  );
};

// ── Card de cartão de crédito ──────────────────────────────────────────────────
const CreditCardCard = ({ account, invoiceAmount, onSelect, onEdit, onDelete, onPayInvoice }) => {
  const limit = Number(account.credit_limit ?? 0);
  const used = invoiceAmount;
  const usagePercent = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const available = limit > 0 ? limit - used : null;

  const urgency = usagePercent >= 85 ? 'high' : usagePercent >= 60 ? 'medium' : 'low';
  const progressColor =
    urgency === 'high' ? 'bg-destructive' :
    urgency === 'medium' ? 'bg-amber-500' : 'bg-primary';

  // Dias para fechar fatura
  const today = new Date();
  let daysToClose = null;
  if (account.closing_day) {
    const closingThisMonth = new Date(today.getFullYear(), today.getMonth(), account.closing_day);
    const closingNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, account.closing_day);
    const target = today.getDate() >= account.closing_day ? closingNextMonth : closingThisMonth;
    daysToClose = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  }

  return (
    <div
      onClick={() => onSelect(account)}
      className="group relative bg-card border border-border/50 hover:border-border rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20">
            <CreditCard size={18} strokeWidth={1.75} />
          </div>
          <div>
            <p className="font-semibold text-sm">{account.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Cartão de crédito</p>
          </div>
        </div>
        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(account); }}
            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(account.id); }}
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Valor da fatura */}
      <div className="mb-3">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
          Fatura atual
        </p>
        <p className="text-2xl font-bold tabular-nums">
          <PrivateValue value={formatCurrency(used)} />
        </p>
      </div>

      {/* Barra de uso */}
      {limit > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-muted-foreground">
              <PrivateValue value={formatCurrency(available)} /> disponível
            </span>
            <span className={cn(
              'text-xs font-semibold',
              urgency === 'high' ? 'text-destructive' :
              urgency === 'medium' ? 'text-amber-500' : 'text-muted-foreground'
            )}>
              {usagePercent.toFixed(0)}% usado
            </span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', progressColor)}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Rodapé: datas + botão pagar */}
      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {account.closing_day && (
            <span className="flex items-center gap-1">
              <CalendarClock size={11} />
              Fecha dia {account.closing_day}
              {daysToClose !== null && (
                <span className={cn(
                  'ml-1 font-medium',
                  daysToClose <= 3 ? 'text-destructive' :
                  daysToClose <= 7 ? 'text-amber-500' : ''
                )}>
                  ({daysToClose}d)
                </span>
              )}
            </span>
          )}
          {account.due_day && (
            <span className="flex items-center gap-1">
              Vence dia {account.due_day}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-3 text-xs rounded-lg"
          onClick={(e) => { e.stopPropagation(); onPayInvoice(account); }}
        >
          Pagar fatura
        </Button>
      </div>
    </div>
  );
};

// ── Seção com título ──────────────────────────────────────────────────────────
const Section = ({ title, total, children, empty }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{title}</h2>
      {total !== undefined && (
        <span className="text-sm font-semibold tabular-nums">
          <PrivateValue value={formatCurrency(total)} />
        </span>
      )}
    </div>
    {empty ? (
      <p className="text-sm text-muted-foreground italic py-2">Nenhuma conta nesta categoria.</p>
    ) : (
      <div className="space-y-2">{children}</div>
    )}
  </div>
);

// ── Página Principal ──────────────────────────────────────────────────────────
const Contas = () => {
  const [accounts, setAccounts]           = useState([]);
  const [transactions, setTransactions]   = useState([]);
  const [loading, setLoading]             = useState(true);

  const [editingAccount, setEditingAccount]         = useState(null);
  const [selectedAccount, setSelectedAccount]       = useState(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen]           = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget]             = useState(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/accounts/');
      setAccounts(res.data);

      const creditCards = res.data.filter((a) => a.type === 'cartao_credito' && a.closing_day);
      if (creditCards.length > 0) {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const params = new URLSearchParams();
        params.append('start_date', ninetyDaysAgo.toISOString().split('T')[0]);
        params.append('limit', 1000);
        creditCards.forEach((cc) => params.append('account_id', cc.id));
        const txRes = await api.get('/transactions/', { params });
        setTransactions(txRes.data.items);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAccounts(); }, []);

  // ── Cálculo de fatura corrente ────────────────────────────────────────────
  const calculateCurrentInvoice = (account) => {
    if (account.type !== 'cartao_credito' || !account.closing_day) return 0;
    const today = new Date(); today.setHours(23, 59, 59, 999);
    const closingDay = account.closing_day;
    const startDate = new Date(today.getFullYear(), today.getMonth() - 1, closingDay + 1);
    startDate.setHours(0, 0, 0, 0);
    return transactions
      .filter((t) => {
        const txDate = new Date(t.date + 'T00:00:00');
        return (
          t.account_id === account.id &&
          txDate >= startDate &&
          txDate <= today &&
          parseFloat(t.amount) < 0
        );
      })
      .reduce((acc, t) => acc + Math.abs(parseFloat(t.amount)), 0);
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleEdit = (account) => {
    setEditingAccount(account);
    setIsAccountModalOpen(true);
    setIsDetailsOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/accounts/${deleteTarget}`);
      toast.success('Conta excluída!');
      setIsDetailsOpen(false);
      fetchAccounts();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao excluir conta.');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleSetDefault = async (e, id) => {
    e.stopPropagation();
    try {
      await api.patch(`/accounts/${id}/set-default`);
      toast.success('Conta definida como padrão!');
      fetchAccounts();
    } catch {
      toast.error('Erro ao definir conta padrão.');
    }
  };

  const handlePayInvoice = (account) => {
    setSelectedAccount(account);
    setIsPaymentModalOpen(true);
  };

  // ── Agrupamento por tipo ──────────────────────────────────────────────────
  const bancos      = accounts.filter((a) => a.type === 'banco');
  const carteiras   = accounts.filter((a) => a.type === 'carteira');
  const poupancas   = accounts.filter((a) => a.type === 'poupanca');
  const cartoes     = accounts.filter((a) => a.type === 'cartao_credito');
  const investimentos = accounts.filter((a) => a.type === 'investimento');
  const outros      = accounts.filter((a) =>
    !['banco','carteira','poupanca','cartao_credito','investimento'].includes(a.type)
  );

  const totalLiquido = [...bancos, ...carteiras, ...poupancas]
    .reduce((s, a) => s + Number(a.balance ?? 0), 0);
  const totalInvestido = investimentos.reduce((s, a) => s + Number(a.balance ?? 0), 0);
  const totalFaturas   = cartoes.reduce((s, a) => s + calculateCurrentInvoice(a), 0);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-8 pb-10">
        <div className="flex justify-between items-center">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contas e Carteiras</h1>
          <p className="text-muted-foreground mt-1 text-sm">Organize onde seu dinheiro está guardado.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setIsTransferModalOpen(true)} className="rounded-xl">
            <ArrowLeftRight className="mr-2 h-4 w-4" /> Transferir
          </Button>
          <Button
            onClick={() => { setEditingAccount(null); setIsAccountModalOpen(true); }}
            className="rounded-xl shadow-lg shadow-primary/20"
          >
            <Plus className="mr-2 h-4 w-4" /> Nova Conta
          </Button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          title="Nenhuma conta cadastrada"
          description="Adicione contas para controlar seu saldo."
          actionLabel="Nova Conta"
          onAction={() => { setEditingAccount(null); setIsAccountModalOpen(true); }}
        />
      ) : (
        <div className="space-y-8">
          {/* Resumo rápido */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card border border-border/50 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Saldo líquido</p>
              <p className={cn('text-xl font-bold tabular-nums', totalLiquido < 0 ? 'text-destructive' : '')}>
                <PrivateValue value={formatCurrency(totalLiquido)} />
              </p>
              <p className="text-xs text-muted-foreground mt-1">Banco + carteira + poupança</p>
            </div>
            <div className="bg-card border border-border/50 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Investido</p>
              <p className="text-xl font-bold tabular-nums text-violet-600">
                <PrivateValue value={formatCurrency(totalInvestido)} />
              </p>
              <p className="text-xs text-muted-foreground mt-1">Total em investimentos</p>
            </div>
            <div className="bg-card border border-border/50 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Faturas abertas</p>
              <p className={cn('text-xl font-bold tabular-nums', totalFaturas > 0 ? 'text-rose-600' : '')}>
                <PrivateValue value={formatCurrency(totalFaturas)} />
              </p>
              <p className="text-xs text-muted-foreground mt-1">Total de cartões de crédito</p>
            </div>
          </div>

          {/* Contas bancárias */}
          {bancos.length > 0 && (
            <Section title="Contas bancárias" total={bancos.reduce((s, a) => s + Number(a.balance ?? 0), 0)}>
              {bancos.map((a) => (
                <AccountCard
                  key={a.id} account={a}
                  onSelect={(acc) => { setSelectedAccount(acc); setIsDetailsOpen(true); }}
                  onEdit={handleEdit}
                  onDelete={setDeleteTarget}
                  onSetDefault={handleSetDefault}
                />
              ))}
            </Section>
          )}

          {/* Cartões de crédito */}
          {cartoes.length > 0 && (
            <Section title="Cartões de crédito">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cartoes.map((a) => (
                  <CreditCardCard
                    key={a.id} account={a}
                    invoiceAmount={calculateCurrentInvoice(a)}
                    onSelect={(acc) => { setSelectedAccount(acc); setIsDetailsOpen(true); }}
                    onEdit={handleEdit}
                    onDelete={setDeleteTarget}
                    onPayInvoice={handlePayInvoice}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* Investimentos */}
          {investimentos.length > 0 && (
            <Section title="Investimentos" total={totalInvestido}>
              {investimentos.map((a) => (
                <AccountCard
                  key={a.id} account={a}
                  onSelect={(acc) => { setSelectedAccount(acc); setIsDetailsOpen(true); }}
                  onEdit={handleEdit}
                  onDelete={setDeleteTarget}
                  onSetDefault={handleSetDefault}
                />
              ))}
            </Section>
          )}

          {/* Carteiras + Poupança */}
          {(carteiras.length > 0 || poupancas.length > 0) && (
            <Section
              title="Carteira & Poupança"
              total={[...carteiras, ...poupancas].reduce((s, a) => s + Number(a.balance ?? 0), 0)}
            >
              {[...carteiras, ...poupancas].map((a) => (
                <AccountCard
                  key={a.id} account={a}
                  onSelect={(acc) => { setSelectedAccount(acc); setIsDetailsOpen(true); }}
                  onEdit={handleEdit}
                  onDelete={setDeleteTarget}
                  onSetDefault={handleSetDefault}
                />
              ))}
            </Section>
          )}

          {/* Outros */}
          {outros.length > 0 && (
            <Section title="Outros">
              {outros.map((a) => (
                <AccountCard
                  key={a.id} account={a}
                  onSelect={(acc) => { setSelectedAccount(acc); setIsDetailsOpen(true); }}
                  onEdit={handleEdit}
                  onDelete={setDeleteTarget}
                  onSetDefault={handleSetDefault}
                />
              ))}
            </Section>
          )}
        </div>
      )}

      {/* ── Modais ─────────────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl border-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as transações vinculadas perderão o vínculo. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="rounded-xl bg-destructive hover:bg-destructive/90 text-white">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isAccountModalOpen} onOpenChange={setIsAccountModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingAccount ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
          </DialogHeader>
          <AccountForm
            account={editingAccount}
            onAccountCreated={fetchAccounts}
            onClose={() => { setIsAccountModalOpen(false); setEditingAccount(null); }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Pagamento de Fatura</DialogTitle>
          </DialogHeader>
          {selectedAccount && (
            <InvoicePaymentForm
              creditCard={selectedAccount}
              invoiceAmount={calculateCurrentInvoice(selectedAccount)}
              accounts={accounts}
              onPaymentConfirmed={fetchAccounts}
              onClose={() => setIsPaymentModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Transferência entre Contas</DialogTitle>
          </DialogHeader>
          <TransferForm
            accounts={accounts}
            onTransferCreated={fetchAccounts}
            onClose={() => setIsTransferModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* ── Sheet de detalhes ──────────────────────────────────────────────── */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="w-[340px] sm:w-[380px] p-0 border-l border-border/50">
          {selectedAccount && (
            <div className="flex flex-col h-full">
              <SheetHeader className="p-6 pb-0">
                <div className="flex items-center gap-2 text-muted-foreground mb-3">
                  {getAccountIcon(selectedAccount.type, 16)}
                  <span className="text-[10px] font-bold tracking-widest uppercase">
                    {selectedAccount.type.replace('_', ' ')}
                  </span>
                </div>
                <SheetTitle className="text-2xl font-black leading-tight">
                  {selectedAccount.name}
                </SheetTitle>
              </SheetHeader>

              <div className="flex-1 px-6 pt-6 pb-6 overflow-y-auto space-y-6">
                {/* Saldo */}
                <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10">
                  <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest mb-1">
                    {selectedAccount.type === 'cartao_credito' ? 'Fatura atual' : 'Saldo atual'}
                  </p>
                  <p className={cn(
                    'text-3xl font-black tracking-tight',
                    Number(selectedAccount.balance ?? 0) >= 0 ? 'text-foreground' : 'text-destructive'
                  )}>
                    <PrivateValue value={formatCurrency(
                      selectedAccount.type === 'cartao_credito'
                        ? calculateCurrentInvoice(selectedAccount)
                        : (selectedAccount.balance ?? 0)
                    )} />
                  </p>
                </div>

                {/* Detalhes cartão */}
                {selectedAccount.type === 'cartao_credito' && (
                  <div className="space-y-3">
                    {selectedAccount.credit_limit && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Limite total</span>
                        <span className="font-semibold">
                          <PrivateValue value={formatCurrency(selectedAccount.credit_limit)} />
                        </span>
                      </div>
                    )}
                    {selectedAccount.closing_day && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Fechamento</span>
                        <span className="font-semibold">Dia {selectedAccount.closing_day}</span>
                      </div>
                    )}
                    {selectedAccount.due_day && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Vencimento</span>
                        <span className="font-semibold">Dia {selectedAccount.due_day}</span>
                      </div>
                    )}
                    <Button
                      className="w-full rounded-xl mt-2"
                      onClick={() => { setIsDetailsOpen(false); handlePayInvoice(selectedAccount); }}
                    >
                      <ArrowRight className="mr-2 h-4 w-4" /> Pagar fatura
                    </Button>
                  </div>
                )}

                {/* Ações */}
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <Button
                    variant="outline"
                    className="w-full rounded-xl justify-start gap-2"
                    onClick={() => handleEdit(selectedAccount)}
                  >
                    <Pencil size={14} /> Editar conta
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full rounded-xl justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/20"
                    onClick={() => { setIsDetailsOpen(false); setDeleteTarget(selectedAccount.id); }}
                  >
                    <Trash2 size={14} /> Excluir conta
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Contas;
