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

const TransactionList = ({ transactions, onEdit, onDelete }) => {
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
      {transactions.map((t, index) => (
        <Card
          key={`${t.id}-${t.account_name}-${index}`}
          className="p-4 hover:shadow-md transition-all duration-200 group relative overflow-hidden"
        >
          <div className="flex items-center gap-4">
            {getIcon(t)}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold truncate text-foreground">
                  {t.description}
                </span>
                {t.installment_number && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1 font-normal">
                    {t.installment_number}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-muted-foreground">
                  {new Date(t.date).toLocaleDateString('pt-BR')}
                </span>
                <span className="text-muted-foreground/30">•</span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {getAccountIcon(t.account_type)}
                  <span>{t.account_name}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1">
              <span className={cn(
                "font-bold text-lg",
                t.amount < 0 || t.category_name === 'Despesa' ? "text-destructive" : "text-success"
              )}>
                {formatCurrency(t.amount)}
              </span>
              <Badge
                variant="secondary"
                className="text-[10px] h-4 px-1.5 font-medium"
                style={{
                  backgroundColor: t.is_transfer ? undefined : `${t.category_color}20`,
                  color: t.is_transfer ? undefined : t.category_color,
                  border: t.is_transfer ? undefined : `1px solid ${t.category_color}30`
                }}
              >
                {t.category_name}
              </Badge>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!t.is_transfer && (
                  <DropdownMenuItem onClick={() => onEdit(t)}>
                    <Pencil size={14} className="mr-2" /> Editar
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => onDelete(t)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 size={14} className="mr-2" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default TransactionList;
