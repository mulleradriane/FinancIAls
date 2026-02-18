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
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import Modal from '../components/Modal';
import TransactionForm from '../components/TransactionForm';

const VariationBadge = ({ value, type }) => {
  if (value === 0) return null;

  const isPositive = value > 0;
  let isGood = isPositive;
  if (type === 'expense') isGood = !isPositive;
  if (type === 'balance') isGood = isPositive;

  const color = isGood ? '#28a745' : '#dc3545';
  const icon = isPositive ? '↑' : '↓';

  return (
    <span style={{
      fontSize: '0.75rem',
      fontWeight: 'bold',
      color: color,
      backgroundColor: `${color}15`,
      padding: '2px 6px',
      borderRadius: '4px',
      marginLeft: '8px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '2px'
    }}>
      {icon} {Math.abs(value).toFixed(1)}%
    </span>
  );
};

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
            <span style={{ color: 'var(--sidebar-text)', fontSize: '14px' }}>Saldo Atual</span>
            <Wallet size={20} color="#007bff" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '24px', color: data.current_balance >= 0 ? '#28a745' : '#dc3545' }}>
              {formatCurrency(data.current_balance)}
            </h2>
            <VariationBadge value={data.balance_variation} type="balance" />
          </div>
        </div>

        <div className="card" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--sidebar-text)', fontSize: '14px' }}>Receitas do Mês</span>
            <ArrowUpCircle size={20} color="#28a745" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '24px', color: '#28a745' }}>
              {formatCurrency(data.monthly_income)}
            </h2>
            <VariationBadge value={data.income_variation} type="income" />
          </div>
        </div>

        <div className="card" style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--sidebar-text)', fontSize: '14px' }}>Despesas do Mês</span>
            <ArrowDownCircle size={20} color="#dc3545" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: '10px' }}>
            <h2 style={{ margin: 0, fontSize: '24px', color: '#dc3545' }}>
              {formatCurrency(data.monthly_expenses)}
            </h2>
            <VariationBadge value={data.expenses_variation} type="expense" />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px', alignItems: 'start', marginBottom: '30px' }}>
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

        {/* Gráfico de Pizza */}
        <div className="card" style={{ ...cardStyle, height: '400px' }}>
          <h3 style={{ marginBottom: '20px' }}>Gastos por Categoria</h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={Object.entries(data.expenses_by_category).map(([name, value]) => ({
                    name,
                    value: Math.abs(parseFloat(value))
                  }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {Object.entries(data.expenses_by_category).map(([name], index) => {
                    const category = categories.find(c => c.name === name);
                    return <Cell key={`cell-${index}`} fill={category?.color || '#888'} />;
                  })}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', alignItems: 'start' }}>
        {/* Top Categorias */}
        <div className="card" style={cardStyle}>
          <h3 style={{ marginBottom: '20px' }}>Top 5 Categorias de Despesa</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {Object.entries(data.expenses_by_category)
              .sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]))
              .slice(0, 5)
              .map(([name, value], index) => {
                const category = categories.find(c => c.name === name);
                const percentage = (parseFloat(value) / parseFloat(data.monthly_expenses)) * 100;
                return (
                  <div key={index}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{category?.icon || '💰'}</span>
                        <span style={{ fontWeight: '500' }}>{name}</span>
                      </div>
                      <span style={{ fontWeight: 'bold' }}>{formatCurrency(value)}</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--sidebar-hover)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${percentage}%`,
                          height: '100%',
                          backgroundColor: category?.color || '#007bff',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            {Object.keys(data.expenses_by_category).length === 0 && (
              <p style={{ color: 'var(--sidebar-text)', textAlign: 'center', padding: '20px' }}>Nenhuma despesa este mês.</p>
            )}
          </div>
        </div>

        {/* Atalhos Rápidos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ margin: 0 }}>Ações</h3>
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
