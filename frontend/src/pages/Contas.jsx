import React, { useState, useEffect } from 'react';
import api from '@/api/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AccountForm from '@/components/AccountForm';
import TransferForm from '@/components/TransferForm';
import InvoicePaymentForm from '@/components/InvoicePaymentForm';
import { Plus, ArrowLeftRight, CreditCard, Landmark, Wallet, PiggyBank, Briefcase, Pencil, Trash2, Info, Receipt, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from '@/components/ui/badge';
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import PrivateValue from '@/components/ui/PrivateValue';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const Contas = () => {
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/accounts/');
      setAccounts(response.data);

      // Fetch transactions for credit cards with closing_day
      const creditCards = response.data.filter(a => a.type === 'cartao_credito' && a.closing_day);
      if (creditCards.length > 0) {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const params = new URLSearchParams();
        params.append('start_date', ninetyDaysAgo.toISOString().split('T')[0]);
        params.append('limit', 1000);
        creditCards.forEach(cc => params.append('account_id', cc.id));

        const txResponse = await api.get('/transactions/', { params });
        setTransactions(txResponse.data.items);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const getAccountIcon = (type, size = 24) => {
    const props = { size };
    switch (type) {
      case 'carteira': return <Wallet {...props} />;
      case 'banco': return <Landmark {...props} />;
      case 'poupanca': return <PiggyBank {...props} />;
      case 'investimento': return <Briefcase {...props} />;
      case 'cartao_credito': return <CreditCard {...props} />;
      default: return <Landmark {...props} />;
    }
  };

  const getAccountTypeName = (type) => {
    const types = {
      banco: "CONTA BANCÁRIA",
      carteira: "CARTEIRA",
      cartao_credito: "CARTÃO DE CRÉDITO",
      poupanca: "POUPANÇA",
      investimento: "INVESTIMENTO",
      outros_ativos: "OUTROS ATIVOS",
      outros_passivos: "OUTROS PASSIVOS",
    };
    return types[type] || type.replace('_', ' ').toUpperCase();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const calculateCurrentInvoice = (account) => {
    if (account.type !== 'cartao_credito' || !account.closing_day) return 0;

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const currentDay = today.getDate();
    const closingDay = account.closing_day;

    // Conforme regra do FIX: inicia sempre no dia (closingDay + 1) do mês anterior
    const startDate = new Date(today.getFullYear(), today.getMonth() - 1, closingDay + 1);
    startDate.setHours(0, 0, 0, 0);

    const invoiceTransactions = transactions.filter(t => {
      const txDate = new Date(t.date + 'T00:00:00');
      const amount = parseFloat(t.amount);
      return (
        t.account_id === account.id &&
        txDate >= startDate &&
        txDate <= today &&
        amount < 0
      );
    });

    return invoiceTransactions.reduce((acc, t) => acc + Math.abs(parseFloat(t.amount)), 0);
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setIsAccountModalOpen(true);
    setIsDetailsOpen(false);
  };

  const handleDelete = (id) => {
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/accounts/${deleteTarget}`);
      toast.success('Conta excluída!');
      setIsDetailsOpen(false);
      fetchAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
      const detail = error.response?.data?.detail || 'Erro ao excluir conta.';
      toast.error(detail);
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
    } catch (error) {
      console.error('Error setting default account:', error);
      toast.error('Erro ao definir conta padrão.');
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contas e Carteiras</h1>
          <p className="text-muted-foreground mt-1">Organize onde seu dinheiro está guardado.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setIsTransferModalOpen(true)}
            className="rounded-xl"
          >
            <ArrowLeftRight className="mr-2 h-4 w-4" /> Transferir
          </Button>
          <Button
            onClick={() => {
              setEditingAccount(null);
              setIsAccountModalOpen(true);
            }}
            className="rounded-xl shadow-lg shadow-primary/20"
          >
            <Plus className="mr-2 h-5 w-5" /> Nova Conta
          </Button>
        </div>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl border-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta conta? Todas as transações vinculadas perderão o vínculo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))
        ) : accounts.length > 0 ? (
          accounts.map((account) => (
            <Card
              key={account.id}
              onClick={() => {
                setSelectedAccount(account);
                setIsDetailsOpen(true);
              }}
              className="group border-none shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden cursor-pointer"
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary group-hover:scale-110 transition-transform duration-300">
                      {getAccountIcon(account.type)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{account.name}</h3>
                      <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider mt-1">
                        {account.type.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className={cn(
                              "h-8 w-8 rounded-full",
                              account.is_default ? "text-yellow-500 cursor-default hover:bg-transparent" : "text-muted-foreground/30 hover:text-yellow-500"
                            )}
                            onClick={(e) => !account.is_default && handleSetDefault(e, account.id)}
                          >
                            <Star size={18} fill={account.is_default ? "currentColor" : "none"} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{account.is_default ? "Conta padrão" : "Definir como padrão"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {account.type === 'cartao_credito' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg h-8 text-[10px] font-bold uppercase tracking-wider"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAccount(account);
                          setIsPaymentModalOpen(true);
                        }}
                      >
                        <Receipt size={14} className="mr-1" /> Pagar Fatura
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                      {account.type === 'cartao_credito' ? 'Saldo Devedor' : 'Saldo Disponível'}
                    </p>
                    <div className={cn(
                      "text-2xl font-black mt-1",
                      account.balance >= 0 ? "text-success" : "text-destructive"
                    )}>
                      <PrivateValue value={formatCurrency(account.balance)} />
                    </div>
                  </div>

                  {account.type === 'cartao_credito' && account.closing_day && (
                    <div className="pt-2 border-t border-dashed">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Fatura Atual</p>
                      <p className="text-lg font-bold text-destructive">
                        <PrivateValue value={formatCurrency(calculateCurrentInvoice(account))} />
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : null}
      </div>

      {!loading && accounts.length === 0 && (
        <div className="col-span-full">
          <EmptyState
            icon={Landmark}
            title="Nenhuma conta"
            description="Você ainda não cadastrou nenhuma conta ou carteira para gerenciar seus saldos."
            actionLabel="Nova Conta"
            onAction={() => {
              setEditingAccount(null);
              setIsAccountModalOpen(true);
            }}
          />
        </div>
      )}

      <Dialog open={isAccountModalOpen} onOpenChange={setIsAccountModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingAccount ? "Editar Conta" : "Nova Conta"}</DialogTitle>
          </DialogHeader>
          <AccountForm
            account={editingAccount}
            onAccountCreated={fetchAccounts}
            onClose={() => {
              setIsAccountModalOpen(false);
              setEditingAccount(null);
            }}
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
        <DialogContent className="max-w-md rounded-2xl">
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

      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="w-[320px] sm:w-[320px] p-0 border-l border-border/50">
          {selectedAccount && (
            <div className="flex flex-col h-full">
              <SheetHeader className="p-6 pb-0">
                <div className="flex items-center gap-2 text-muted-foreground mb-4">
                  {getAccountIcon(selectedAccount.type, 18)}
                  <span className="text-[10px] font-bold tracking-widest uppercase">
                    {getAccountTypeName(selectedAccount.type)}
                  </span>
                </div>
                <SheetTitle className="text-2xl font-black leading-tight">
                  {selectedAccount.name}
                </SheetTitle>
              </SheetHeader>

              <div className="flex-1 px-6 pt-8 overflow-y-auto">
                <div className="bg-primary/5 rounded-3xl p-6 mb-8 border border-primary/10">
                  <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest mb-1">
                    {selectedAccount.type === 'cartao_credito' ? 'Saldo Devedor' : 'Saldo Atual'}
                  </p>
                  <div className={cn(
                    "text-3xl font-black tracking-tight",
                    selectedAccount.balance >= 0 ? "text-success" : "text-destructive"
                  )}>
                    <PrivateValue value={formatCurrency(selectedAccount.balance)} />
                  </div>

                  {selectedAccount.type === 'cartao_credito' && selectedAccount.closing_day && (
                    <div className="mt-4 pt-4 border-t border-primary/10">
                      <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest mb-1">Fatura Atual</p>
                      <div className="text-xl font-bold text-destructive tracking-tight">
                        <PrivateValue value={formatCurrency(calculateCurrentInvoice(selectedAccount))} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Info size={12} /> Informações
                    </h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-secondary/20 p-3 rounded-xl">
                        <span className="text-xs text-muted-foreground font-medium">Nome de exibição</span>
                        <span className="text-xs font-bold">{selectedAccount.name}</span>
                      </div>
                      <div className="flex justify-between items-center bg-secondary/20 p-3 rounded-xl">
                        <span className="text-xs text-muted-foreground font-medium">Saldo inicial</span>
                        <span className="text-xs font-bold">{formatCurrency(selectedAccount.initial_balance)}</span>
                      </div>

                      {selectedAccount.type === 'cartao_credito' && (
                        <>
                          {selectedAccount.credit_limit && (
                            <div className="flex justify-between items-center bg-secondary/20 p-3 rounded-xl">
                              <span className="text-xs text-muted-foreground font-medium">Limite total</span>
                              <span className="text-xs font-bold">{formatCurrency(selectedAccount.credit_limit)}</span>
                            </div>
                          )}
                          {selectedAccount.closing_day && (
                            <div className="flex justify-between items-center bg-secondary/20 p-3 rounded-xl">
                              <span className="text-xs text-muted-foreground font-medium">Dia de fechamento</span>
                              <span className="text-xs font-bold">{selectedAccount.closing_day}</span>
                            </div>
                          )}
                          {selectedAccount.due_day && (
                            <div className="flex justify-between items-center bg-secondary/20 p-3 rounded-xl">
                              <span className="text-xs text-muted-foreground font-medium">Dia de vencimento</span>
                              <span className="text-xs font-bold">{selectedAccount.due_day}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-secondary/10 border-t border-border/50 flex flex-col gap-3">
                {selectedAccount.type === 'cartao_credito' && (
                  <Button
                    onClick={() => setIsPaymentModalOpen(true)}
                    variant="outline"
                    className="w-full rounded-xl h-12 font-bold text-primary border-primary/20 hover:bg-primary/5 mb-2"
                  >
                    <Receipt size={16} className="mr-2" /> Pagar Fatura
                  </Button>
                )}
                <Button
                  onClick={() => handleEdit(selectedAccount)}
                  className="w-full rounded-xl h-12 font-bold shadow-sm"
                >
                  <Pencil size={16} className="mr-2" /> Editar Conta
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDelete(selectedAccount.id)}
                  className="w-full rounded-xl h-12 font-bold text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/20"
                >
                  <Trash2 size={16} className="mr-2" /> Excluir Conta
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Contas;
