import React, { useState } from 'react';
import api from '../api/api';

const AccountForm = ({ onAccountCreated, onClose }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('banco');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name,
        type,
      };
      await api.post('/accounts/', payload);

      setName('');
      setType('banco');

      if (onAccountCreated) {
        onAccountCreated();
      }
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error creating account:', error);
      alert('Erro ao criar conta.');
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
