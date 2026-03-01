import React from 'react';
import { ArrowUpCircle, ArrowDownCircle, Scale, PiggyBank, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import PrivateValue from '@/components/ui/PrivateValue';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const MonthlySummaryCard = ({ income, expense, result, savingsRate, loading }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <Card className="border-none shadow-md overflow-hidden animate-pulse h-full">
        <div className="p-8 h-full bg-secondary/10" />
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-md overflow-hidden group h-full">
      <CardContent className="p-0">
        <div className="p-8">
          <div className="flex items-center gap-2 mb-6">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Resultado Parcial</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-[14px] w-[14px] text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px] text-center">
                <p>O resultado pode ser negativo no início do mês porque as despesas chegam antes do salário. Este valor fica mais preciso no final do mês.</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="p-2 w-fit bg-success/10 rounded-lg">
                <ArrowUpCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Receitas</p>
                <p className="text-2xl font-bold text-success mt-1"><PrivateValue value={formatCurrency(income)} /></p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-2 w-fit bg-destructive/10 rounded-lg">
                <ArrowDownCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Despesas</p>
                <p className="text-2xl font-bold text-destructive mt-1"><PrivateValue value={formatCurrency(expense)} /></p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-2 w-fit bg-primary/10 rounded-lg">
                <Scale className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Resultado Líquido</p>
                <p className={cn(
                  "text-2xl font-bold mt-1",
                  result >= 0 ? "text-success" : "text-destructive"
                )}>
                  <PrivateValue value={formatCurrency(result)} />
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-2 w-fit bg-indigo-500/10 rounded-lg">
                <PiggyBank className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Taxa de Poupança</p>
                <p className="text-2xl font-bold text-indigo-500 mt-1">
                  {(savingsRate * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="h-1.5 w-full bg-primary/10" />
      </CardContent>
    </Card>
  );
};

export default MonthlySummaryCard;
