import React from 'react';
import {
  ShoppingCart,
  CreditCard,
  Tag,
  Calendar,
  Coffee,
  Car,
  Home,
  CheckCircle,
  HelpCircle,
  Pencil,
  Trash2,
  ArrowLeftRight,
  Landmark,
  Wallet
} from 'lucide-react';

const TransactionList = ({ transactions, onEdit, onDelete }) => {
  const getAccountIcon = (type) => {
    switch (type) {
      case 'carteira': return <Wallet size={14} title="Carteira" />;
      case 'banco': return <Landmark size={14} title="Banco (Débito/Pix)" />;
      case 'poupanca': return <Tag size={14} title="Poupança" />;
      case 'investimento': return <Tag size={14} title="Investimento" />;
      case 'cartao_credito': return <CreditCard size={14} title="Cartão de Crédito" />;
      default: return <Landmark size={14} title="Conta" />;
    }
  };

  const getIcon = (t) => {
    if (t.is_transfer) return <ArrowLeftRight size={16} color="#007bff" />;

    const desc = (t.description || '').toLowerCase();
    if (desc.includes('food') || desc.includes('almoço') || desc.includes('jantar')) return <Coffee size={16} color="#666" />;
    if (desc.includes('uber') || desc.includes('gasolina') || desc.includes('transporte')) return <Car size={16} color="#666" />;
    if (desc.includes('aluguel') || desc.includes('casa')) return <Home size={16} color="#666" />;
    if (desc.includes('assinatura') || desc.includes('netflix') || desc.includes('spotify')) return <CheckCircle size={16} color="#666" />;
    return <ShoppingCart size={16} color="#666" />;
  };

  const getCategoryColor = (name) => {
    const colors = {
      'Alimentação': '#ff4d4d',
      'Transporte': '#33cc33',
      'Lazer': '#ff9900',
      'Saúde': '#3399ff',
      'Educação': '#9933ff',
      'Moradia': '#663300',
    };
    return colors[name] || '#666666';
  };

  return (
    <div className="transaction-list">
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #eee' }}>
            <th style={{ textAlign: 'left', padding: '12px' }}>Conta</th>
            <th style={{ textAlign: 'left', padding: '12px' }}>Descrição</th>
            <th style={{ textAlign: 'left', padding: '12px' }}>Categoria</th>
            <th style={{ textAlign: 'left', padding: '12px' }}>Data</th>
            <th style={{ textAlign: 'right', padding: '12px' }}>Valor</th>
            <th style={{ textAlign: 'center', padding: '12px' }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {transactions.length === 0 && (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
                Nenhuma transação encontrada.
              </td>
            </tr>
          )}
          {transactions.map((t, index) => (
            <tr key={`${t.id}-${t.account_name}-${index}`} style={{ borderBottom: '1px solid #f5f5f5' }}>
              <td style={{ padding: '12px', color: '#666', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {getAccountIcon(t.account_type)}
                  <span>{t.account_name}</span>
                </div>
              </td>
              <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {getIcon(t)}
                <span>{t.description}</span>
                {t.installment_number && (
                  <span style={{ fontSize: '0.8rem', color: '#999', marginLeft: '5px' }}>
                    ({t.installment_number})
                  </span>
                )}
              </td>
              <td style={{ padding: '12px' }}>
                <span style={{
                  backgroundColor: t.is_transfer ? '#6c757d' : getCategoryColor(t.category_name),
                  color: 'white',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '0.85rem',
                  fontWeight: '500'
                }}>
                  {t.category_name}
                </span>
              </td>
              <td style={{ padding: '12px', color: '#666' }}>
                {new Date(t.date).toLocaleDateString('pt-BR')}
              </td>
              <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600' }}>
                R$ {parseFloat(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
              <td style={{ padding: '12px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                  {!t.is_transfer && (
                    <button
                      onClick={() => onEdit(t)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}
                      title="Editar"
                    >
                      <Pencil size={18} />
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(t)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545' }}
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TransactionList;
