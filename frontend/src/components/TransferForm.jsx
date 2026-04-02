import React, { useState } from 'react';
import api from '@/api/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, CreditCard, Landmark, Wallet, PiggyBank, Briefcase, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import PrivateValue from '@/components/ui/PrivateValue';

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);

const getAccountIcon = (type, size = 16) => {
  const props = { size, strokeWidth: 1.75 };
  switch (type) {
    case 'carteira':       return <Wallet {...props} />;
    case 'banco':          return <Landmark {...props} />;
    case 'poupanca':       return <PiggyBank {...props} />;
    case 'investimento':   return <Briefcase {...props} />;
    case 'cartao_credito': return <CreditCard {...props} />;
    default:               return <Landmark {...props} />;
  }
};

const ACCENT = {
  banco:           'bg-blue-500/10 text-blue-600 border-blue-500/20',
  carteira:        'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  poupanca:        'bg-teal-500/10 text-teal-600 border-teal-500/20',
  investimento:    'bg-violet-500/10 text-violet-600 border-violet-500/20',
  cartao_credito:  'bg-rose-500/10 text-rose-600 border-rose-500/20',
};

// Mini card de conta para seleção
const AccountPicker = ({ label, accounts, selectedId, onSelect }) => {
  const selected = accounts.find((a) => a.id === selectedId);

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</p>

      {/* Conta selecionada */}
      {selected ? (
        <div className={cn(
          'flex items-center gap-3 p-3 rounded-xl border',
          ACCENT[selected.type] ?? 'bg-secondary/30 text-foreground border-border'
        )}>
          <div className="flex-shrink-0">{getAccountIcon(selected.type, 16)}</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate leading-tight">{selected.name}</p>
            <p className="text-xs opacity-70 font-medium tabular-nums mt-0.5">
              <PrivateValue value={formatCurrency(selected.balance ?? 0)} />
            </p>
          </div>
        </div>
      ) : (
        <div className="h-[58px] rounded-xl border border-dashed border-border flex items-center justify-center text-sm text-muted-foreground">
          Selecione abaixo
        </div>
      )}

      {/* Lista de opções */}
      <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
        {accounts
          .filter((a) => a.id !== selectedId)
          .map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelect(a.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/60 transition-colors text-left"
            >
              <div className={cn(
                'p-1.5 rounded-lg border flex-shrink-0',
                ACCENT[a.type] ?? 'bg-muted text-muted-foreground border-border'
              )}>
                {getAccountIcon(a.type, 13)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate leading-tight">{a.name}</p>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums flex-shrink-0">
                <PrivateValue value={formatCurrency(a.balance ?? 0)} />
              </span>
            </button>
          ))}
      </div>
    </div>
  );
};

// ── TransferForm ───────────────────────────────────────────────────────────────
const TransferForm = ({ accounts, onTransferCreated, onClose }) => {
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId]     = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [amount, setAmount]               = useState(0);
  const [date, setDate]                   = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription]     = useState('');
  const [step, setStep]                   = useState('form'); // 'form' | 'confirm'

  const fromAccount = accounts.find((a) => a.id === fromAccountId);
  const toAccount   = accounts.find((a) => a.id === toAccountId);

  const handleAmountChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (!value) { setDisplayAmount(''); setAmount(0); return; }
    const intValue = parseInt(value, 10);
    setAmount(intValue / 100);
    setDisplayAmount(
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(intValue / 100)
    );
  };

  const handlePreview = () => {
    if (!fromAccountId || !toAccountId) { toast.error('Selecione as contas de origem e destino.'); return; }
    if (fromAccountId === toAccountId)  { toast.error('Contas de origem e destino devem ser diferentes.'); return; }
    if (amount <= 0)                    { toast.error('Informe um valor válido.'); return; }
    setStep('confirm');
  };

  const handleSubmit = async () => {
    try {
      const nature =
        fromAccount?.type === 'investimento' || toAccount?.type === 'investimento'
          ? 'INVESTMENT'
          : 'TRANSFER';

      await api.post('/transactions/', {
        account_id: fromAccountId,
        to_account_id: toAccountId,
        amount,
        nature,
        date,
        description: description || 'Transferência entre contas',
      });

      toast.success('Transferência realizada!');
      if (onTransferCreated) onTransferCreated();
      if (onClose) onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao realizar transferência.');
    }
  };

  // ── Tela de confirmação ──────────────────────────────────────────────────
  if (step === 'confirm') {
    return (
      <div className="space-y-6 pt-2">
        {/* Resumo visual De → Para */}
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex-1 rounded-xl border p-4',
            ACCENT[fromAccount?.type] ?? 'bg-secondary/30 border-border'
          )}>
            <p className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1">De</p>
            <div className="flex items-center gap-2">
              {getAccountIcon(fromAccount?.type, 14)}
              <p className="font-semibold text-sm truncate">{fromAccount?.name}</p>
            </div>
            <p className="text-xs opacity-70 mt-1 tabular-nums">
              <PrivateValue value={formatCurrency(fromAccount?.balance ?? 0)} />
            </p>
          </div>

          <div className="flex-shrink-0 p-2 bg-primary/10 rounded-full text-primary">
            <ArrowRight size={16} />
          </div>

          <div className={cn(
            'flex-1 rounded-xl border p-4',
            ACCENT[toAccount?.type] ?? 'bg-secondary/30 border-border'
          )}>
            <p className="text-[9px] font-bold uppercase tracking-widest opacity-60 mb-1">Para</p>
            <div className="flex items-center gap-2">
              {getAccountIcon(toAccount?.type, 14)}
              <p className="font-semibold text-sm truncate">{toAccount?.name}</p>
            </div>
            <p className="text-xs opacity-70 mt-1 tabular-nums">
              <PrivateValue value={formatCurrency(toAccount?.balance ?? 0)} />
            </p>
          </div>
        </div>

        {/* Valor */}
        <div className="bg-secondary/30 rounded-2xl p-5 text-center">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Valor a transferir</p>
          <p className="text-3xl font-black tabular-nums">{displayAmount || 'R$ 0,00'}</p>
          <p className="text-xs text-muted-foreground mt-1">{date}</p>
          {description && <p className="text-xs text-muted-foreground mt-0.5 italic">"{description}"</p>}
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1 rounded-xl h-11" onClick={() => setStep('form')}>
            Voltar
          </Button>
          <Button type="button" className="flex-1 rounded-xl h-11 font-bold shadow-lg shadow-primary/20" onClick={handleSubmit}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Confirmar
          </Button>
        </div>
      </div>
    );
  }

  // ── Formulário principal ──────────────────────────────────────────────────
  return (
    <div className="space-y-6 pt-2">
      {/* De / Para — duas colunas */}
      <div className="grid grid-cols-2 gap-4">
        <AccountPicker
          label="De"
          accounts={accounts.filter((a) => a.id !== toAccountId)}
          selectedId={fromAccountId}
          onSelect={setFromAccountId}
        />

        <AccountPicker
          label="Para"
          accounts={accounts.filter((a) => a.id !== fromAccountId)}
          selectedId={toAccountId}
          onSelect={setToAccountId}
        />
      </div>

      {/* Valor + Data */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="transferAmount">Valor</Label>
          <Input
            id="transferAmount"
            type="text"
            placeholder="R$ 0,00"
            value={displayAmount}
            onChange={handleAmountChange}
            className="bg-secondary/30 border-none h-11 rounded-xl font-semibold text-lg"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="transferDate">Data</Label>
          <Input
            id="transferDate"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-secondary/30 border-none h-11 rounded-xl"
          />
        </div>
      </div>

      {/* Descrição */}
      <div className="space-y-2">
        <Label htmlFor="transferDescription">Descrição (opcional)</Label>
        <Input
          id="transferDescription"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Transferência para reserva de emergência"
          className="bg-secondary/30 border-none h-11 rounded-xl"
        />
      </div>

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-11 rounded-xl">
          Cancelar
        </Button>
        <Button type="button" className="flex-1 h-11 rounded-xl font-bold shadow-lg shadow-primary/20" onClick={handlePreview}>
          Revisar transferência
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default TransferForm;
