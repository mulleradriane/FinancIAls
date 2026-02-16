import React, { useState } from 'react';
import api from '../api/api';

const TransactionForm = ({ categories, onTransactionCreated }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        description,
        amount: parseFloat(amount),
        date,
        category_id: categoryId,
      };
      await api.post('/transactions/', payload);
      setDescription('');
      setAmount('');
      setDate('');
      setCategoryId('');
      if (onTransactionCreated) {
        onTransactionCreated();
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert('Error creating transaction. Check the console for details.');
    }
  };

  return (
    <div className="transaction-form">
      <h2>New Transaction</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="description">Description:</label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="amount">Amount:</label>
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
          <label htmlFor="date">Date:</label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="category">Category:</label>
          <select
            id="category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit">Create Transaction</button>
      </form>
    </div>
  );
};

export default TransactionForm;
