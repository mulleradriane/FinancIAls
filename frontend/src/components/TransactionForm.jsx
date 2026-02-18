import React, { useState } from 'react';
import api from '../api/api';
import { toast } from 'react-toastify';

const TransactionForm = ({ categories, accounts, transaction, onTransactionCreated, onClose }) => {
  const [description, setDescription] = useState(transaction ? transaction.description : '');
  const [amount, setAmount] = useState(transaction ? transaction.amount : 0);
  const [displayAmount, setDisplayAmount] = useState(transaction ?
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(transaction.amount) : ''
  );
  const [date, setDate] = useState(transaction ? transaction.date : new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState(transaction ? transaction.category_id : '');
  const [accountId, setAccountId] = useState(transaction ? transaction.account_id : (accounts && accounts.length > 0 ? accounts[0].id : ''));

  React.useEffect(() => {
    if (!transaction && accounts && accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, transaction, accountId]);

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState('subscription');
  const [totalInstallments, setTotalInstallments] = useState('');
  const [frequency, setFrequency] = useState('monthly');

  const handleDescriptionBlur = async () => {
    if (!description || transaction) return;

    try {
      const response = await api.get(`/transactions/suggest/?description=${description}`);
      if (response.data) {
        if (response.data.category_id) setCategoryId(response.data.category_id);
        if (response.data.account_id) setAccountId(response.data.account_id);
      }
    } catch (error) {
      // Ignore 404s, just means no suggestion found
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
      if (transaction) {
        const payload = {
          description,
          amount: amount,
          date,
          category_id: categoryId,
          account_id: accountId,
        };
        await api.put(`/transactions/${transaction.id}`, payload);
      } else {
        const payload = {
          description,
          amount: amount,
          date,
          category_id: categoryId,
          account_id: accountId,
          is_recurring: isRecurring,
          recurring_type: isRecurring ? recurringType : null,
          total_installments: isRecurring && recurringType === 'installment' ? parseInt(totalInstallments) : null,
          frequency: isRecurring && recurringType === 'subscription' ? frequency : null,
        };
        await api.post('/transactions/', payload);
      }

      // Reset form
      setDescription('');
      setDisplayAmount('');
      setAmount(0);
      setDate(new Date().toISOString().split('T')[0]);
      setCategoryId('');
      setIsRecurring(false);

      toast.success(transaction ? 'Transação atualizada!' : 'Transação criada!');
      if (onTransactionCreated) {
        onTransactionCreated();
      }
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      const detail = error.response?.data?.detail || 'Erro ao salvar transação.';
      toast.error(detail);
    }
  };

  return (
    <div className="transaction-form">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="description">Descrição:</label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleDescriptionBlur}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="amount">Valor:</label>
          <input
            id="amount"
            type="text"
            placeholder="R$ 0,00"
            value={displayAmount}
            onChange={handleAmountChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="date">Data:</label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="category">Categoria:</label>
          <select
            id="category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
          >
            <option value="">Selecione uma categoria</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="account">Conta/Carteira:</label>
          <select
            id="account"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            required
          >
            <option value="">Selecione uma conta</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(acc.balance)})
              </option>
            ))}
          </select>
        </div>

        {!transaction && (
          <div className="form-group toggle-group">
            <label className="switch-label">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
              />
              É uma despesa recorrente/parcelada?
            </label>
          </div>
        )}
        {isRecurring && !transaction && (
          <div className="recurring-options">
            <div className="form-group">
              <label htmlFor="recurringType">Tipo:</label>
              <select
                id="recurringType"
                value={recurringType}
                onChange={(e) => setRecurringType(e.target.value)}
              >
                <option value="subscription">Assinatura Mensal</option>
                <option value="installment">Parcelamento</option>
              </select>
            </div>

            {recurringType === 'installment' ? (
              <div className="form-group">
                <label htmlFor="totalInstallments">Número de Parcelas:</label>
                <input
                  id="totalInstallments"
                  type="number"
                  min="2"
                  value={totalInstallments}
                  onChange={(e) => setTotalInstallments(e.target.value)}
                  required
                />
              </div>
            ) : (
              <div className="form-group">
                <label htmlFor="frequency">Frequência:</label>
                <select
                  id="frequency"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                >
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                </select>
              </div>
            )}
          </div>
        )}

        <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <button type="submit" style={{ backgroundColor: '#007bff', color: 'white', border: 'none', flex: 1 }}>
            Salvar Transação
          </button>
          {onClose && (
            <button type="button" onClick={onClose} style={{ flex: 1 }}>
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default TransactionForm;
