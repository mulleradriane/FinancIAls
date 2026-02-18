import React, { useState } from 'react';
import api from '../api/api';

const AccountForm = ({ account, onAccountCreated, onClose }) => {
  const [name, setName] = useState(account ? account.name : '');
  const [type, setType] = useState(account ? account.type : 'banco');
  const [initialBalance, setInitialBalance] = useState(0);
  const [displayInitialBalance, setDisplayInitialBalance] = useState('');
  const [currentBalance, setCurrentBalance] = useState(account ? account.balance : 0);
  const [displayCurrentBalance, setDisplayCurrentBalance] = useState(account ?
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(account.balance) : ''
  );

  const handleBalanceChange = (e, setVal, setDisplayVal) => {
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
      if (account) {
        const payload = {
          name,
          type,
          current_balance: parseFloat(currentBalance),
        };
        await api.put(`/accounts/${account.id}`, payload);
      } else {
        const payload = {
          name,
          type,
          initial_balance: parseFloat(initialBalance),
        };
        await api.post('/accounts/', payload);
      }

      setName('');
      setType('banco');
      setInitialBalance(0);
      setDisplayInitialBalance('');
      setDisplayCurrentBalance('');

      if (onAccountCreated) {
        onAccountCreated();
      }
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error saving account:', error);
      const detail = error.response?.data?.detail || 'Erro ao salvar conta.';
      alert(detail);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group" style={{ marginBottom: '15px' }}>
        <label htmlFor="accountName">Nome da Conta:</label>
        <input
          id="accountName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={{ width: '100%', padding: '8px', marginTop: '5px' }}
        />
      </div>
      <div className="form-group" style={{ marginBottom: '15px' }}>
        <label htmlFor="accountType">Tipo:</label>
        <select
          id="accountType"
          value={type}
          onChange={(e) => setType(e.target.value)}
          required
          style={{ width: '100%', padding: '8px', marginTop: '5px' }}
        >
          <option value="carteira">Carteira (Dinheiro)</option>
          <option value="banco">Banco (Corrente)</option>
          <option value="poupanca">Poupança</option>
          <option value="investimento">Investimento</option>
          <option value="cartao_credito">Cartão de Crédito</option>
        </select>
      </div>

      {!account ? (
        <div className="form-group" style={{ marginBottom: '15px' }}>
          <label htmlFor="initialBalance">Saldo Inicial:</label>
          <input
            id="initialBalance"
            type="text"
            placeholder="R$ 0,00"
            value={displayInitialBalance}
            onChange={(e) => handleBalanceChange(e, setInitialBalance, setDisplayInitialBalance)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
      ) : (
        <div className="form-group" style={{ marginBottom: '15px' }}>
          <label htmlFor="currentBalance">Saldo Atual:</label>
          <input
            id="currentBalance"
            type="text"
            placeholder="R$ 0,00"
            value={displayCurrentBalance}
            onChange={(e) => handleBalanceChange(e, setCurrentBalance, setDisplayCurrentBalance)}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
          <small style={{ color: '#666' }}>Alterar o saldo gerará uma transação de ajuste.</small>
        </div>
      )}

      <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <button type="submit" style={{ backgroundColor: '#007bff', color: 'white', border: 'none', padding: '10px', flex: 1, cursor: 'pointer' }}>
          Salvar Conta
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

export default AccountForm;
