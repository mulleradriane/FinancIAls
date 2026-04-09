import React, { useState, useEffect } from 'react';
import { goalsApi } from '@/api/api';
import analyticsApi from '@/api/analyticsApi';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import GoalForm from '@/components/GoalForm';
import {
  Plus, Target, Trash2, Calendar, TrendingUp, AlertCircle,
  CheckCircle2, MoreVertical, Edit2, Coins,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import PrivateValue from '@/components/ui/PrivateValue';
import { formatCurrency, parseLocalDate } from '@/lib/utils';

const Goals = () => {
  const [goals, setGoals] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
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

  const openAddModal = () => {
    setEditingGoal(null);
    setIsModalOpen(true);
  };

  const openEditModal = (goal) => {
    setEditingGoal(goal);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => setDeleteTarget(id);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await goalsApi.deleteGoal(deleteTarget);
      toast.success('Meta excluída!');
      fetchGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Erro ao excluir meta.');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Metas Financeiras</h1>
          <p className="text-muted-foreground mt-1">Defina objetivos e acompanhe seu progresso.</p>
        </div>
        <Button onClick={openAddModal} className="rounded-xl w-fit">
          <Plus className="mr-2 h-4 w-4" /> Nova Meta
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl" />
          ))
        ) : goals.length > 0 ? (
          goals.map((goal) => {
            const monthsLeft = goal.days_remaining > 0 ? goal.days_remaining / 30.44 : 0;
            const monthlyNeeded = monthsLeft >= 1 && goal.remaining_amount > 0
              ? goal.remaining_amount / monthsLeft
              : null;
            const isCompleted = parseFloat(goal.percentage_completed) >= 100;
            const targetDate = parseLocalDate(goal.target_date);
            const targetDateStr = targetDate
              ? targetDate.toLocaleDateString('pt-BR')
              : goal.target_date;

            return (
              <Card
                key={goal.id}
                className="group border-none shadow-sm hover:shadow-md transition-shadow duration-200 rounded-2xl overflow-hidden"
              >
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform duration-300">
                        <Target size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-base leading-tight">{goal.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="secondary"
                            className="text-[10px] uppercase font-bold tracking-wider"
                          >
                            {goal.goal_type === 'SAVINGS' ? 'Reserva' : 'Patrimônio'}
                          </Badge>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar size={10} />
                            <span className="text-[10px] font-medium">
                              Até {targetDateStr}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Badge
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 ${
                          isCompleted
                            ? 'bg-success/10 text-success border-success/20'
                            : goal.on_track
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-destructive/10 text-destructive border-destructive/20'
                        }`}
                      >
                        {isCompleted ? (
                          <span className="flex items-center gap-1"><CheckCircle2 size={10} /> Concluída</span>
                        ) : goal.on_track ? (
                          <span className="flex items-center gap-1"><CheckCircle2 size={10} /> No Prazo</span>
                        ) : (
                          <span className="flex items-center gap-1"><AlertCircle size={10} /> Atrasada</span>
                        )}
                      </Badge>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                          >
                            <MoreVertical size={15} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border-border/50 shadow-xl">
                          <DropdownMenuItem
                            onClick={() => openEditModal(goal)}
                            className="cursor-pointer gap-2 py-2"
                          >
                            <Edit2 size={14} className="text-primary" />
                            <span>Editar</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(goal.id)}
                            className="cursor-pointer gap-2 py-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 size={14} />
                            <span>Excluir</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                          Progresso
                        </p>
                        <p className="text-2xl font-black tabular-nums">
                          {goal.percentage_completed}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                          Acumulado / Alvo
                        </p>
                        <p className="text-sm font-bold">
                          <PrivateValue value={formatCurrency(goal.current_amount)} />
                          <span className="text-muted-foreground mx-1">/</span>
                          <span className="text-primary">
                            <PrivateValue value={formatCurrency(goal.target_amount)} />
                          </span>
                        </p>
                      </div>
                    </div>

                    <Progress
                      value={Math.min(parseFloat(goal.percentage_completed), 100)}
                      className="h-2 rounded-full bg-primary/10"
                    />

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <TrendingUp size={11} />
                        <span className="text-[11px] font-semibold">
                          Faltam <PrivateValue value={formatCurrency(goal.remaining_amount)} />
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {goal.days_remaining > 0 ? `${goal.days_remaining} dias` : 'Prazo encerrado'}
                      </span>
                    </div>
                  </div>

                  {/* Contribuição mensal sugerida */}
                  {monthlyNeeded && !isCompleted && (
                    <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Coins size={13} />
                        <span className="text-xs">Sugestão mensal para bater o prazo</span>
                      </div>
                      <span className="text-sm font-bold text-primary tabular-nums">
                        <PrivateValue value={formatCurrency(monthlyNeeded)} />
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : null}
      </div>

      {!loading && goals.length === 0 && (
        <EmptyState
          icon={Target}
          title="Nenhuma meta definida"
          description="Defina objetivos financeiros para acompanhar seu crescimento automaticamente."
          actionLabel="Criar Minha Primeira Meta"
          onAction={openAddModal}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl border-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add / Edit modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        setIsModalOpen(open);
        if (!open) setEditingGoal(null);
      }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingGoal ? 'Editar Meta' : 'Nova Meta Financeira'}</DialogTitle>
          </DialogHeader>
          <GoalForm
            goal={editingGoal}
            onGoalCreated={fetchGoals}
            onClose={() => { setIsModalOpen(false); setEditingGoal(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Goals;
