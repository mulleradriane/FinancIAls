import React, { useState, useEffect } from 'react';
import api from '../api/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, TrendingDown, Wallet, Briefcase, CreditCard,
  AlertCircle, RefreshCw
} from 'lucide-react';
import { toast } from 'react-toastify';
import Modal from '../components/Modal';

const Patrimonio = () => {
  const [data, setData] = useState(null);
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [newBalance, setNewBalance] = useState('');

  const fetchNetWorth = async () => {
    try {
      const response = await api.get('/summary/net-worth');
      setData(response.data);
    } catch (error) {
      console.error('Error fetching net worth data:', error);
      toast.error('Erro ao carregar dados do patrimônio');
    }
  };

  const fetchInvestments = async () => {
    try {
      const response = await api.get('/accounts/');
      const filtered = response.data.filter(acc => acc.type === 'investimento' || acc.type === 'poupanca');
      setInvestments(filtered);
    } catch (error) {
      console.error('Error fetching investments:', error);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchNetWorth(), fetchInvestments()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleUpdateBalance = async (e) => {
    e.preventDefault();
    if (!selectedAccount || !newBalance) return;

    try {
      const val = parseFloat(newBalance.replace(/[R$\s.]/g, '').replace(',', '.'));
      await api.put(`/accounts/${selectedAccount.id}`, {
        current_balance: val
      });
      toast.success('Saldo atualizado com sucesso');
      setIsUpdateModalOpen(false);
      setNewBalance('');
      loadAll();
    } catch (error) {
      console.error('Error updating balance:', error);
      toast.error('Erro ao atualizar saldo');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const formatInputCurrency = (value) => {
    if (!value) return '';
    const cleanValue = value.replace(/\D/g, '');
    const numberValue = parseFloat(cleanValue) / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numberValue);
  };

  if (loading && !data) return <div style={{ padding: '20px' }}>Carregando...</div>;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const typeLabels = {
    carteira: 'Dinheiro',
    banco: 'Banco',
    poupanca: 'Poupança',
    investimento: 'Investimento',
    cartao_credito: 'Cartão de Crédito'
  };

  const allocationData = data?.allocation ? Object.entries(data.allocation).map(([type, value]) => ({
    name: typeLabels[type] || type,
    value: Math.abs(parseFloat(value))
  })).filter(item => item.value > 0) : [];

  return (
    <div className="net-worth-page" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Patrimônio</h1>
      <p style={{ color: 'var(--sidebar-text)', marginBottom: '30px' }}>
        Visão consolidada dos seus ativos e passivos.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px', marginBottom: '30px' }}>
        {/* Ativos vs Passivos Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px'
          }}>
            <div className="card" style={{ ...cardStyle, borderLeft: '5px solid #28a745' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ color: 'var(--sidebar-text)', fontSize: '0.9rem' }}>Ativos (O que tenho)</span>
                <TrendingUp size={20} color="#28a745" />
              </div>
              <h2 style={{ margin: 0 }}>{formatCurrency(data?.total_assets)}</h2>
            </div>

            <div className="card" style={{ ...cardStyle, borderLeft: '5px solid #dc3545' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ color: 'var(--sidebar-text)', fontSize: '0.9rem' }}>Passivos (Dívidas)</span>
                <TrendingDown size={20} color="#dc3545" />
              </div>
              <h2 style={{ margin: 0, color: '#dc3545' }}>{formatCurrency(data?.total_liabilities)}</h2>
            </div>
          </div>

          <div style={{
            backgroundColor: data?.net_worth >= 0 ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)',
            padding: '30px',
            borderRadius: '12px',
            textAlign: 'center',
            border: `1px solid ${data?.net_worth >= 0 ? '#28a745' : '#dc3545'}50`
          }}>
            <div style={{ fontSize: '1rem', color: 'var(--sidebar-text)', marginBottom: '5px' }}>Patrimônio Líquido</div>
            <h1 style={{ margin: 0, fontSize: '2.5rem', color: data?.net_worth >= 0 ? '#28a745' : '#dc3545' }}>
              {formatCurrency(data?.net_worth)}
            </h1>
          </div>
        </div>

        {/* Allocation Chart */}
        <div className="card" style={cardStyle}>
          <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Alocação de Ativos</h3>
          <div style={{ width: '100%', height: '220px' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Line Chart */}
      <div className="card" style={{ ...cardStyle, marginBottom: '30px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Evolução Patrimonial</h3>
        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer>
            <LineChart data={data?.history}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `R$ ${value}`} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Line
                type="monotone"
                dataKey="value"
                name="Patrimônio"
                stroke="#007bff"
                strokeWidth={3}
                dot={{ r: 6 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gestão de Ativos (Investimentos) */}
      <div className="card" style={cardStyle}>
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Gestão de Ativos (Investimentos)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {investments.map(acc => (
            <div key={acc.id} style={{
              padding: '15px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--sidebar-hover)'
            }}>
              <div>
                <div style={{ fontWeight: '600' }}>{acc.name}</div>
                <div style={{ color: '#28a745', fontSize: '1.1rem', fontWeight: 'bold' }}>{formatCurrency(acc.balance)}</div>
              </div>
              <button
                onClick={() => {
                  setSelectedAccount(acc);
                  setNewBalance(formatCurrency(acc.balance));
                  setIsUpdateModalOpen(true);
                }}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.9rem'
                }}
              >
                <RefreshCw size={14} /> Atualizar
              </button>
            </div>
          ))}
          {investments.length === 0 && (
            <p style={{ color: 'var(--sidebar-text)' }}>Nenhum investimento cadastrado como conta.</p>
          )}
        </div>
      </div>

      {/* Update Modal */}
      <Modal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        title={`Atualizar Saldo: ${selectedAccount?.name}`}
      >
        <form onSubmit={handleUpdateBalance} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px' }}>Novo Saldo</label>
            <input
              type="text"
              value={newBalance}
              onChange={(e) => setNewBalance(formatInputCurrency(e.target.value))}
              placeholder="R$ 0,00"
              style={inputStyle}
              required
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Confirmar
            </button>
            <button
              type="button"
              onClick={() => setIsUpdateModalOpen(false)}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
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

const inputStyle = {
  width: '100%',
  padding: '12px',
  borderRadius: '8px',
  border: '1px solid var(--border-color)',
  backgroundColor: 'var(--card-bg)',
  color: 'var(--text-color)',
  fontSize: '16px'
};

export default Patrimonio;
