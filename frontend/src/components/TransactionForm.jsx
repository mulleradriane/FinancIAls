import React, { useState, useEffect } from 'react';
import api from '@/api/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, CalendarIcon, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const TransactionForm = ({ categories, accounts, transaction, onTransactionCreated, onClose }) => {
  const [description, setDescription] = useState(transaction ? transaction.description : '');
  const [suggestions, setSuggestions] = useState([]);
  const [openSuggestions, setOpenSuggestions] = useState(false);

  const [amount, setAmount] = useState(transaction ? transaction.amount : 0);
  const [displayAmount, setDisplayAmount] = useState(transaction ?
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.amount) : ''
  );
  const [date, setDate] = useState(transaction ? transaction.date : new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState(transaction ? transaction.category_id : '');
  const [accountId, setAccountId] = useState(transaction ? transaction.account_id : '');

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState('subscription');
  const [totalInstallments, setTotalInstallments] = useState('');
  const [frequency, setFrequency] = useState('monthly');

  useEffect(() => {
    if (!transaction && accounts && accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
    fetchSuggestions();
  }, [accounts, transaction]);

  const fetchSuggestions = async () => {
    try {
      const response = await api.get('/transactions/descriptions/');
      setSuggestions(response.data);
    } catch (error) {
      console.error('Error fetching descriptions:', error);
    }
  };

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
    try {
      const payload = {
        description,
        amount: amount,
        date,
        category_id: categoryId,
        account_id: accountId,
      };

      if (transaction) {
        await api.put(`/transactions/${transaction.id}`, payload);
      } else {
        const createPayload = {
          ...payload,
          is_recurring: isRecurring,
          recurring_type: isRecurring ? recurringType : null,
          total_installments: isRecurring && recurringType === 'installment' ? parseInt(totalInstallments) : null,
          frequency: isRecurring && recurringType === 'subscription' ? frequency : null,
        };
        await api.post('/transactions/', createPayload);
      }

      toast.success(transaction ? 'Transação atualizada!' : 'Transação criada!');
      if (onTransactionCreated) onTransactionCreated();
      if (onClose) onClose();
    } catch (error) {
      console.error('Error saving transaction:', error);
      const detail = error.response?.data?.detail || 'Erro ao salvar transação.';
      toast.error(detail);
    }
  };

  const formatCurrencySimple = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const filteredSuggestions = suggestions.filter(s =>
    s.toLowerCase().includes(description.toLowerCase())
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="grid gap-2 relative">
          <Label htmlFor="description">Descrição</Label>
          <div className="relative">
            <Input
              id="description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setOpenSuggestions(true);
              }}
              onFocus={() => setOpenSuggestions(true)}
              placeholder="O que foi comprado?"
              className="bg-secondary/50 border-none h-11 rounded-xl pr-10"
              autoComplete="off"
              required
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40">
              <Search size={18} />
            </div>
          </div>

          {openSuggestions && description && filteredSuggestions.length > 0 && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setOpenSuggestions(false)}
              />
              <div className="absolute top-[calc(100%+4px)] left-0 w-full z-50 bg-popover text-popover-foreground rounded-xl border shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
                <Command className="bg-transparent">
                  <CommandList>
                    <CommandGroup heading="Sugestões">
                      {filteredSuggestions.map((s) => (
                        <CommandItem
                          key={s}
                          value={s}
                          onSelect={() => {
                            setDescription(s);
                            setOpenSuggestions(false);
                          }}
                          className="cursor-pointer py-3"
                        >
                          {s}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="amount">Valor</Label>
            <Input
              id="amount"
              type="text"
              placeholder="R$ 0,00"
              value={displayAmount}
              onChange={handleAmountChange}
              required
              className="bg-secondary/50 border-none h-11 rounded-xl text-lg font-semibold"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="bg-secondary/50 border-none h-11 rounded-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="category">Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId} required>
              <SelectTrigger className="bg-secondary/50 border-none h-11 rounded-xl">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <span>{cat.icon || '💰'}</span>
                      <span>{cat.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="account">Conta</Label>
            <Select value={accountId} onValueChange={setAccountId} required>
              <SelectTrigger className="bg-secondary/50 border-none h-11 rounded-xl text-left">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} ({formatCurrencySimple(acc.balance)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!transaction && (
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="recurring"
              checked={isRecurring}
              onCheckedChange={setIsRecurring}
            />
            <Label
              htmlFor="recurring"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              É uma despesa recorrente ou parcelada?
            </Label>
          </div>
        )}

        {isRecurring && !transaction && (
          <Card className="bg-secondary/20 border-dashed p-4 space-y-4 rounded-xl">
            <div className="grid gap-2">
              <Label htmlFor="recurringType">Tipo</Label>
              <Select value={recurringType} onValueChange={setRecurringType}>
                <SelectTrigger className="bg-background border-none h-10 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subscription">Assinatura Mensal</SelectItem>
                  <SelectItem value="installment">Parcelamento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {recurringType === 'installment' ? (
              <div className="grid gap-2">
                <Label htmlFor="totalInstallments">Número de Parcelas</Label>
                <Input
                  id="totalInstallments"
                  type="number"
                  min="2"
                  value={totalInstallments}
                  onChange={(e) => setTotalInstallments(e.target.value)}
                  required
                  className="bg-background border-none h-10 rounded-lg"
                />
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="frequency">Frequência</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger className="bg-background border-none h-10 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </Card>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          className="flex-1 rounded-xl h-12 text-base font-bold shadow-lg shadow-primary/20"
        >
          {transaction ? 'Atualizar Transação' : 'Salvar Transação'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          className="flex-1 rounded-xl h-12 text-base"
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
};

export default TransactionForm;
