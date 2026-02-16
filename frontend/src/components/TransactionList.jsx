import React from 'react';

const TransactionList = ({ transactions }) => {
  return (
    <div className="transaction-list">
      <h2>Transactions</h2>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Amount</th>
            <th>Date</th>
            <th>Category</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id}>
              <td>{t.description}</td>
              <td>${parseFloat(t.amount).toFixed(2)}</td>
              <td>{new Date(t.date).toLocaleDateString()}</td>
              <td>{t.category ? t.category.name : 'No Category'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TransactionList;
