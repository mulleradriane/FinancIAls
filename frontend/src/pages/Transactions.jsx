import React, { useState, useEffect } from 'react';
import api from '../api/api';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList';
import Modal from '../components/Modal';
import { Plus } from 'lucide-react';

const Transactions = () => {
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories/');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await api.get('/accounts/');
      setAccounts(response.data);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/transactions/');
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchAccounts();
    fetchTransactions();
  }, []);

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleDelete = async (transaction) => {
    const type = transaction.is_transfer ? 'transferência' : 'transação';
    if (window.confirm(`Tem certeza que deseja excluir esta ${type}?`)) {
      try {
        const endpoint = transaction.is_transfer ? '/transfers' : '/transactions';
        await api.delete(`${endpoint}/${transaction.id}`);
        fetchTransactions();
      } catch (error) {
        console.error(`Error deleting ${type}:`, error);
        const detail = error.response?.data?.detail || `Erro ao excluir ${type}.`;
        alert(detail);
      }
    }
  };

  return (
    <div className="transactions-page" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>Transações</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 20px'
          }}
        >
          <Plus size={20} /> Nova Transação
        </button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        title={editingTransaction ? "Editar Transação" : "Nova Transação"}
      >
        <TransactionForm
          categories={categories}
          accounts={accounts}
          transaction={editingTransaction}
          onTransactionCreated={fetchTransactions}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTransaction(null);
          }}
        />
      </Modal>

      <TransactionList
        transactions={transactions}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default Transactions;
