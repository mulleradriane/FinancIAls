import React, { useState, useEffect } from 'react';
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
import { CreditCard, Wallet } from 'lucide-react';

const InvoicePaymentForm = ({ creditCard, invoiceAmount, accounts, onPaymentConfirmed, onClose }) => {
  const [debitAccountId, setDebitAccountId] = useState('');
  const [displayAmount, setDisplayAmount] = useState(
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoiceAmount)
  );
  const [amount, setAmount] = useState(invoiceAmount);

  const getDefaultDate = () => {
    const today = new Date();
    const currentDay = today.getDate();
    const dueDay = creditCard.due_day || currentDay;

    let targetDate;
    if (currentDay > dueDay) {
      // Próximo mês
      targetDate = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
    } else {
      // Mês atual
      targetDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
    }
    return targetDate.toISOString().split('T')[0];
  };

  const [date, setDate] = useState(getDefaultDate());

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
    if (!debitAccountId) {
      toast.error('Selecione uma conta de débito.');
      return;
    }

    try {
      // Calculate invoice month/year (closing month)
      const paymentDate = new Date(date + 'T00:00:00');
      const closingDay = creditCard.closing_day || creditCard.due_day;

      let invoiceMonth, invoiceYear;
      if (paymentDate.getDate() > closingDay) {
          // Referente ao mês atual
          invoiceMonth = paymentDate.getMonth();
          invoiceYear = paymentDate.getFullYear();
      } else {
          // Referente ao mês anterior
          const refDate = new Date(paymentDate.getFullYear(), paymentDate.getMonth() - 1, 1);
          invoiceMonth = refDate.getMonth();
          invoiceYear = refDate.getFullYear();
      }

      const months = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
      ];

      const description = `Pagamento Fatura ${creditCard.name} - ${months[invoiceMonth]}/${invoiceYear}`;

      const payload = {
        description,
        amount: amount,
        date: date,
        from_account_id: debitAccountId,
        to_account_id: creditCard.id,
      };

      await api.post('/transactions/transfer', payload);
      toast.success('Pagamento de fatura realizado!');
      if (onPaymentConfirmed) onPaymentConfirmed();
      if (onClose) onClose();
    } catch (error) {
      console.error('Error paying invoice:', error);
      const detail = error.response?.data?.detail || 'Erro ao realizar pagamento.';
      toast.error(detail);
    }
  };

  const debitAccounts = accounts.filter(acc => acc.type === 'banco' || acc.type === 'poupanca');

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-2">
      <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-xl text-primary">
          <CreditCard size={24} />
        </div>
        <div>
          <p className="text-xs font-bold text-primary/60 uppercase tracking-widest">Pagar Fatura de</p>
          <h3 className="font-bold text-lg">{creditCard.name}</h3>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="debitAccount">Conta de débito</Label>
          <Select value={debitAccountId} onValueChange={setDebitAccountId} required>
            <SelectTrigger className="bg-secondary/30 border-none h-11 rounded-xl">
              <SelectValue placeholder="Selecione a conta..." />
            </SelectTrigger>
            <SelectContent>
              {debitAccounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="paymentAmount">Valor do Pagamento</Label>
            <Input
              id="paymentAmount"
              type="text"
              placeholder="R$ 0,00"
              value={displayAmount}
              onChange={handleAmountChange}
              required
              className="bg-secondary/30 border-none h-11 rounded-xl font-semibold text-lg"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="paymentDate">Data</Label>
            <Input
              id="paymentDate"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="bg-secondary/30 border-none h-11 rounded-xl"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" className="flex-1 rounded-xl h-12 font-bold shadow-lg shadow-primary/20">
          Confirmar Pagamento
        </Button>
        <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-12 rounded-xl">
          Cancelar
        </Button>
      </div>
    </form>
  );
};

export default InvoicePaymentForm;
