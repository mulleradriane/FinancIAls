import React from 'react';
import { Target, Clock, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import PrivateValue from '@/components/ui/PrivateValue';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const GoalItem = ({ goal }) => {
  // Ensure percentage is between 0 and 100 for the Progress component
  const progressValue = Math.min(Math.max(parseFloat(goal.percentage_completed), 0), 100);

  return (
    <div className="space-y-4 p-5 rounded-2xl border border-border bg-card hover:bg-accent/[0.02] transition-all duration-300">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-bold tracking-tight">{goal.name}</h4>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                Prazo: {new Date(goal.target_date + 'T12:00:00').toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <Badge
            variant={goal.on_track ? "secondary" : "destructive"}
            className={`text-[10px] font-bold uppercase px-2 py-0.5 ${goal.on_track ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20' : ''}`}
          >
            {goal.on_track ? "On Track" : "Behind"}
          </Badge>
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Progresso</span>
            <span className="text-xl font-bold tracking-tight">{goal.percentage_completed}%</span>
          </div>
          <div className="flex flex-col items-end text-right">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Acumulado / Alvo</span>
            <span className="text-sm font-medium">
              <PrivateValue value={`R$ ${parseFloat(goal.current_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} /> /
              <span className="text-primary ml-1">
                <PrivateValue value={`R$ ${parseFloat(goal.target_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
              </span>
            </span>
          </div>
        </div>
        <Progress value={progressValue} className="h-2.5 rounded-full bg-primary/10" />
      </div>
    </div>
  );
};

const GoalsCard = ({ goals, loading }) => {
  if (loading) {
    return (
      <Card className="border-none shadow-md rounded-2xl overflow-hidden">
        <CardContent className="p-8 space-y-6">
           <div className="flex items-center gap-2">
             <Skeleton className="h-4 w-4 rounded-full" />
             <Skeleton className="h-3 w-32" />
           </div>
           <Skeleton className="h-32 w-full rounded-2xl" />
           <Skeleton className="h-32 w-full rounded-2xl" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-md rounded-2xl overflow-hidden h-full">
      <CardContent className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary rounded-lg">
              <Target className="h-4 w-4 text-white" />
            </div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Metas Financeiras</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-[14px] w-[14px] text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px] text-center">
                <p>Progresso das suas metas financeiras ativas. O percentual é calculado com base no patrimônio atual em relação ao valor alvo definido.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Badge variant="outline" className="text-[10px] font-bold text-muted-foreground uppercase">
            {goals?.length || 0} {goals?.length === 1 ? 'Ativa' : 'Ativas'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals && goals.map((goal) => (
            <GoalItem key={goal.id} goal={goal} />
          ))}
          {(!goals || goals.length === 0) && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 border border-dashed rounded-2xl border-muted-foreground/20 bg-muted/5">
              <div className="p-3 bg-muted rounded-full mb-3">
                <Target className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Nenhuma meta ativa definida.</p>
              <p className="text-[11px] text-muted-foreground/60 mt-1 uppercase tracking-wider font-bold">Use o menu de Metas para começar.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GoalsCard;
