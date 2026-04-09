import React from 'react';
import {
  MoreVertical,
  Pencil,
  Trash2,
  ArrowLeftRight,
  Landmark,
  Wallet,
  CreditCard,
  Tag,
  Package,
  RefreshCw,
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
import { cn, parseLocalDate, formatCurrency, localDateStr } from '@/lib/utils';
import PrivateValue from '@/components/ui/PrivateValue';

// ── helpers ────────────────────────────────────────────────────────────────────
const getAccountIcon = (type) => {
  const p = { size: 11, className: 'text-muted-foreground' };
  switch (type) {
    case 'carteira':      return <Wallet {...p} />;
    case 'banco':         return <Landmark {...p} />;
    case 'cartao_credito': return <CreditCard {...p} />;
    default:              return <Landmark {...p} />;
  }
};

const getTransactionIcon = (t) => {
  if (t.is_transfer) {
    return (
      <div className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-500/10 border border-blue-500/20 flex-shrink-0">
        <ArrowLeftRight size={16} className="text-blue-500" />
      </div>
    );
  }
  return (
    <div
      className="w-9 h-9 flex items-center justify-center rounded-full text-base border flex-shrink-0"
      style={{
        backgroundColor: `${t.category_color}14`,
        borderColor: `${t.category_color}28`,
      }}
    >
      {t.category_icon || '💰'}
    </div>
  );
};

const getDateLabel = (dateStr) => {
  const now = new Date();
  const todayStr = localDateStr(now);
  const yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayStr = localDateStr(yesterdayDate);

  if (dateStr === todayStr) return 'Hoje';
  if (dateStr === yesterdayStr) return 'Ontem';

  const date = parseLocalDate(dateStr);
  const label = date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

// ── Transaction row ────────────────────────────────────────────────────────────
const TransactionRow = ({ t, onEdit, onDelete, highlightId }) => (
  <Card
    className={cn(
      'px-4 py-3 transition-all duration-300 group relative overflow-hidden border-none shadow-sm',
      'hover:shadow-md hover:-translate-y-px',
      highlightId === t.id
        ? 'bg-primary/[0.04] ring-1 ring-primary/10'
        : 'bg-card',
    )}
  >
    <div className="flex items-center gap-3">
      {getTransactionIcon(t)}

      {/* Description + meta */}
      <div className="flex-1 min-w-0">
        <span className="font-semibold text-base leading-tight truncate block text-foreground">
          {t.description}
        </span>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0 h-4 font-semibold uppercase tracking-wider"
            style={{
              backgroundColor: t.is_transfer ? undefined : `${t.category_color}12`,
              color: t.is_transfer ? undefined : t.category_color,
              border: t.is_transfer ? undefined : `1px solid ${t.category_color}20`,
            }}
          >
            {t.category_is_system ? 'Sistema' : t.category_name}
          </Badge>

          {t.is_recurring && (
            <>
              <span className="text-muted-foreground/30 text-[10px]">·</span>
              {t.recurring_type === 'installment' ? (
                <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground/70">
                  <Package size={10} className="text-muted-foreground/50" />
                  {t.installment_number}/{t.total_installments} parcelas
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground/70">
                  <RefreshCw size={10} className="text-muted-foreground/50" />
                  Recorrente
                </span>
              )}
            </>
          )}

          <span className="text-muted-foreground/30 text-[10px]">·</span>
          <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground/70">
            {getAccountIcon(t.account_type)}
            <span>{t.account_name}</span>
          </div>
        </div>
      </div>

      {/* Amount */}
      <span className={cn(
        'font-bold text-xl tabular-nums tracking-tight leading-none flex-shrink-0',
        t.amount < 0 ? 'text-destructive' : 'text-success',
      )}>
        <PrivateValue value={`${t.amount < 0 ? '-' : '+'}${formatCurrency(Math.abs(t.amount))}`} />
      </span>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-foreground"
          >
            <MoreVertical size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-xl">
          {!t.is_transfer && !t.category_is_system && (
            <DropdownMenuItem onClick={() => onEdit(t)} className="cursor-pointer gap-2">
              <Pencil size={14} className="text-primary" /> Editar
            </DropdownMenuItem>
          )}
          {!t.category_is_system ? (
            <DropdownMenuItem
              onClick={() => onDelete(t)}
              className="cursor-pointer gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 size={14} /> Excluir
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled className="gap-2 text-muted-foreground opacity-50">
              <Trash2 size={14} /> Protegido
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </Card>
);

// ── Main component ─────────────────────────────────────────────────────────────
const TransactionList = ({ transactions, onEdit, onDelete, highlightId }) => {
  if (transactions.length === 0) {
    return (
      <Card className="p-12 text-center border-dashed">
        <p className="text-muted-foreground">Nenhuma transação encontrada.</p>
      </Card>
    );
  }

  // Group by date (preserves server sort order within each day)
  const groups = {};
  const dateOrder = [];
  for (const t of transactions) {
    if (!groups[t.date]) {
      groups[t.date] = [];
      dateOrder.push(t.date);
    }
    groups[t.date].push(t);
  }

  return (
    <div className="space-y-5">
      {dateOrder.map((dateStr) => {
        const group = groups[dateStr];

        // Net for the day (INCOME positive, EXPENSE negative, skip transfers)
        const dayNet = group.reduce((sum, t) => {
          if (!t.is_transfer) return sum + Number(t.amount);
          return sum;
        }, 0);
        const hasNet = group.some((t) => !t.is_transfer);

        return (
          <div key={dateStr}>
            {/* Date header */}
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {getDateLabel(dateStr)}
              </span>
              {hasNet && (
                <span className={cn(
                  'text-xs font-semibold tabular-nums',
                  dayNet >= 0 ? 'text-success' : 'text-destructive',
                )}>
                  <PrivateValue value={`${dayNet >= 0 ? '+' : ''}${formatCurrency(dayNet)}`} />
                </span>
              )}
            </div>

            {/* Transactions for this day */}
            <div className="space-y-2">
              {group.map((t) => (
                <TransactionRow
                  key={`${t.id}-${t.account_name}`}
                  t={t}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  highlightId={highlightId}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TransactionList;
