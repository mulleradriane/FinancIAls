import React, { useState, useEffect } from 'react';
import api from '../api/api';
import Modal from '../components/Modal';
import AccountForm from '../components/AccountForm';
import TransferForm from '../components/TransferForm';
import { Plus, ArrowLeftRight, CreditCard, Landmark, Wallet, PiggyBank, Briefcase } from 'lucide-react';

const Contas = () => {
  const [accounts, setAccounts] = useState([]);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const fetchAccounts = async () => {
    try {
      const response = await api.get('/accounts/');
      setAccounts(response.data);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const getAccountIcon = (type) => {
    switch (type) {
      case 'carteira': return <Wallet size={24} />;
      case 'banco': return <Landmark size={24} />;
      case 'poupanca': return <PiggyBank size={24} />;
      case 'investimento': return <Briefcase size={24} />;
      case 'cartao_credito': return <CreditCard size={24} />;
      default: return <Landmark size={24} />;
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="accounts-page" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0 }}>Minhas Contas</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setIsTransferModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              cursor: 'pointer'
            }}
          >
            <ArrowLeftRight size={20} /> Transferência
          </button>
          <button
            onClick={() => setIsAccountModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              cursor: 'pointer'
            }}
          >
            <Plus size={20} /> Nova Conta
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {accounts.map((account) => (
          <div
            key={account.id}
            style={{
              padding: '20px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              gap: '15px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ color: '#007bff' }}>
                  {getAccountIcon(account.type)}
                </div>
                <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{account.name}</span>
              </div>
              <span style={{ fontSize: '0.85rem', color: '#666', textTransform: 'capitalize' }}>
                {account.type.replace('_', ' ')}
              </span>
            </div>

            <div style={{ marginTop: '5px' }}>
              <div style={{ fontSize: '0.9rem', color: '#666' }}>Saldo Atual</div>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: account.balance >= 0 ? '#28a745' : '#dc3545'
              }}>
                {formatCurrency(account.balance)}
              </div>
            </div>
          </div>
        ))}
        {accounts.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px', color: '#666' }}>
            Nenhuma conta cadastrada. Clique em "Nova Conta" para começar.
          </div>
        )}
      </div>

      <Modal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        title="Nova Conta"
      >
        <AccountForm
          onAccountCreated={fetchAccounts}
          onClose={() => setIsAccountModalOpen(false)}
        />
      </Modal>

      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Transferência entre Contas"
      >
        <TransferForm
          accounts={accounts}
          onTransferCreated={fetchAccounts}
          onClose={() => setIsTransferModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default Contas;
