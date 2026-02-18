import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { toast } from 'react-toastify';
import {
  CreditCard,
  RotateCcw,
  Calendar,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Package,
  Tv,
  Trash2,
  Square
} from 'lucide-react';

const Recorrentes = () => {
  const [activeTab, setActiveTab] = useState('despesas');
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [summary, setSummary] = useState({
    total_recurring: 0,
    total_subscriptions: 0,
    total_installments: 0,
    commitment_percentage: 0
  });

  const fetchData = async () => {
    try {
      const categoryType = activeTab === 'despesas' ? 'expense' : 'income';
      const [expensesRes, summaryRes] = await Promise.all([
        api.get(`/recurring-expenses/?category_type=${categoryType}`),
        api.get('/recurring-expenses/summary')
      ]);
      setRecurringExpenses(expensesRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const installments = recurringExpenses.filter(e => e.type === 'installment');
  const subscriptions = recurringExpenses.filter(e => e.type === 'subscription');

  const handleDelete = async (id) => {
    if (window.confirm('Deseja realmente excluir esta recorrência? Todas as transações (passadas e futuras) vinculadas a ela serão apagadas.')) {
      try {
        await api.delete(`/recurring-expenses/${id}`);
        toast.success('Recorrência excluída!');
        fetchData();
      } catch (error) {
        console.error('Error deleting recurrence:', error);
        toast.error('Erro ao excluir recorrência.');
      }
    }
  };

  const handleTerminate = async (id) => {
    if (window.confirm('Deseja realmente encerrar esta recorrência? As transações passadas serão mantidas, mas as futuras serão apagadas.')) {
      try {
        await api.post(`/recurring-expenses/${id}/terminate`);
        toast.success('Recorrência encerrada!');
        fetchData();
      } catch (error) {
        console.error('Error terminating recurrence:', error);
        toast.error('Erro ao encerrar recorrência.');
      }
    }
  };

  // Simple Donut Chart Component
  const DonutChart = ({ percentage }) => {
    const strokeDasharray = `${percentage} ${100 - percentage}`;
    return (
      <svg width="120" height="120" viewBox="0 0 42 42" className="donut">
        <circle className="donut-hole" cx="21" cy="21" r="15.91549430918954" fill="#fff"></circle>
        <circle className="donut-ring" cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#eeeeee" strokeWidth="3"></circle>
        <circle className="donut-segment" cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#ffcc00" strokeWidth="3" strokeDasharray={strokeDasharray} strokeDashoffset="25"></circle>
        <g className="chart-text">
          <text x="50%" y="50%" className="chart-number" textAnchor="middle" dominantBaseline="central" style={{ fontSize: '8px', fontWeight: 'bold' }}>
            {percentage}%
          </text>
        </g>
      </svg>
    );
  };

  return (
    <div className="recorrentes-page" style={{ padding: '20px', backgroundColor: 'var(--bg-color)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('despesas')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'despesas' ? '3px solid #007bff' : 'none',
            color: activeTab === 'despesas' ? '#007bff' : '#666',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Despesas
        </button>
        <button
          onClick={() => setActiveTab('receitas')}
          style={{
            padding: '10px 20px',
            border: 'none',
            background: 'none',
            borderBottom: activeTab === 'receitas' ? '3px solid #007bff' : 'none',
            color: activeTab === 'receitas' ? '#007bff' : '#666',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Receitas
        </button>
      </div>

      {/* Hero Section */}
      <div style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '40px',
        marginBottom: '30px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        color: 'var(--text-color)'
      }}>
        <DonutChart percentage={summary.commitment_percentage} />
        <div>
          <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: '5px' }}>Comprometimento da renda</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '10px' }}>
            R$ {summary.total_recurring.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#666', fontSize: '0.8rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ffcc00' }}></div>
                Parcelas
              </div>
              <div style={{ fontWeight: 'bold' }}>R$ {summary.total_installments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#666', fontSize: '0.8rem' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#eee' }}></div>
                Assinaturas
              </div>
              <div style={{ fontWeight: 'bold' }}>R$ {summary.total_subscriptions.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Parcelas List */}
        <div>
          <h3 style={{ marginBottom: '15px' }}>Parcelas</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {installments.map(item => {
              const total = item.total_installments || 1;
              // Progress: How many transactions are in the past or today
              const today = new Date();
              const completed = item.transactions?.filter(t => new Date(t.date) <= today).length || 0;
              const progress = (completed / total) * 100;

              // Calculate end date
              const startDate = new Date(item.start_date);
              const endDate = new Date(startDate);
              endDate.setMonth(startDate.getMonth() + (total - 1));
              const endDateStr = endDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

              return (
                <div key={item.id} style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', color: 'var(--text-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div style={{ backgroundColor: '#f0f4ff', padding: '8px', borderRadius: '8px' }}>
                        <Package size={20} color="#007bff" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{item.description}</div>
                        <div style={{ fontSize: '0.8rem', color: '#999' }}>{item.category?.name}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                          onClick={() => handleTerminate(item.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6c757d', padding: '2px' }}
                          title="Encerrar"
                        >
                          <Square size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', padding: '2px' }}
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div style={{ fontWeight: 'bold' }}>R$ {parseFloat(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                      <div style={{ fontSize: '0.75rem', color: '#999' }}>Fim em {endDateStr}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '15px' }}>
                    <div style={{
                      backgroundColor: '#fff9e6',
                      color: '#ffcc00',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}>
                      {completed}/{total}
                    </div>
                    <div style={{ flex: 1, height: '6px', backgroundColor: '#eee', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#ffcc00' }}></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Assinaturas List */}
        <div>
          <h3 style={{ marginBottom: '15px' }}>Assinaturas</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {subscriptions.map(item => (
              <div key={item.id} style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', color: 'var(--text-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ backgroundColor: '#f0f0f0', padding: '8px', borderRadius: '8px' }}>
                      <Tv size={20} color="#666" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{item.description}</div>
                      <div style={{ fontSize: '0.8rem', color: '#999' }}>{item.frequency === 'monthly' ? 'Mensal' : 'Anual'}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button
                        onClick={() => handleTerminate(item.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6c757d', padding: '2px' }}
                        title="Encerrar"
                      >
                        <Square size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', padding: '2px' }}
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div style={{ fontWeight: 'bold' }}>R$ {parseFloat(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Recorrentes;
