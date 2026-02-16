import React, { useState, useEffect } from 'react';
import api from '../api/api';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList';

const Transactions = () => {
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);

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
    <div className="transactions-page">
      <h1>Transactions</h1>
      <TransactionForm categories={categories} onTransactionCreated={fetchTransactions} />
      <hr />
      <TransactionList transactions={transactions} />
    </div>
  );
};

export default Transactions;
