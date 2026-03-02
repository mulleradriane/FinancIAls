import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Sparkles, TrendingUp, AlertTriangle, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PrivateValue from '@/components/ui/PrivateValue';
import InfoTooltip from '@/components/ui/InfoTooltip';

// Função de formatação local
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

const ForecastCard = ({ forecast, loading }) => {
  if (loading) {
    return (
      <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Sparkles className="w-3 h-3" />
            Projeção Financeira
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            <div className="h-8 bg-muted rounded w-1/2"></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-12 bg-muted rounded"></div>
              <div className="h-12 bg-muted rounded"></div>
              <div className="h-12 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!forecast) return null;

  const {
    current_net_worth,
    avg_monthly_result_last_3m,
    projected_3m,
    projected_6m,
    projected_12m,
    months_until_zero,
    projected_date_of_zero
  } = forecast;

  const getStatus = () => {
    if (avg_monthly_result_last_3m > 0) {
      return {
        label: "Crescimento",
        icon: <TrendingUp className="w-3 h-3" />,
        color: "bg-green-100 text-green-700 border-green-200",
        indicator: "bg-green-500"
      };
    }
    if (avg_monthly_result_last_3m < 0) {
      return {
        label: "Risco de Zerar",
        icon: <AlertTriangle className="w-3 h-3" />,
        color: "bg-destructive/10 text-destructive border-destructive/20",
        indicator: "bg-destructive"
      };
    }
    return {
      label: "Estagnação",
      icon: <Minus className="w-3 h-3" />,
      color: "bg-blue-100 text-blue-700 border-blue-200",
      indicator: "bg-blue-500"
    };
  };

  const status = getStatus();

  return (
    <Card className="border-none shadow-sm bg-white/50 backdrop-blur-sm hover:bg-white/80 transition-all duration-300">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-blue-500" />
            Projeção Financeira
          </CardTitle>
          <InfoTooltip content="Projeção do patrimônio com base na média de resultado dos últimos 3 meses. É uma estimativa e pode variar conforme mudanças nos seus hábitos financeiros." />
        </div>
        <Badge variant="outline" className={`${status.color} border flex items-center gap-1.5 py-0.5`}>
          {status.icon}
          {status.label}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="text-4xl font-bold tracking-tight text-slate-900 mb-1">
            <PrivateValue value={formatCurrency(current_net_worth)} />
          </div>
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            Patrimônio Atual
            {avg_monthly_result_last_3m !== 0 && (
              <span className={`flex items-center gap-0.5 ${avg_monthly_result_last_3m > 0 ? 'text-green-600' : 'text-destructive'}`}>
                (<PrivateValue value={`${avg_monthly_result_last_3m > 0 ? '+' : ''}${formatCurrency(avg_monthly_result_last_3m)}`} />/mês)
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-100/50">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Em 3 Meses</div>
            <div className={`text-xl font-semibold ${projected_3m >= 0 ? 'text-slate-900' : 'text-destructive'}`}>
              <PrivateValue value={formatCurrency(projected_3m)} />
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-100/50">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Em 6 Meses</div>
            <div className={`text-xl font-semibold ${projected_6m >= 0 ? 'text-slate-900' : 'text-destructive'}`}>
              <PrivateValue value={formatCurrency(projected_6m)} />
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50/50 border border-slate-100/50">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Em 1 Ano</div>
            <div className={`text-xl font-semibold ${projected_12m >= 0 ? 'text-slate-900' : 'text-destructive'}`}>
              <PrivateValue value={formatCurrency(projected_12m)} />
            </div>
          </div>
        </div>

        {months_until_zero !== null && avg_monthly_result_last_3m < 0 && (
          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/[0.03] border border-destructive/10">
              <div className="p-2 rounded-full bg-destructive/10">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Risco de esgotamento em <span className="text-destructive font-bold">{Math.round(months_until_zero)} meses</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Projetado para: {new Date(projected_date_of_zero).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground italic text-center">
          * Projeção linear baseada no resultado médio dos últimos 3 meses fechados.
        </p>
      </CardContent>
    </Card>
  );
};

export default ForecastCard;
