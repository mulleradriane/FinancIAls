import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CircleArrowUp, CircleArrowDown, Scale, PiggyBank } from 'lucide-react';
import InfoTooltip from '@/components/ui/InfoTooltip';
import PrivateValue from '@/components/ui/PrivateValue';

const MonthlySummaryCard = ({ data }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const calculateSavingsRate = () => {
    if (!data) return 0;
    const totalIncome = data.totalIncome || 0;
    const totalExpense = data.totalExpense || 0;
    if (totalIncome === 0) return 0;
    return ((totalIncome - totalExpense) / totalIncome) * 100;
  };

  const savingsRate = calculateSavingsRate();
  const netResult = (data?.totalIncome || 0) - (data?.totalExpense || 0);

  return (
    <Card className="border-none shadow-sm">
      <CardContent className="p-8">
        <div className="flex items-center gap-2 mb-6">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            Resultado Parcial
          </p>
          <InfoTooltip content="O resultado pode ser negativo no início do mês porque as despesas chegam antes do salário. Este valor fica mais preciso no final do mês." />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="p-2 w-fit bg-success/10 rounded-lg">
              <CircleArrowUp className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Receitas
              </p>
              <p className="text-2xl font-bold text-success mt-1">
                <PrivateValue value={formatCurrency(data?.totalIncome || 0)} />
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-2 w-fit bg-destructive/10 rounded-lg">
              <CircleArrowDown className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Despesas
              </p>
              <p className="text-2xl font-bold text-destructive mt-1">
                <PrivateValue value={formatCurrency(data?.totalExpense || 0)} />
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-2 w-fit bg-primary/10 rounded-lg">
              <Scale className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Resultado Líquido
              </p>
              <p className={`text-2xl font-bold mt-1 ${netResult >= 0 ? 'text-success' : 'text-destructive'}`}>
                <PrivateValue value={formatCurrency(netResult)} />
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-2 w-fit bg-indigo-500/10 rounded-lg">
              <PiggyBank className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Taxa de Poupança
              </p>
              <p className="text-2xl font-bold text-indigo-500 mt-1">
                {savingsRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlySummaryCard;