import React, { useState } from 'react';
import api from '@/api/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

const AccountForm = ({ account, onAccountCreated, onClose }) => {
  const [name, setName] = useState(account ? account.name : '');
  const [type, setType] = useState(account ? account.type : 'banco');
  const [initialBalance, setInitialBalance] = useState(account ? account.initial_balance : 0);
  const [displayInitialBalance, setDisplayInitialBalance] = useState(account ?
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(account.initial_balance) : ''
  );
  const [initialBalanceDate, setInitialBalanceDate] = useState(
    account?.initial_balance_date || new Date().toISOString().split('T')[0]
  );
  const [currentBalance, setCurrentBalance] = useState(account ? account.balance : 0);
  const [displayCurrentBalance, setDisplayCurrentBalance] = useState(account ?
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(account.balance) : ''
  );
  const [isCurrentBalanceDirty, setIsCurrentBalanceDirty] = useState(false);

  const handleBalanceChange = (e, setVal, setDisplayVal, isCorrection = false) => {
    if (isCorrection) setIsCurrentBalanceDirty(true);
    const value = e.target.value.replace(/\D/g, '');
    if (value === '') {
      setDisplayVal('');
      setVal(0);
      return;
    }
    const intValue = parseInt(value, 10);
    setVal(intValue / 100);

    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(intValue / 100);

    setDisplayVal(formatted);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        type,
        initial_balance: parseFloat(initialBalance),
        initial_balance_date: initialBalanceDate,
      };

      if (account) {
        if (isCurrentBalanceDirty) {
          payload.current_balance = parseFloat(currentBalance);
        }
        await api.put(`/accounts/${account.id}`, payload);
      } else {
        await api.post('/accounts/', payload);
      }

      toast.success(account ? 'Conta atualizada!' : 'Conta criada!');
      if (onAccountCreated) onAccountCreated();
      if (onClose) onClose();
    } catch (error) {
      console.error('Error saving account:', error);
      const detail = error.response?.data?.detail || 'Erro ao salvar conta.';
      toast.error(detail);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-2">
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="accountName">Nome da Conta</Label>
          <Input
            id="accountName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Nubank, Carteira, Itaú..."
            required
            className="bg-secondary/30 border-none h-11 rounded-xl"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="accountType">Tipo de Conta</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="bg-secondary/30 border-none h-11 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="carteira">Carteira (Dinheiro)</SelectItem>
              <SelectItem value="banco">Banco (Corrente)</SelectItem>
              <SelectItem value="poupanca">Poupança</SelectItem>
              <SelectItem value="investimento">Investimento</SelectItem>
              <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="initialBalance">Saldo Inicial</Label>
            <Input
              id="initialBalance"
              type="text"
              placeholder="R$ 0,00"
              value={displayInitialBalance}
              onChange={(e) => handleBalanceChange(e, setInitialBalance, setDisplayInitialBalance)}
              className="bg-secondary/30 border-none h-11 rounded-xl font-semibold"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="initialBalanceDate">Data Inicial</Label>
            <Input
              id="initialBalanceDate"
              type="date"
              value={initialBalanceDate}
              onChange={(e) => setInitialBalanceDate(e.target.value)}
              className="bg-secondary/30 border-none h-11 rounded-xl"
              required
            />
          </div>
        </div>

        {account && (
          <div className="space-y-3 pt-2 border-t border-dashed">
            <div className="grid gap-2">
              <Label htmlFor="currentBalance" className="text-primary font-bold">Saldo Atual (Correção)</Label>
              <Input
                id="currentBalance"
                type="text"
                placeholder="R$ 0,00"
                value={displayCurrentBalance}
                onChange={(e) => handleBalanceChange(e, setCurrentBalance, setDisplayCurrentBalance, true)}
                className="bg-primary/5 border-primary/20 h-11 rounded-xl font-bold text-lg text-primary"
              />
            </div>
            <Alert className="bg-primary/5 border-none rounded-xl">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-xs text-muted-foreground">
                Alterar o saldo atual gerará automaticamente uma transação de ajuste operacional.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" className="flex-1 rounded-xl h-12 font-bold shadow-lg shadow-primary/20">
          Salvar Conta
        </Button>
        <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-12 rounded-xl">
          Cancelar
        </Button>
      </div>
    </form>
  );
};

export default AccountForm;
