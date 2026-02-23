import React, { useState, useEffect } from 'react';
import { goalsApi } from '@/api/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const GoalForm = ({ goal, onGoalCreated, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    target_amount: '',
    start_date: new Date().toISOString().split('T')[0],
    target_date: '',
    goal_type: 'SAVINGS'
  });

  useEffect(() => {
    if (goal) {
      setFormData({
        name: goal.name,
        target_amount: goal.target_amount.toString(),
        start_date: goal.start_date,
        target_date: goal.target_date,
        goal_type: goal.goal_type
      });
    }
  }, [goal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (goal) {
        // Update not explicitly requested but good to have if we want to support it
        // await api.put(`/goals/${goal.id}`, formData);
        // toast.success('Meta atualizada!');
      } else {
        await goalsApi.createGoal({
          ...formData,
          target_amount: parseFloat(formData.target_amount)
        });
        toast.success('Meta criada com sucesso!');
      }
      onGoalCreated();
      onClose();
    } catch (error) {
      console.error('Error saving goal:', error);
      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        toast.error(detail[0].msg || 'Erro ao salvar meta.');
      } else {
        toast.error(detail || 'Erro ao salvar meta.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome da Meta</Label>
        <Input
          id="name"
          placeholder="Ex: Viagem Japão, Reserva de Emergência..."
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          className="rounded-xl"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="target_amount">Valor Alvo (R$)</Label>
          <Input
            id="target_amount"
            type="number"
            step="0.01"
            placeholder="0,00"
            value={formData.target_amount}
            onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
            required
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="goal_type">Tipo de Meta</Label>
          <Select
            value={formData.goal_type}
            onValueChange={(value) => setFormData({ ...formData, goal_type: value })}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SAVINGS">Reserva / Economia</SelectItem>
              <SelectItem value="NET_WORTH">Patrimônio Líquido</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start_date">Data de Início</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            required
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="target_date">Data Alvo (Prazo)</Label>
          <Input
            id="target_date"
            type="date"
            value={formData.target_date}
            onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
            required
            className="rounded-xl"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl">
          Cancelar
        </Button>
        <Button type="submit" disabled={loading} className="rounded-xl px-8">
          {loading ? 'Salvando...' : 'Criar Meta'}
        </Button>
      </div>
    </form>
  );
};

export default GoalForm;
