import React, { useState, useEffect } from 'react';
import { goalsApi } from '@/api/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { localDateStr, cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PiggyBank, TrendingUp, ArrowRight } from 'lucide-react';

const formatBRL = (value) => {
  if (!value && value !== 0) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const GOAL_TYPES = [
  {
    value: 'SAVINGS',
    label: 'Reserva / Economia',
    icon: PiggyBank,
    activeClass: 'bg-success/10 text-success border-success/40',
    iconClass: 'text-success',
  },
  {
    value: 'NET_WORTH',
    label: 'Patrimônio Líquido',
    icon: TrendingUp,
    activeClass: 'bg-primary/10 text-primary border-primary/40',
    iconClass: 'text-primary',
  },
];

const GoalForm = ({ goal, onGoalCreated, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    target_amount: '',
    start_date: localDateStr(),
    target_date: '',
    goal_type: 'SAVINGS',
  });

  useEffect(() => {
    if (goal) {
      setFormData({
        name: goal.name,
        target_amount: goal.target_amount.toString(),
        start_date: goal.start_date,
        target_date: goal.target_date,
        goal_type: goal.goal_type,
      });
    }
  }, [goal]);

  const handleAmountChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '');
    if (!digits) {
      setFormData((prev) => ({ ...prev, target_amount: '' }));
    } else {
      const numeric = parseInt(digits, 10) / 100;
      setFormData((prev) => ({ ...prev, target_amount: numeric.toString() }));
    }
    if (errors.target_amount) setErrors((prev) => ({ ...prev, target_amount: '' }));
  };

  const handleDateChange = (field) => (e) => {
    const val = e.target.value;
    if (val && parseInt(val.split('-')[0], 10) > 9999) return;
    setFormData((prev) => ({ ...prev, [field]: val }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Informe o nome da meta.';
    if (!formData.target_amount || parseFloat(formData.target_amount) <= 0)
      newErrors.target_amount = 'Informe um valor maior que zero.';
    if (!formData.start_date) newErrors.start_date = 'Informe a data de início.';
    if (!formData.target_date) newErrors.target_date = 'Informe a data alvo.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const payload = { ...formData, target_amount: parseFloat(formData.target_amount) };
    try {
      if (goal) {
        await goalsApi.updateGoal(goal.id, payload);
        toast.success('Meta atualizada!');
      } else {
        await goalsApi.createGoal(payload);
        toast.success('Meta criada com sucesso!');
      }
      onGoalCreated();
      onClose();
    } catch (error) {
      console.error('Error saving goal:', error);
      const detail = error.response?.data?.detail;
      toast.error(Array.isArray(detail) ? detail[0].msg : (detail || 'Erro ao salvar meta.'));
    } finally {
      setLoading(false);
    }
  };

  const activeType = GOAL_TYPES.find((t) => t.value === formData.goal_type);
  const amountDisplay = formData.target_amount ? formatBRL(parseFloat(formData.target_amount)) : '';

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 pt-2">

      {/* ── Tipo de meta ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {GOAL_TYPES.map(({ value, label, icon: Icon, activeClass, iconClass }) => {
          const isActive = formData.goal_type === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, goal_type: value }))}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-150',
                isActive
                  ? activeClass
                  : 'border-border text-muted-foreground hover:border-border/80 hover:bg-muted/40',
              )}
            >
              <Icon className={cn('h-5 w-5 shrink-0', isActive ? iconClass : 'text-muted-foreground')} />
              <span className="text-sm font-medium leading-tight">{label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Valor em destaque ────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
          Valor Alvo
        </Label>
        <Input
          type="text"
          inputMode="numeric"
          placeholder="R$ 0,00"
          value={amountDisplay}
          onChange={handleAmountChange}
          className={cn(
            'text-center text-2xl font-bold h-14 rounded-xl border-none',
            formData.goal_type === 'SAVINGS' ? 'bg-success/5' : 'bg-primary/5',
            errors.target_amount && 'ring-2 ring-destructive',
          )}
        />
        {errors.target_amount && (
          <p className="text-xs text-destructive">{errors.target_amount}</p>
        )}
      </div>

      {/* ── Nome da meta ─────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label htmlFor="name" className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
          Nome da Meta
        </Label>
        <Input
          id="name"
          placeholder="Ex: Viagem ao Japão, Reserva de Emergência..."
          value={formData.name}
          onChange={(e) => {
            setFormData({ ...formData, name: e.target.value });
            if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
          }}
          className={cn(
            'rounded-xl bg-secondary/40 border-none h-11',
            errors.name && 'ring-2 ring-destructive',
          )}
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>

      {/* ── Período (início → prazo) ──────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
          Período
        </Label>
        <div className="flex items-start gap-2">
          <div className="space-y-1 flex-1">
            <p className="text-[11px] text-muted-foreground font-medium">Início</p>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={handleDateChange('start_date')}
              className={cn(
                'rounded-xl bg-secondary/40 border-none h-10 w-fit',
                errors.start_date && 'ring-2 ring-destructive',
              )}
            />
            {errors.start_date && <p className="text-xs text-destructive">{errors.start_date}</p>}
          </div>

          <div className="flex items-center pt-6 text-muted-foreground">
            <ArrowRight className="h-4 w-4" />
          </div>

          <div className="space-y-1 flex-1">
            <p className="text-[11px] text-muted-foreground font-medium">Prazo</p>
            <Input
              id="target_date"
              type="date"
              value={formData.target_date}
              onChange={handleDateChange('target_date')}
              className={cn(
                'rounded-xl bg-secondary/40 border-none h-10 w-fit',
                errors.target_date && 'ring-2 ring-destructive',
              )}
            />
            {errors.target_date && <p className="text-xs text-destructive">{errors.target_date}</p>}
          </div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl">
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className={cn(
            'rounded-xl px-8',
            activeType?.value === 'SAVINGS'
              ? 'bg-success hover:bg-success/90 text-success-foreground shadow-md shadow-success/20'
              : 'shadow-md shadow-primary/20',
          )}
        >
          {loading ? 'Salvando...' : goal ? 'Salvar Alterações' : 'Criar Meta'}
        </Button>
      </div>
    </form>
  );
};

export default GoalForm;
