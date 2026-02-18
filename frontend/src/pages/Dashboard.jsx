import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  List,
  ArrowUpCircle,
  ArrowDownCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import Modal from '../components/Modal';
import TransactionForm from '../components/TransactionForm';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dashboardRes, categoriesRes] = await Promise.all([
        api.get('/summary/dashboard'),
        api.get('/categories/')
      ]);
      setData(dashboardRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading || !data) {
    return <div style={{ padding: '20px' }}>Carregando dashboard...</div>;
  }

  return (
    <div className="dashboard-page" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '30px' }}>Dashboard</h1>

      {/* Cards de Topo */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '40px'
      }}>
        <div className="card" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#666', fontSize: '14px' }}>Saldo Atual</span>
            <Wallet size={20} color="#007bff" />
          </div>
          <h2 style={{ margin: '10px 0', fontSize: '24px', color: data.current_balance >= 0 ? '#28a745' : '#dc3545' }}>
            {formatCurrency(data.current_balance)}
          </h2>
        </div>

        <div className="card" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#666', fontSize: '14px' }}>Receitas do Mês</span>
            <ArrowUpCircle size={20} color="#28a745" />
          </div>
          <h2 style={{ margin: '10px 0', fontSize: '24px', color: '#28a745' }}>
            {formatCurrency(data.monthly_income)}
          </h2>
        </div>

        <div className="card" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#666', fontSize: '14px' }}>Despesas do Mês</span>
            <ArrowDownCircle size={20} color="#dc3545" />
          </div>
          <h2 style={{ margin: '10px 0', fontSize: '24px', color: '#dc3545' }}>
            {formatCurrency(data.monthly_expenses)}
          </h2>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', alignItems: 'start' }}>
        {/* Gráfico Principal */}
        <div className="card" style={{ ...cardStyle, height: '400px' }}>
          <h3 style={{ marginBottom: '20px' }}>Receitas vs Despesas (6 meses)</h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer>
              <BarChart data={data.chart_data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `R$ ${value}`} />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  labelStyle={{ color: '#333' }}
                />
                <Legend />
                <Bar dataKey="income" name="Receitas" fill="#28a745" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Despesas" fill="#dc3545" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Atalhos Rápidos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ margin: 0 }}>Atalhos Rápidos</h3>
          <button
            onClick={() => setIsModalOpen(true)}
            style={actionButtonStyle('#007bff')}
          >
            <Plus size={20} /> Nova Transação
          </button>
          <button
            onClick={() => navigate('/transactions')}
            style={actionButtonStyle('#6c757d')}
          >
            <List size={20} /> Ver Extrato
          </button>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nova Transação"
      >
        <TransactionForm
          categories={categories}
          onTransactionCreated={fetchData}
          onClose={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

const cardStyle = {
  backgroundColor: 'var(--card-bg)',
  padding: '20px',
  borderRadius: '12px',
  boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-color)'
};

const actionButtonStyle = (color) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '10px',
  backgroundColor: color,
  color: 'white',
  border: 'none',
  padding: '15px',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '16px',
  fontWeight: '600',
  transition: 'opacity 0.2s'
});

export default Dashboard;
