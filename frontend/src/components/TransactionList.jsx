import React from 'react';
import {
  MoreVertical,
  Pencil,
  Trash2,
  ArrowLeftRight,
  Landmark,
  Wallet,
  CreditCard,
  Tag
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const TransactionList = ({ transactions, onEdit, onDelete, highlightId }) => {
  const getAccountIcon = (type) => {
    const iconProps = { size: 12, className: "text-muted-foreground" };
    switch (type) {
      case 'carteira': return <Wallet {...iconProps} />;
      case 'banco': return <Landmark {...iconProps} />;
      case 'poupanca': return <Tag {...iconProps} />;
      case 'investimento': return <Tag {...iconProps} />;
      case 'cartao_credito': return <CreditCard {...iconProps} />;
      default: return <Landmark {...iconProps} />;
    }
  };

  const getIcon = (t) => {
    if (t.is_transfer) return <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full"><ArrowLeftRight size={18} className="text-blue-600 dark:text-blue-400" /></div>;
    return (
      <div
        className="w-10 h-10 flex items-center justify-center rounded-full text-lg border bg-secondary/30"
        style={{ borderColor: `${t.category_color}40` }}
      >
        {t.category_icon || '💰'}
      </div>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  if (transactions.length === 0) {
    return (
      <Card className="p-12 text-center border-dashed">
        <p className="text-muted-foreground">Nenhuma transação encontrada.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((t) => (
        <Card
          key={`${t.id}-${t.account_name}`}
          className={cn(
            "p-5 transition-all duration-300 group relative overflow-hidden border-none shadow-sm",
            "hover:shadow-md hover:-translate-y-0.5",
            highlightId === t.id ? "bg-primary/[0.04] ring-1 ring-primary/10" : "bg-card"
          )}
        >
          <div className="flex items-center gap-5">
            {getIcon(t)}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[17px] tracking-tight truncate text-foreground">
                  {t.description}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
                <Badge
                  variant="secondary"
                  className="text-[10px] h-4.5 px-2 font-semibold uppercase tracking-wider"
                  style={{
                    backgroundColor: t.is_transfer ? undefined : `${t.category_color}12`,
                    color: t.is_transfer ? undefined : t.category_color,
                    border: t.is_transfer ? undefined : `1px solid ${t.category_color}20`
                  }}
                >
                  {t.category_is_system ? 'Sistema' : t.category_name}
                </Badge>

                {t.is_recurring && (
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/80">
                    <span className="text-muted-foreground/30">•</span>
                    {t.recurring_type === 'installment' ? (
                      <span className="flex items-center gap-1">
                        <span>📦</span> {t.installment_number}/{t.total_installments} Parcelado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <span>🔁</span> Recorrente
                      </span>
                    )}
                  </div>
                )}

                <span className="text-muted-foreground/30">•</span>
                <span className="text-[11px] font-medium text-muted-foreground/70">
                  {new Date(t.date).toLocaleDateString('pt-BR')}
                </span>

                <span className="text-muted-foreground/30">•</span>
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground/70">
                  {getAccountIcon(t.account_type)}
                  <span>{t.account_name}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end justify-center min-w-[130px]">
              <span className={cn(
                "font-semibold text-2xl tracking-tighter leading-none mb-1",
                t.type === 'expense' ? "text-destructive" : "text-success"
              )}>
                {t.type === 'expense' ? '-' : '+'}{formatCurrency(Math.abs(t.amount))}
              </span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-all duration-150">
                  <MoreVertical size={18} className="text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!t.is_transfer && !t.category_is_system && (
                  <DropdownMenuItem onClick={() => onEdit(t)}>
                    <Pencil size={14} className="mr-2" /> Editar
                  </DropdownMenuItem>
                )}
                {!t.category_is_system ? (
                  <DropdownMenuItem
                    onClick={() => onDelete(t)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 size={14} className="mr-2" /> Excluir
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem disabled className="text-muted-foreground opacity-50">
                    <Trash2 size={14} className="mr-2" /> Protegido
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default TransactionList;
