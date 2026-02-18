import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const Relatorios = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const response = await api.get('/summary/month', {
        params: { year, month }
      });
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching monthly summary:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [year, month]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

  const chartData = summary ? Object.entries(summary.expenses_by_category).map(([name, value]) => ({
    name,
    value: parseFloat(value)
  })) : [];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <div className="reports-page" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Relatórios e Análises</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} style={{ padding: '8px' }}>
            {monthNames.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(parseInt(e.target.value))} style={{ padding: '8px' }}>
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div>Carregando...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Despesas por Categoria</h3>
            <div style={{ width: '100%', height: '300px' }}>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#666' }}>
                  Sem despesas neste mês.
                </div>
              )}
            </div>
          </div>

          <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Maiores Gastos do Mês</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Descrição</th>
                  <th style={{ padding: '10px' }}>Categoria</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {summary?.top_transactions.map((t, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px' }}>{t.description}</td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ fontSize: '0.8rem', backgroundColor: 'var(--table-header-bg)', padding: '2px 8px', borderRadius: '10px' }}>
                        {t.category_name}
                      </span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#dc3545' }}>
                      {formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))}
                {summary?.top_transactions.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#666' }}>Nenhum gasto registrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
             <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ color: 'var(--sidebar-text)', fontSize: '0.9rem' }}>Total de Receitas</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#28a745' }}>{formatCurrency(summary?.total_income || 0)}</div>
             </div>
             <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ color: 'var(--sidebar-text)', fontSize: '0.9rem' }}>Total de Despesas</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc3545' }}>{formatCurrency(summary?.total_expenses || 0)}</div>
             </div>
             <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ color: 'var(--sidebar-text)', fontSize: '0.9rem' }}>Total Investido</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#007bff' }}>{formatCurrency(summary?.total_invested || 0)}</div>
             </div>
             <div style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ color: 'var(--sidebar-text)', fontSize: '0.9rem' }}>Saldo Líquido</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: (summary?.balance || 0) >= 0 ? 'var(--text-color)' : '#dc3545' }}>
                  {formatCurrency(summary?.balance || 0)}
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Relatorios;
