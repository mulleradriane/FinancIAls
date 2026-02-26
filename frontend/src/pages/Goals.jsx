import React, { useState, useEffect } from 'react';
import api, { goalsApi } from '@/api/api';
import analyticsApi from '@/api/analyticsApi';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import GoalForm from '@/components/GoalForm';
import { Plus, Target, Trash2, Calendar, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import PrivateValue from '@/components/ui/PrivateValue';

const Goals = () => {
  const [goals, setGoals] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const response = await analyticsApi.getGoalsProgress();
      setGoals(response.data);
    } catch (error) {
      console.error('Error fetching goals:', error);
      toast.error('Erro ao carregar metas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta meta?')) {
      try {
        await goalsApi.deleteGoal(id);
        toast.success('Meta excluída!');
        fetchGoals();
      } catch (error) {
        console.error('Error deleting goal:', error);
        toast.error('Erro ao excluir meta.');
      }
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Metas Financeiras</h1>
          <p className="text-muted-foreground mt-1">Defina objetivos e acompanhe seu progresso.</p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="rounded-xl shadow-lg shadow-primary/20"
        >
          <Plus className="mr-2 h-5 w-5" /> Nova Meta
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl" />
          ))
        ) : goals.length > 0 ? (
          goals.map((goal) => (
            <Card
              key={goal.id}
              className="group border-none shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden"
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-2xl text-primary group-hover:scale-110 transition-transform duration-300">
                      <Target size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{goal.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                         <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
                           {goal.goal_type === 'SAVINGS' ? 'Reserva' : 'Patrimônio'}
                         </Badge>
                         <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar size={12} />
                            <span className="text-[10px] font-medium uppercase tracking-tighter">Até {formatDate(goal.target_date)}</span>
                         </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={goal.on_track ? "secondary" : "destructive"}
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 ${goal.on_track ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : ''}`}
                    >
                      {goal.on_track ? (
                        <div className="flex items-center gap-1"><CheckCircle2 size={10} /> No Prazo</div>
                      ) : (
                        <div className="flex items-center gap-1"><AlertCircle size={10} /> Atrasado</div>
                      )}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(goal.id)}
                      className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} className="text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                   <div className="flex justify-between items-end">
                      <div className="space-y-1">
                         <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Progresso Real</p>
                         <p className="text-2xl font-black">{goal.percentage_completed}%</p>
                      </div>
                      <div className="text-right space-y-1">
                         <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Acumulado / Alvo</p>
                         <p className="text-sm font-bold">
                            <PrivateValue value={formatCurrency(goal.current_amount)} />
                            <span className="text-muted-foreground mx-1">/</span>
                            <span className="text-primary"><PrivateValue value={formatCurrency(goal.target_amount)} /></span>
                         </p>
                      </div>
                   </div>
                   <Progress value={Math.min(parseFloat(goal.percentage_completed), 100)} className="h-3 rounded-full bg-primary/10" />

                   <div className="flex justify-between items-center pt-2">
                      <div className="flex items-center gap-1 text-muted-foreground">
                         <TrendingUp size={12} />
                         <span className="text-[10px] font-bold uppercase tracking-tighter">
                            Faltam <PrivateValue value={formatCurrency(goal.remaining_amount)} />
                         </span>
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">
                         {goal.days_remaining} dias restantes
                      </div>
                   </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : null}
      </div>

      {!loading && goals.length === 0 && (
        <div className="col-span-full">
          <EmptyState
            icon={Target}
            title="Nenhuma meta definida"
            description="Você ainda não criou objetivos financeiros. Defina metas para acompanhar seu crescimento automaticamente."
            actionLabel="Criar Minha Primeira Meta"
            onAction={() => setIsModalOpen(true)}
          />
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nova Meta Financeira</DialogTitle>
          </DialogHeader>
          <GoalForm
            onGoalCreated={fetchGoals}
            onClose={() => setIsModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Goals;
