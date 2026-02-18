import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { toast } from 'react-toastify';
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

  // Filters
  const [period, setPeriod] = useState('month');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
      const params = {};
      if (accountId) params.account_id = accountId;
      if (categoryId) params.category_id = categoryId;

      let start = startDate;
      let end = endDate;

      if (period !== 'custom') {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        end = today;

        if (period === '30days') {
          const d = new Date();
          d.setDate(d.getDate() - 30);
          start = d.toISOString().split('T')[0];
        } else if (period === '60days') {
          const d = new Date();
          d.setDate(d.getDate() - 60);
          start = d.toISOString().split('T')[0];
        } else if (period === '90days') {
          const d = new Date();
          d.setDate(d.getDate() - 90);
          start = d.toISOString().split('T')[0];
        } else if (period === 'month') {
          const d = new Date(now.getFullYear(), now.getMonth(), 1);
          start = d.toISOString().split('T')[0];
        }
      }

      if (start) params.start_date = start;
      if (end) params.end_date = end;

      const response = await api.get('/transactions/', { params });
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchAccounts();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [period, accountId, categoryId, startDate, endDate]);

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };

  const clearFilters = () => {
    setPeriod('month');
    setAccountId('');
    setCategoryId('');
    setStartDate('');
    setEndDate('');
  };

  const totals = transactions.reduce((acc, t) => {
    const val = parseFloat(t.amount);
    if (val > 0) acc.incomes += val;
    else acc.expenses += Math.abs(val);
    return acc;
  }, { incomes: 0, expenses: 0 });

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleDelete = async (transaction) => {
    const type = transaction.is_transfer ? 'transferência' : 'transação';
    if (window.confirm(`Tem certeza que deseja excluir esta ${type}?`)) {
      try {
        const endpoint = transaction.is_transfer ? '/transfers' : '/transactions';
        await api.delete(`${endpoint}/${transaction.id}`);
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} excluída!`);
        fetchTransactions();
      } catch (error) {
        console.error(`Error deleting ${type}:`, error);
        const detail = error.response?.data?.detail || `Erro ao excluir ${type}.`;
        toast.error(detail);
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

      {/* Resumo Rápido */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ backgroundColor: 'var(--card-bg)', padding: '20px', borderRadius: '12px', borderLeft: '6px solid #28a745', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '5px' }}>Total Entradas</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#28a745' }}>{formatCurrency(totals.incomes)}</div>
        </div>
        <div style={{ backgroundColor: 'var(--card-bg)', padding: '20px', borderRadius: '12px', borderLeft: '6px solid #dc3545', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '5px' }}>Total Saídas</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc3545' }}>{formatCurrency(totals.expenses)}</div>
        </div>
        <div style={{ backgroundColor: 'var(--card-bg)', padding: '20px', borderRadius: '12px', borderLeft: '6px solid #007bff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '5px' }}>Saldo do Período</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#007bff' }}>{formatCurrency(totals.incomes - totals.expenses)}</div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end', marginBottom: '30px', padding: '20px', backgroundColor: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label htmlFor="filter-period" style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Período:</label>
          <select id="filter-period" value={period} onChange={(e) => setPeriod(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--input-border)', backgroundColor: 'var(--input-bg)', color: 'var(--text-color)' }}>
            <option value="month">Mês Atual</option>
            <option value="30days">Últimos 30 dias</option>
            <option value="60days">Últimos 60 dias</option>
            <option value="90days">Últimos 90 dias</option>
            <option value="custom">Personalizado</option>
          </select>
        </div>

        {period === 'custom' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label htmlFor="filter-start-date" style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Início:</label>
              <input id="filter-start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--input-border)', backgroundColor: 'var(--input-bg)', color: 'var(--text-color)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label htmlFor="filter-end-date" style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Fim:</label>
              <input id="filter-end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--input-border)', backgroundColor: 'var(--input-bg)', color: 'var(--text-color)' }} />
            </div>
          </>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label htmlFor="filter-account" style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Conta:</label>
          <select id="filter-account" value={accountId} onChange={(e) => setAccountId(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--input-border)', backgroundColor: 'var(--input-bg)', color: 'var(--text-color)' }}>
            <option value="">Todas as Contas</option>
            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label htmlFor="filter-category" style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Categoria:</label>
          <select id="filter-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--input-border)', backgroundColor: 'var(--input-bg)', color: 'var(--text-color)' }}>
            <option value="">Todas as Categorias</option>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </div>

        <button onClick={clearFilters} style={{ padding: '10px 15px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--input-bg)', color: 'var(--text-color)', cursor: 'pointer' }}>
          Limpar Filtros
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
