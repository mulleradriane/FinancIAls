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
import { Card } from '@/components/ui/card';

const RecurringExpenseForm = ({ categories = [], accounts = [], onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
    displayAmount: '',
    date: new Date().toISOString().split('T')[0],
    categoryId: '',
    accountId: accounts.length > 0 ? accounts[0].id : '',
    type: 'subscription', // 'subscription' or 'installment'
    frequency: 'monthly', // for subscription
    totalInstallments: '', // for installment
  });

  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value === '') {
      setFormData(prev => ({ ...prev, amount: 0, displayAmount: '' }));
      return;
    }
    const intValue = parseInt(value, 10);
    const floatValue = intValue / 100;

    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(floatValue);

    setFormData(prev => ({ ...prev, amount: floatValue, displayAmount: formatted }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || !formData.categoryId || !formData.accountId) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    if (formData.type === 'installment' && !formData.totalInstallments) {
        toast.error("Por favor, informe o número de parcelas.");
        return;
    }

    try {
      const selectedCategory = categories.find(c => c.id === formData.categoryId);
      const nature = selectedCategory?.type === 'income' ? 'INCOME' : 'EXPENSE';

      const payload = {
        description: formData.description,
        amount: formData.amount,
        nature: nature,
        date: formData.date,
        category_id: formData.categoryId,
        account_id: formData.accountId,
        is_recurring: true,
        recurring_type: formData.type,
        total_installments: formData.type === 'installment' ? parseInt(formData.totalInstallments) : null,
        frequency: formData.type === 'subscription' ? formData.frequency : null,
      };

      await api.post('/transactions/', payload);
      toast.success('Recorrência criada com sucesso!');
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error saving recurring expense:', error);
      const detail = error.response?.data?.detail || 'Erro ao salvar recorrência.';
      toast.error(detail);
    }
  };

  const formatCurrencySimple = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="description">Descrição</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Ex: Netflix, Aluguel, Parcela do Carro"
            className="bg-secondary/50 border-none h-11 rounded-xl"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="amount">Valor {formData.type === 'installment' ? 'Total' : 'Mensal'}</Label>
            <Input
              id="amount"
              type="text"
              placeholder="R$ 0,00"
              value={formData.displayAmount}
              onChange={handleAmountChange}
              required
              className="bg-secondary/50 border-none h-11 rounded-xl text-lg font-semibold"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="date">Data de Início</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              required
              className="bg-secondary/50 border-none h-11 rounded-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="category">Categoria</Label>
            <Select
              value={formData.categoryId}
              onValueChange={(val) => setFormData(prev => ({ ...prev, categoryId: val }))}
              required
            >
              <SelectTrigger id="category" className="bg-secondary/50 border-none h-11 rounded-xl">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {categories
                  .filter(cat => cat.is_system === false && !['investimento', 'investimentos'].includes(cat.name.toLowerCase()))
                  .map((cat) => (
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
            <Select
              value={formData.accountId}
              onValueChange={(val) => setFormData(prev => ({ ...prev, accountId: val }))}
              required
            >
              <SelectTrigger id="account" className="bg-secondary/50 border-none h-11 rounded-xl">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {(accounts || []).map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} ({formatCurrencySimple(acc.balance)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="bg-secondary/20 border-dashed p-4 space-y-4 rounded-xl">
          <div className="grid gap-2">
            <Label htmlFor="type">Tipo de Recorrência</Label>
            <Select
              value={formData.type}
              onValueChange={(val) => setFormData(prev => ({ ...prev, type: val }))}
            >
              <SelectTrigger className="bg-background border-none h-10 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="subscription">Assinatura / Fixo</SelectItem>
                <SelectItem value="installment">Parcelamento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.type === 'installment' ? (
            <div className="grid gap-2">
              <Label htmlFor="totalInstallments">Número Total de Parcelas</Label>
              <Input
                id="totalInstallments"
                type="number"
                min="2"
                placeholder="Ex: 12"
                value={formData.totalInstallments}
                onChange={(e) => setFormData(prev => ({ ...prev, totalInstallments: e.target.value }))}
                required
                className="bg-background border-none h-10 rounded-lg"
              />
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="frequency">Frequência</Label>
              <Select
                value={formData.frequency}
                onValueChange={(val) => setFormData(prev => ({ ...prev, frequency: val }))}
              >
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
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" className="flex-1 rounded-xl h-12 text-base font-bold">
          Salvar Recorrência
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} className="flex-1 rounded-xl h-12 text-base">
          Cancelar
        </Button>
      </div>
    </form>
  );
};

export default RecurringExpenseForm;
