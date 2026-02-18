import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { toast } from 'react-toastify';
import Modal from '../components/Modal';
import AccountForm from '../components/AccountForm';
import TransferForm from '../components/TransferForm';
import { Plus, ArrowLeftRight, CreditCard, Landmark, Wallet, PiggyBank, Briefcase, Pencil, Trash2 } from 'lucide-react';

const Contas = () => {
  const [accounts, setAccounts] = useState([]);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
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

  const handleEdit = (account) => {
    setEditingAccount(account);
    setIsAccountModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta conta? Todas as transações vinculadas perderão o vínculo.')) {
      try {
        await api.delete(`/accounts/${id}`);
        toast.success('Conta excluída!');
        fetchAccounts();
      } catch (error) {
        console.error('Error deleting account:', error);
        const detail = error.response?.data?.detail || 'Erro ao excluir conta.';
        toast.error(detail);
      }
    }
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
            onClick={() => {
              setEditingAccount(null);
              setIsAccountModalOpen(true);
            }}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ color: '#007bff' }}>
                  {getAccountIcon(account.type)}
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{account.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#666', textTransform: 'capitalize' }}>
                    {account.type.replace('_', ' ')}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button
                  onClick={() => handleEdit(account)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: '5px' }}
                  title="Editar"
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => handleDelete(account.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', padding: '5px' }}
                  title="Excluir"
                >
                  <Trash2 size={18} />
                </button>
              </div>
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
        onClose={() => {
          setIsAccountModalOpen(false);
          setEditingAccount(null);
        }}
        title={editingAccount ? "Editar Conta" : "Nova Conta"}
      >
        <AccountForm
          account={editingAccount}
          onAccountCreated={fetchAccounts}
          onClose={() => {
            setIsAccountModalOpen(false);
            setEditingAccount(null);
          }}
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
