import React from 'react';
import { Landmark, TrendingUp, TrendingDown, Wallet, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const NetWorthCard = ({ netWorth, assets, liabilities, loading }) => {
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

  const isPositive = netWorth >= 0;

  return (
    <Card className="border-none shadow-md overflow-hidden group transition-all duration-300 h-full">
      <CardContent className="p-0">
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div className="p-2.5 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform">
              <Landmark className="h-6 w-6 text-primary" />
            </div>
            <div className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase border",
              isPositive
                ? "bg-success/[0.03] text-success/90 border-success/10"
                : "bg-destructive/[0.03] text-destructive/90 border-destructive/10"
            )}>
              {isPositive ? <TrendingUp size={10} strokeWidth={2.5} /> : <TrendingDown size={10} strokeWidth={2.5} />}
              {isPositive ? "Patrimônio Positivo" : "Patrimônio Negativo"}
            </div>
          </div>

          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Patrimônio Líquido Total</p>
          <h2 className="text-4xl font-bold mt-2 tracking-tight">
            {formatCurrency(netWorth)}
          </h2>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-success">
                <ArrowUpRight size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Ativos</span>
              </div>
              <p className="text-lg font-bold">{formatCurrency(assets)}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-destructive">
                <ArrowDownRight size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Passivos</span>
              </div>
              <p className="text-lg font-bold">{formatCurrency(liabilities)}</p>
            </div>
          </div>
        </div>
        <div className={cn(
          "h-1.5 w-full transition-colors",
          isPositive ? "bg-success/20 group-hover:bg-success/40" : "bg-destructive/20 group-hover:bg-destructive/40"
        )} />
      </CardContent>
    </Card>
  );
};

export default NetWorthCard;
