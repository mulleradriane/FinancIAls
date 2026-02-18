import React, { useState } from 'react';
import api from '../api/api';

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
    if (fromAccountId === toAccountId) {
      alert('Contas de origem e destino devem ser diferentes.');
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

      if (onTransferCreated) {
        onTransferCreated();
      }
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error creating transfer:', error);
      const detail = error.response?.data?.detail || 'Erro ao realizar transferência.';
      alert(detail);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group" style={{ marginBottom: '15px' }}>
        <label htmlFor="fromAccount">De:</label>
        <select
          id="fromAccount"
          value={fromAccountId}
          onChange={(e) => setFromAccountId(e.target.value)}
          required
          style={{ width: '100%', padding: '8px', marginTop: '5px' }}
        >
          <option value="">Selecione a conta de origem</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group" style={{ marginBottom: '15px' }}>
        <label htmlFor="toAccount">Para:</label>
        <select
          id="toAccount"
          value={toAccountId}
          onChange={(e) => setToAccountId(e.target.value)}
          required
          style={{ width: '100%', padding: '8px', marginTop: '5px' }}
        >
          <option value="">Selecione a conta de destino</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group" style={{ marginBottom: '15px' }}>
        <label htmlFor="transferAmount">Valor:</label>
        <input
          id="transferAmount"
          type="text"
          placeholder="R$ 0,00"
          value={displayAmount}
          onChange={handleAmountChange}
          required
          style={{ width: '100%', padding: '8px', marginTop: '5px' }}
        />
      </div>

      <div className="form-group" style={{ marginBottom: '15px' }}>
        <label htmlFor="transferDate">Data:</label>
        <input
          id="transferDate"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          style={{ width: '100%', padding: '8px', marginTop: '5px' }}
        />
      </div>

      <div className="form-group" style={{ marginBottom: '15px' }}>
        <label htmlFor="transferDescription">Descrição (Opcional):</label>
        <input
          id="transferDescription"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ width: '100%', padding: '8px', marginTop: '5px' }}
        />
      </div>

      <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <button type="submit" style={{ backgroundColor: '#007bff', color: 'white', border: 'none', padding: '10px', flex: 1, cursor: 'pointer' }}>
          Realizar Transferência
        </button>
        {onClose && (
          <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px', cursor: 'pointer' }}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
};

export default TransferForm;
