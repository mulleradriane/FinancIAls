import React from 'react';
import { Flame, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import PrivateValue from '@/components/ui/PrivateValue';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const BurnRateCard = ({ avgMonthlyExpense, trend, previousAvg, loading }) => {
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

  const getTrendIcon = () => {
    switch (trend) {
      case 'UP': return <TrendingUp size={14} className="text-destructive" />;
      case 'DOWN': return <TrendingDown size={14} className="text-success" />;
      default: return <Minus size={14} className="text-muted-foreground" />;
    }
  };

  const getTrendText = () => {
    switch (trend) {
      case 'UP': return "Em alta";
      case 'DOWN': return "Em queda";
      default: return "Estável";
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'UP': return "text-destructive bg-destructive/5 border-destructive/10";
      case 'DOWN': return "text-success bg-success/5 border-success/10";
      default: return "text-muted-foreground bg-muted/5 border-muted/10";
    }
  };

  return (
    <Card className="border-none shadow-md overflow-hidden group h-full">
      <CardContent className="p-0">
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div className="p-2.5 bg-orange-500/10 rounded-xl group-hover:scale-110 transition-transform">
              <Flame className="h-6 w-6 text-orange-500" />
            </div>
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
              getTrendColor()
            )}>
              {getTrendIcon()}
              {getTrendText()}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Burn Rate (Média 3 meses)</p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-[14px] w-[14px] text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[250px] text-center">
                  <p>Média dos seus gastos mensais nos últimos 3 meses. Indica o ritmo de consumo do seu dinheiro. Tendência de alta significa que você está gastando mais do que antes.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <h2 className="text-4xl font-bold mt-2 tracking-tight">
            <PrivateValue value={formatCurrency(avgMonthlyExpense)} />
          </h2>

          <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium">Média anterior:</span>
            <span className="font-bold"><PrivateValue value={formatCurrency(previousAvg)} /></span>
          </div>
        </div>
        <div className="h-1.5 w-full bg-orange-500/10" />
      </CardContent>
    </Card>
  );
};

export default BurnRateCard;
