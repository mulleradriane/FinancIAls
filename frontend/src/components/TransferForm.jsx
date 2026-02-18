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
import { ArrowRightLeft } from 'lucide-react';

const TransferForm = ({ accounts, onTransferCreated, onClose }) => {
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value === '') {
      setDisplayAmount('');
      setAmount(0);
      return;
    }
    const intValue = parseInt(value, 10);
    setAmount(intValue / 100);

    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(intValue / 100);

    setDisplayAmount(formatted);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fromAccountId || !toAccountId) {
      toast.error('Selecione as contas de origem e destino.');
      return;
    }
    if (fromAccountId === toAccountId) {
      toast.error('Contas de origem e destino devem ser diferentes.');
      return;
    }
    try {
      const payload = {
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        amount: amount,
        date,
        description,
      };
      await api.post('/transfers/', payload);
      toast.success('Transferência realizada!');
      if (onTransferCreated) onTransferCreated();
      if (onClose) onClose();
    } catch (error) {
      console.error('Error creating transfer:', error);
      const detail = error.response?.data?.detail || 'Erro ao realizar transferência.';
      toast.error(detail);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-2">
      <div className="flex items-center gap-4 bg-secondary/20 p-4 rounded-2xl border border-dashed border-primary/20">
        <div className="flex-1 space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground ml-1">Origem</Label>
          <Select value={fromAccountId} onValueChange={setFromAccountId} required>
            <SelectTrigger className="bg-background border-none h-11 rounded-xl">
              <SelectValue placeholder="De..." />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="pt-6">
          <div className="p-2 bg-primary/10 rounded-full text-primary">
            <ArrowRightLeft size={16} />
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground ml-1">Destino</Label>
          <Select value={toAccountId} onValueChange={setToAccountId} required>
            <SelectTrigger className="bg-background border-none h-11 rounded-xl">
              <SelectValue placeholder="Para..." />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="transferAmount">Valor</Label>
          <Input
            id="transferAmount"
            type="text"
            placeholder="R$ 0,00"
            value={displayAmount}
            onChange={handleAmountChange}
            required
            className="bg-secondary/30 border-none h-11 rounded-xl font-semibold text-lg"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="transferDate">Data</Label>
          <Input
            id="transferDate"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="bg-secondary/30 border-none h-11 rounded-xl"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="transferDescription">Descrição (Opcional)</Label>
        <Input
          id="transferDescription"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Transferência para reserva..."
          className="bg-secondary/30 border-none h-11 rounded-xl"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" className="flex-1 rounded-xl h-12 font-bold shadow-lg shadow-primary/20">
          Confirmar Transferência
        </Button>
        <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-12 rounded-xl">
          Cancelar
        </Button>
      </div>
    </form>
  );
};

export default TransferForm;
