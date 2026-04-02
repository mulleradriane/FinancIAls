// ─────────────────────────────────────────────────────────────────────────────
// ARQUIVO: frontend/src/components/InvoicePaymentForm.jsx
// Versão atualizada — após pagamento, avança para próximo ciclo
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import api from '@/api/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreditCard, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import PrivateValue from '@/components/ui/PrivateValue';

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);

const toDisplay = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const InvoicePaymentForm = ({
  creditCard,
  invoiceData,     // objeto CurrentInvoiceResponse do backend (opcional — fallback para invoiceAmount)
  invoiceAmount,   // legado: valor calculado pelo pai
  accounts,
  onPaymentConfirmed,
  onClose,
}) => {
  // Usa dados do backend se disponíveis, senão cai no legado
  const totalInvoice = invoiceData
    ? Number(invoiceData.invoice_amount ?? 0)
    : Number(invoiceAmount ?? 0);

  const minPayment = totalInvoice > 0 ? parseFloat((totalInvoice * 0.15).toFixed(2)) : 0;

  const PRESETS = [
    { id: 'total',   label: 'Total',   value: totalInvoice },
    { id: 'minimum', label: 'Mínimo',  value: minPayment   },
    { id: 'custom',  label: 'Outro',   value: null         },
  ];

  const [selectedPreset, setSelectedPreset] = useState('total');
  const [displayAmount, setDisplayAmount]   = useState(toDisplay(totalInvoice));
  const [amount, setAmount]                 = useState(totalInvoice);
  const [debitAccountId, setDebitAccountId] = useState('');
  const [date, setDate]                     = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting]         = useState(false);

  // Pré-seleciona conta padrão de débito
  useEffect(() => {
    const def = accounts.find(
      (a) => (a.type === 'banco' || a.type === 'poupanca') && a.is_default
    ) ?? accounts.find((a) => a.type === 'banco' || a.type === 'poupanca');
    if (def) setDebitAccountId(def.id);
  }, [accounts]);

  const handlePresetChange = (presetId) => {
    setSelectedPreset(presetId);
    const p = PRESETS.find((x) => x.id === presetId);
    if (p?.value !== null) {
      setAmount(p.value);
      setDisplayAmount(toDisplay(p.value));
    }
  };

  const handleAmountChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) { setDisplayAmount(''); setAmount(0); return; }
    const intValue = parseInt(raw, 10);
    setAmount(intValue / 100);
    setDisplayAmount(toDisplay(intValue / 100));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!debitAccountId) { toast.error('Selecione a conta de débito.'); return; }
    if (amount <= 0)      { toast.error('Informe um valor válido.'); return; }

    setSubmitting(true);
    try {
      // Calcula mês de referência da fatura para a descrição
      const paymentDate  = new Date(date + 'T00:00:00');
      const closingDay   = creditCard.closing_day || creditCard.due_day;
      let invoiceMonth, invoiceYear;
      if (closingDay && paymentDate.getDate() > closingDay) {
        invoiceMonth = paymentDate.getMonth();
        invoiceYear  = paymentDate.getFullYear();
      } else {
        const ref = new Date(paymentDate.getFullYear(), paymentDate.getMonth() - 1, 1);
        invoiceMonth = ref.getMonth();
        invoiceYear  = ref.getFullYear();
      }
      const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                          'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      const description = `Pagamento Fatura ${creditCard.name} — ${monthNames[invoiceMonth]}/${invoiceYear}`;

      await api.post('/transactions/transfer', {
        description,
        amount,
        date,
        from_account_id: debitAccountId,
        to_account_id: creditCard.id,
      });

      // Após pagamento da fatura completa, avança para próximo ciclo
      if (amount >= totalInvoice * 0.99) {
        try {
          await api.post(`/accounts/${creditCard.id}/next-invoice`);
        } catch {
          // Não crítico — ignora silenciosamente
        }
      }

      toast.success('Pagamento registrado!');
      if (onPaymentConfirmed) onPaymentConfirmed();
      if (onClose) onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao registrar pagamento.');
    } finally {
      setSubmitting(false);
    }
  };

  const debitAccounts  = accounts.filter((a) => a.type === 'banco' || a.type === 'poupanca');
  const debitAccount   = debitAccounts.find((a) => a.id === debitAccountId);
  const isInsufficient = debitAccount && Number(debitAccount.balance ?? 0) < amount;

  const isClosed = invoiceData?.invoice_status === 'closed';

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pt-2">
      {/* Header */}
      <div className="flex items-center gap-4 bg-rose-500/5 p-4 rounded-2xl border border-rose-500/10">
        <div className="p-3 bg-rose-500/10 rounded-xl text-rose-600">
          <CreditCard size={22} strokeWidth={1.75} />
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold text-rose-500/70 uppercase tracking-widest">Fatura de</p>
          <p className="font-bold text-base">{creditCard.name}</p>
          {isClosed && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-500/10 rounded-full px-2 py-0.5 mt-1">
              Fatura fechada
            </span>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total da fatura</p>
          <p className="font-black text-lg tabular-nums text-rose-600">
            <PrivateValue value={formatCurrency(totalInvoice)} />
          </p>
        </div>
      </div>

      {/* Período da fatura */}
      {invoiceData && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground bg-secondary/30 rounded-xl px-4 py-3">
          <span>
            Período:{' '}
            <strong>
              {new Date(invoiceData.period_start + 'T00:00:00').toLocaleDateString('pt-BR')}
              {' — '}
              {new Date(invoiceData.period_end + 'T00:00:00').toLocaleDateString('pt-BR')}
            </strong>
          </span>
          {invoiceData.days_to_close !== null && invoiceData.days_to_close > 0 && (
            <span className={cn(
              'ml-auto font-semibold',
              invoiceData.days_to_close <= 3 ? 'text-destructive' :
              invoiceData.days_to_close <= 7 ? 'text-amber-500' : ''
            )}>
              Fecha em {invoiceData.days_to_close}d
            </span>
          )}
          {invoiceData.invoice_closed_at && (
            <span className="ml-auto text-muted-foreground">
              Fechada em {new Date(invoiceData.invoice_closed_at).toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>
      )}

      {/* Opções de valor */}
      <div className="space-y-2">
        <Label>Valor do pagamento</Label>
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePresetChange(p.id)}
              className={cn(
                'rounded-xl border p-3 text-center transition-all',
                selectedPreset === p.id
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide leading-tight mb-1">
                {p.label}
              </p>
              {p.value !== null ? (
                <p className="text-xs font-semibold tabular-nums">
                  <PrivateValue value={formatCurrency(p.value)} />
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">personalizado</p>
              )}
            </button>
          ))}
        </div>
        <Input
          type="text"
          placeholder="R$ 0,00"
          value={displayAmount}
          onChange={(e) => { setSelectedPreset('custom'); handleAmountChange(e); }}
          className={cn(
            'bg-secondary/30 border-none h-12 rounded-xl font-bold text-lg text-center',
            selectedPreset !== 'custom' && 'opacity-60'
          )}
        />
      </div>

      {/* Conta + Data */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Débitar de</Label>
          <Select value={debitAccountId} onValueChange={setDebitAccountId} required>
            <SelectTrigger className="bg-secondary/30 border-none h-11 rounded-xl">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {debitAccounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Data</Label>
          <Input
            type="date" value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-secondary/30 border-none h-11 rounded-xl"
          />
        </div>
      </div>

      {/* Aviso saldo insuficiente */}
      {isInsufficient && (
        <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-sm text-amber-700">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          <span>
            Saldo insuficiente em <strong>{debitAccount.name}</strong>{' '}
            (<PrivateValue value={formatCurrency(debitAccount.balance)} />).
            O pagamento ainda pode ser registrado.
          </span>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-11 rounded-xl">
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={submitting}
          className="flex-1 h-11 rounded-xl font-bold shadow-lg shadow-primary/20"
        >
          {submitting ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="mr-2 h-4 w-4" />
          )}
          Confirmar pagamento
        </Button>
      </div>
    </form>
  );
};

export default InvoicePaymentForm;
