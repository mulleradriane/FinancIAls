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
import { Plus, ArrowLeftRight, CreditCard, Landmark, Wallet, PiggyBank, Briefcase, Pencil, Trash2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
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

const Contas = () => {
  const [accounts, setAccounts] = useState([]);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/accounts/');
      setAccounts(response.data);
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

  const handleEdit = (account) => {
    setEditingAccount(account);
    setIsAccountModalOpen(true);
    setIsDetailsOpen(false);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta conta? Todas as transações vinculadas perderão o vínculo.')) {
      try {
        await api.delete(`/accounts/${id}`);
        toast.success('Conta excluída!');
        setIsDetailsOpen(false);
        fetchAccounts();
      } catch (error) {
        console.error('Error deleting account:', error);
        const detail = error.response?.data?.detail || 'Erro ao excluir conta.';
        toast.error(detail);
      }
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
                </div>

                <div className="mt-6">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Saldo Disponível</p>
                  <div className={cn(
                    "text-2xl font-black mt-1",
                    account.balance >= 0 ? "text-success" : "text-destructive"
                  )}>
                    <PrivateValue value={formatCurrency(account.balance)} />
                  </div>
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

              <div className="flex-1 px-6 pt-8">
                <div className="bg-primary/5 rounded-3xl p-6 mb-8 border border-primary/10">
                  <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest mb-1">Saldo Atual</p>
                  <div className={cn(
                    "text-3xl font-black tracking-tight",
                    selectedAccount.balance >= 0 ? "text-success" : "text-destructive"
                  )}>
                    <PrivateValue value={formatCurrency(selectedAccount.balance)} />
                  </div>
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
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-secondary/10 border-t border-border/50 flex flex-col gap-3">
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
