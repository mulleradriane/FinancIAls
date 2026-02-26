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
import { Plus, ArrowLeftRight, CreditCard, Landmark, Wallet, PiggyBank, Briefcase, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import PrivateValue from '@/components/ui/PrivateValue';

const Contas = () => {
  const [accounts, setAccounts] = useState([]);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
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

  const getAccountIcon = (type) => {
    const props = { size: 24 };
    switch (type) {
      case 'carteira': return <Wallet {...props} />;
      case 'banco': return <Landmark {...props} />;
      case 'poupanca': return <PiggyBank {...props} />;
      case 'investimento': return <Briefcase {...props} />;
      case 'cartao_credito': return <CreditCard {...props} />;
      default: return <Landmark {...props} />;
    }
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
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta conta? Todas as transações vinculadas perderão o vínculo.')) {
      try {
        await api.delete(`/accounts/${id}`);
        toast.success('Conta excluída!');
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
              className="group border-none shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden"
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
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(account)}
                      className="h-8 w-8 rounded-full"
                    >
                      <Pencil size={14} className="text-primary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(account.id)}
                      className="h-8 w-8 rounded-full"
                    >
                      <Trash2 size={14} className="text-destructive" />
                    </Button>
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
    </div>
  );
};

export default Contas;
