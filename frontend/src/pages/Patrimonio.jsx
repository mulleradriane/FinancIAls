import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Wallet, Briefcase, CreditCard, AlertCircle } from 'lucide-react';

const Patrimonio = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchNetWorth = async () => {
    setLoading(true);
    try {
      const response = await api.get('/summary/net-worth');
      setData(response.data);
    } catch (error) {
      console.error('Error fetching net worth data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetWorth();
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) return <div style={{ padding: '20px' }}>Carregando...</div>;

  const isPositive = data?.net_worth >= 0;

  return (
    <div className="net-worth-page" style={{ padding: '20px' }}>
      <h1>Patrimônio</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Visão consolidada dos seus ativos e passivos.
      </p>

      {/* Hero Card */}
      <div style={{
        backgroundColor: isPositive ? '#28a745' : '#dc3545',
        color: 'white',
        padding: '40px',
        borderRadius: '12px',
        marginBottom: '30px',
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{ fontSize: '1.2rem', opacity: 0.9, marginBottom: '10px' }}>Patrimônio Líquido Total</div>
        <div style={{ fontSize: '3rem', fontWeight: 'bold' }}>
          {formatCurrency(data?.net_worth || 0)}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
        {/* Coluna da Esquerda: Ativos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <TrendingUp color="#28a745" /> Ativos
          </h3>

          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Wallet color="#007bff" />
              <div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>Saldo em Contas</div>
                <div style={{ fontWeight: 'bold' }}>{formatCurrency(data?.total_accounts || 0)}</div>
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Briefcase color="#17a2b8" />
              <div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>Total Investido</div>
                <div style={{ fontWeight: 'bold' }}>{formatCurrency(data?.total_investments || 0)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna da Direita: Passivos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <TrendingDown color="#dc3545" /> Passivos
          </h3>

          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CreditCard color="#dc3545" />
              <div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>Cartão de Crédito / Dívidas</div>
                <div style={{ fontWeight: 'bold', color: '#dc3545' }}>{formatCurrency(data?.total_debts || 0)}</div>
              </div>
            </div>
          </div>

          <div style={{ padding: '15px', borderRadius: '8px', backgroundColor: '#fff5f5', color: '#c53030', fontSize: '0.85rem', display: 'flex', gap: '10px' }}>
            <AlertCircle size={18} />
            <span>Valores negativos em passivos representam obrigações a pagar.</span>
          </div>
        </div>
      </div>

      {/* Evolution Chart */}
      <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Evolução do Patrimônio (6 meses)</h3>
        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data?.history}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `R$ ${value}`} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
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
    </div>
  );
};

export default Patrimonio;
