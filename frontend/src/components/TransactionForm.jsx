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
import { Check, ChevronsUpDown, CalendarIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const TransactionForm = ({ categories, accounts, transaction, onTransactionCreated, onClose }) => {
  const [description, setDescription] = useState(transaction ? transaction.description : '');
  const [suggestions, setSuggestions] = useState([]);
  const [openCommand, setOpenCommand] = useState(false);

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

  const applySuggestion = async (desc) => {
    if (!desc || transaction) return;
    try {
      const response = await api.get(`/transactions/suggest/?description=${desc}`);
      if (response.data) {
        if (response.data.category_id) setCategoryId(response.data.category_id);
        if (response.data.account_id) setAccountId(response.data.account_id);
      }
    } catch (error) {
      console.log('No suggestion found for this description');
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="description">Descrição</Label>
          <Popover open={openCommand} onOpenChange={setOpenCommand}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openCommand}
                className="justify-between bg-secondary/50 border-none h-11 rounded-xl"
              >
                {description || "O que foi comprado?"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
              <Command>
                <CommandInput
                  placeholder="Procurar descrição..."
                  value={description}
                  onValueChange={(val) => {
                    setDescription(val);
                  }}
                />
                <CommandList>
                  <CommandEmpty>
                    <div
                      className="px-2 py-3 text-sm cursor-pointer hover:bg-accent"
                      onClick={() => {
                        applySuggestion(description);
                        setOpenCommand(false);
                      }}
                    >
                      Usar "{description}"
                    </div>
                  </CommandEmpty>
                  <CommandGroup>
                    {suggestions.map((s) => (
                      <CommandItem
                        key={s}
                        value={s}
                        onSelect={() => {
                          setDescription(s);
                          applySuggestion(s);
                          setOpenCommand(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            description === s ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {s}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
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
