import React, { useState, useEffect } from 'react';
import api from '../api/api';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList';
import Modal from '../components/Modal';
import { Plus } from 'lucide-react';

const Transactions = () => {
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories/');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
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
    fetchTransactions();
  }, []);

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
        onClose={() => setIsModalOpen(false)}
        title="Nova Transação"
      >
        <TransactionForm
          categories={categories}
          onTransactionCreated={fetchTransactions}
          onClose={() => setIsModalOpen(false)}
        />
      </Modal>

      <TransactionList transactions={transactions} />
    </div>
  );
};

export default Transactions;
