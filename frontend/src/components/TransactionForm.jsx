import React, { useState, useEffect, useRef } from 'react';
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
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from '@/components/ui/card';

const TransactionForm = ({ categories = [], accounts = [], transaction, onTransactionCreated, onClose }) => {
  // LOG 1: Montagem do componente
  console.log('🔥 [MOUNT] TransactionForm montou', { 
    transactionId: transaction?.id,
    transactionExists: !!transaction,
    categoriesLength: categories.length,
    accountsLength: accounts.length,
    transactionData: transaction,
    timestamp: new Date().toISOString()
  });

  const descriptionRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [fullTransaction, setFullTransaction] = useState(transaction);
  
  // Função auxiliar para extrair IDs considerando diferentes possíveis nomes de campos
  const extractCategoryId = (trans) => {
    if (!trans) return '';
    // Tenta diferentes formas como o campo pode vir
    return trans.category_id || trans.categoryId || trans.category?.id || '';
  };

  const extractAccountId = (trans) => {
    if (!trans) return '';
    return trans.account_id || trans.accountId || trans.account?.id || '';
  };

  const [formData, setFormData] = useState({
    description: fullTransaction ? fullTransaction.description : '',
    amount: fullTransaction ? fullTransaction.amount : 0,
    displayAmount: fullTransaction ?
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fullTransaction.amount) : '',
    date: fullTransaction ? fullTransaction.date : new Date().toISOString().split('T')[0],
    categoryId: extractCategoryId(fullTransaction),
    accountId: extractAccountId(fullTransaction),
    isRecurring: false,
    recurring: {
      type: 'subscription',
      frequency: 'monthly',
      totalInstallments: '',
    }
  });

  // LOG 2: Estado inicial do formData
  console.log('📝 [INITIAL_STATE] formData inicial', {
    description: formData.description,
    categoryId: formData.categoryId,
    accountId: formData.accountId,
    amount: formData.amount,
    rawTransaction: fullTransaction
  });

  // EFEITO PARA BUSCAR A TRANSAÇÃO COMPLETA QUANDO FOR EDIÇÃO
  useEffect(() => {
    const fetchFullTransaction = async () => {
      if (transaction?.id && (!transaction.category_id || !transaction.account_id)) {
        setLoading(true);
        try {
          console.log('🔍 Buscando transação completa:', transaction.id);
          const response = await api.get(`/transactions/${transaction.id}`);
          const fullTrans = response.data;
          setFullTransaction(fullTrans);
          
          setFormData(prev => ({
            ...prev,
            description: fullTrans.description,
            amount: fullTrans.amount,
            displayAmount: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fullTrans.amount),
            date: fullTrans.date,
            categoryId: extractCategoryId(fullTrans),
            accountId: extractAccountId(fullTrans)
          }));
          
          console.log('✅ Transação completa carregada:', fullTrans);
        } catch (error) {
          console.error('Erro ao buscar transação completa:', error);
          toast.error('Erro ao carregar dados da transação');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchFullTransaction();
  }, [transaction]);

  const [suggestions, setSuggestions] = useState([]);
  const [openSuggestions, setOpenSuggestions] = useState(false);

  // LOG 3: Efeito para quando fullTransaction/categories/accounts mudam
  useEffect(() => {
    console.log('🔄 [DEPENDENCY_CHANGE] fullTransaction, categories ou accounts mudaram', {
      fullTransaction: fullTransaction ? {
        id: fullTransaction.id,
        category_id: fullTransaction.category_id,
        categoryId: fullTransaction.categoryId,
        account_id: fullTransaction.account_id,
        accountId: fullTransaction.accountId,
        description: fullTransaction.description
      } : null,
      categoriesCount: categories.length,
      accountsCount: accounts.length,
      categoriesList: categories.map(c => ({ id: c.id, name: c.name })),
      accountsList: accounts.map(a => ({ id: a.id, name: a.name })),
      currentFormData: {
        categoryId: formData.categoryId,
        accountId: formData.accountId
      }
    });

    // TENTATIVA DE FIX: Força atualização do formData quando fullTransaction chega
    if (fullTransaction && categories.length > 0 && accounts.length > 0) {
      const categoryId = extractCategoryId(fullTransaction);
      const accountId = extractAccountId(fullTransaction);
      
      const categoryExists = categories.some(c => c.id === categoryId);
      const accountExists = accounts.some(a => a.id === accountId);
      
      console.log('🎯 [FIX_ATTEMPT] Verificando match', {
        extractedCategoryId: categoryId,
        extractedAccountId: accountId,
        categoryExists,
        accountExists,
        matchingCategory: categories.find(c => c.id === categoryId),
        matchingAccount: accounts.find(a => a.id === accountId),
        allCategoryIds: categories.map(c => c.id),
        allAccountIds: accounts.map(a => a.id)
      });

      // ATUALIZA O FORM COM OS IDs
      if (categoryId || accountId) {
        setFormData(prev => ({
          ...prev,
          categoryId: categoryId || prev.categoryId,
          accountId: accountId || prev.accountId
        }));
      }
    }
  }, [fullTransaction, categories, accounts]);

  useEffect(() => {
    if (!fullTransaction && accounts && accounts.length > 0 && !formData.accountId) {
      setFormData(prev => ({ ...prev, accountId: accounts[0].id }));
    }
    fetchSuggestions();

    // Auto-focus description
    const timer = setTimeout(() => {
      if (descriptionRef.current) descriptionRef.current.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [accounts, fullTransaction]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (descriptionRef.current && !descriptionRef.current.closest('.relative')?.contains(e.target)) {
        setOpenSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Simple intelligence matching
    if (!fullTransaction && formData.description.length >= 3) {
      const match = suggestions.find(s =>
        s.toLowerCase() === formData.description.toLowerCase() ||
        (formData.description.length >= 5 && s.toLowerCase().startsWith(formData.description.toLowerCase()))
      );
      if (match) {
        const timer = setTimeout(() => applySuggestion(match), 300);
        return () => clearTimeout(timer);
      }
    }
  }, [formData.description]);

  const fetchSuggestions = async () => {
    try {
      const response = await api.get('/transactions/descriptions/');
      setSuggestions(response.data || []);
    } catch (error) {
      console.error('Error fetching descriptions:', error);
    }
  };

  const applySuggestion = async (desc) => {
    if (!desc || fullTransaction) return;
    try {
      const response = await api.get(`/transactions/suggest/?description=${desc}`);
      if (response.data) {
        setFormData(prev => ({
          ...prev,
          categoryId: response.data.category_id || prev.categoryId,
          accountId: response.data.account_id || prev.accountId
        }));
      }
    } catch (error) {
      console.log('No suggestion found for this description');
    }
  };

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
    if (e) e.preventDefault();
    
    // LOG 4: Validação antes de submit
    console.log('✅ [SUBMIT] Validando formulário', {
      description: formData.description,
      amount: formData.amount,
      categoryId: formData.categoryId,
      accountId: formData.accountId,
      isEditing: !!fullTransaction
    });

    if (!formData.description || !formData.amount || !formData.categoryId || !formData.accountId) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
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
      };

      console.log('📤 [SUBMIT] Enviando payload', payload);

      let response;
      if (fullTransaction) {
        response = await api.put(`/transactions/${fullTransaction.id}`, payload);
      } else {
        const createPayload = {
          ...payload,
          is_recurring: formData.isRecurring,
          recurring_type: formData.isRecurring ? formData.recurring.type : null,
          total_installments: formData.isRecurring && formData.recurring.type === 'installment' ?
            parseInt(formData.recurring.totalInstallments) : null,
          frequency: formData.isRecurring && formData.recurring.type === 'subscription' ?
            formData.recurring.frequency : null,
        };
        response = await api.post('/transactions/', createPayload);
      }

      toast.success(fullTransaction ? 'Transação atualizada!' : 'Transação criada!');

      if (onTransactionCreated) onTransactionCreated(response.data);
      if (onClose) onClose();

    } catch (error) {
      console.error('❌ [SUBMIT] Erro:', error);
      const detail = error.response?.data?.detail || 'Erro ao salvar transação.';
      toast.error(detail);
    }
  };

  const formatCurrencySimple = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const filteredSuggestions = suggestions.filter(s =>
    s.toLowerCase().includes(formData.description.toLowerCase())
  );

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && onClose) {
      onClose();
    }
  };

  // LOG 5: Renderização
  console.log('🖼️ [RENDER] TransactionForm renderizando', {
    transactionId: fullTransaction?.id,
    loading,
    formData: {
      description: formData.description,
      categoryId: formData.categoryId,
      accountId: formData.accountId
    },
    categoriesAvailable: categories.length,
    accountsAvailable: accounts.length
  });

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="space-y-4">
          <div className="h-12 bg-muted animate-pulse rounded" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-12 bg-muted animate-pulse rounded" />
            <div className="h-12 bg-muted animate-pulse rounded" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-12 bg-muted animate-pulse rounded" />
            <div className="h-12 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 outline-none"
      onKeyDown={handleKeyDown}
    >
      <div className="space-y-4">
        <div className="grid gap-2 relative">
          <Label htmlFor="description">Descrição</Label>
          <div className="relative">
            <Input
              id="description"
              ref={descriptionRef}
              value={formData.description}
              onChange={(e) => {
                const val = e.target.value;
                setFormData(prev => ({ ...prev, description: val }));
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

          {openSuggestions && formData.description && filteredSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover text-popover-foreground rounded-xl border shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
              <Command className="bg-transparent">
                <CommandList>
                  <CommandGroup heading="Sugestões">
                    {filteredSuggestions.map((s) => (
                      <CommandItem
                        key={s}
                        value={s}
                        onSelect={() => {
                          setFormData(prev => ({ ...prev, description: s }));
                          applySuggestion(s);
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
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="amount">Valor</Label>
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
            <Label htmlFor="date">Data</Label>
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
            {categories.length > 0 ? (
              <Select
                value={formData.categoryId}
                onValueChange={(val) => {
                  console.log('📌 [CATEGORY_CHANGE]', val);
                  setFormData(prev => ({ ...prev, categoryId: val }));
                }}
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
            ) : (
              <div className="h-11 rounded-xl bg-secondary/50 animate-pulse" />
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="account">Conta</Label>
            {accounts.length > 0 ? (
              <Select
                value={formData.accountId}
                onValueChange={(val) => {
                  console.log('📌 [ACCOUNT_CHANGE]', val);
                  setFormData(prev => ({ ...prev, accountId: val }));
                }}
                required
              >
                <SelectTrigger id="account" className="bg-secondary/50 border-none h-11 rounded-xl text-left">
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
            ) : (
              <div className="h-11 rounded-xl bg-secondary/50 animate-pulse" />
            )}
          </div>
        </div>

        {!fullTransaction && (
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="recurring"
              checked={formData.isRecurring}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isRecurring: checked === true }))}
            />
            <Label
              htmlFor="recurring"
              className="text-sm font-medium leading-none cursor-pointer"
            >
              É uma despesa recorrente ou parcelada?
            </Label>
          </div>
        )}

        {formData.isRecurring && !fullTransaction && (
          <Card className="bg-secondary/20 border-dashed p-4 space-y-4 rounded-xl animate-in zoom-in-95 duration-200">
            <div className="grid gap-2">
              <Label htmlFor="recurringType">Tipo</Label>
              <Select
                value={formData.recurring.type}
                onValueChange={(val) => setFormData(prev => ({
                  ...prev,
                  recurring: { ...prev.recurring, type: val }
                }))}
              >
                <SelectTrigger className="bg-background border-none h-10 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subscription">Assinatura Mensal</SelectItem>
                  <SelectItem value="installment">Parcelamento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.recurring.type === 'installment' ? (
              <div className="grid gap-2">
                <Label htmlFor="totalInstallments">Número de Parcelas</Label>
                <Input
                  id="totalInstallments"
                  type="number"
                  min="2"
                  value={formData.recurring.totalInstallments}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    recurring: { ...prev.recurring, totalInstallments: e.target.value }
                  }))}
                  required
                  className="bg-background border-none h-10 rounded-lg"
                />
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="frequency">Frequência</Label>
                <Select
                  value={formData.recurring.frequency}
                  onValueChange={(val) => setFormData(prev => ({
                    ...prev,
                    recurring: { ...prev.recurring, frequency: val }
                  }))}
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
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          className="flex-1 rounded-xl h-12 text-base font-bold shadow-lg shadow-primary/20"
        >
          {fullTransaction ? 'Atualizar Transação' : 'Salvar Transação'}
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