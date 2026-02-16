import React, { useState } from 'react';
import api from '../api/api';

const TransactionForm = ({ categories, onTransactionCreated, onClose }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState('subscription');
  const [totalInstallments, setTotalInstallments] = useState('');
  const [frequency, setFrequency] = useState('monthly');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        description,
        amount: parseFloat(amount),
        date,
        category_id: categoryId,
        is_recurring: isRecurring,
        recurring_type: isRecurring ? recurringType : null,
        total_installments: isRecurring && recurringType === 'installment' ? parseInt(totalInstallments) : null,
        frequency: isRecurring && recurringType === 'subscription' ? frequency : null,
      };
      await api.post('/transactions/', payload);

      // Reset form
      setDescription('');
      setAmount('');
      setDate('');
      setCategoryId('');
      setIsRecurring(false);

      if (onTransactionCreated) {
        onTransactionCreated();
      }
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert('Error creating transaction. Check the console for details.');
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
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="amount">Valor:</label>
          <input
            id="amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
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

        {isRecurring && (
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
