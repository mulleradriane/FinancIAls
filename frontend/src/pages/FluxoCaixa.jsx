import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

const FluxoCaixa = () => {
  const [cashFlow, setCashFlow] = useState([]);

  const fetchCashFlow = async () => {
    try {
      const response = await api.get('/summary/cash-flow');
      setCashFlow(response.data);
    } catch (error) {
      console.error('Error fetching cash flow:', error);
    }
  };

  useEffect(() => {
    fetchCashFlow();
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T12:00:00');
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', weekday: 'short' }).format(date);
  };

  return (
    <div className="cash-flow-page" style={{ padding: '20px' }}>
      <h1>Fluxo de Caixa (Projeção Mensal)</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Acompanhe a evolução do seu saldo dia a dia com base nas entradas e saídas previstas.
      </p>

      <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              <th style={{ padding: '15px' }}>Data</th>
              <th style={{ padding: '15px' }}>Entradas</th>
              <th style={{ padding: '15px' }}>Saídas</th>
              <th style={{ padding: '15px' }}>Saldo Acumulado</th>
              <th style={{ padding: '15px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {cashFlow.map((day, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #eee', backgroundColor: day.balance < 0 ? '#fff5f5' : 'transparent' }}>
                <td style={{ padding: '15px', fontWeight: '500' }}>
                  {formatDate(day.date)}
                  {day.date === new Date().toISOString().split('T')[0] && (
                    <span style={{ marginLeft: '10px', fontSize: '0.7rem', backgroundColor: '#007bff', color: 'white', padding: '2px 6px', borderRadius: '10px' }}>HOJE</span>
                  )}
                </td>
                <td style={{ padding: '15px', color: '#28a745' }}>
                  {day.income > 0 ? `+ ${formatCurrency(day.income)}` : '-'}
                </td>
                <td style={{ padding: '15px', color: '#dc3545' }}>
                  {day.expense > 0 ? `- ${formatCurrency(day.expense)}` : '-'}
                </td>
                <td style={{ padding: '15px', fontWeight: 'bold', color: day.balance >= 0 ? '#212529' : '#dc3545' }}>
                  {formatCurrency(day.balance)}
                </td>
                <td style={{ padding: '15px' }}>
                  {day.balance < 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#dc3545', fontSize: '0.85rem' }}>
                      <AlertCircle size={16} /> Saldo Negativo!
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#28a745', fontSize: '0.85rem' }}>
                      OK
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {cashFlow.length === 0 && (
          <div style={{ padding: '30px', textAlign: 'center', color: '#666' }}>
            Nenhum dado disponível para o período.
          </div>
        )}
      </div>
    </div>
  );
};

export default FluxoCaixa;
