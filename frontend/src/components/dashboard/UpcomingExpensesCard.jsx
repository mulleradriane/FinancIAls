import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarClock } from 'lucide-react';
import api from '@/api/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PrivateValue from '@/components/ui/PrivateValue';
import { cn } from '@/lib/utils';

const UpcomingExpensesCard = () => {
  const [upcoming, setUpcoming] = useState([]);
  const [totalNext30, setTotalNext30] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const parseISO = (dateStr) => {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const fetchRecurring = async () => {
    try {
      setLoading(true);
      // We filter by category_type=expense as requested for "Próximas Despesas"
      const response = await api.get('/recurring-expenses/', { params: { category_type: 'expense' } });
      const expenses = response.data;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const next30Days = new Date(today);
      next30Days.setDate(today.getDate() + 30);

      const items = [];
      let totalSum = 0;

      expenses.forEach(expense => {
        if (!expense.active) return;

        let nextDate = null;

        if (expense.type === 'installment') {
          // For installments, the backend creates all transactions upfront.
          // We find the first one that hasn't happened yet (is today or in the future).
          const futureTransactions = expense.transactions
            ?.map(t => ({ ...t, dateObj: parseISO(t.date) }))
            .filter(t => t.dateObj >= today)
            .sort((a, b) => a.dateObj - b.dateObj);

          if (futureTransactions && futureTransactions.length > 0) {
            nextDate = futureTransactions[0].dateObj;
          }
        } else {
          // For subscriptions, the backend only creates the first transaction.
          // We calculate the next occurrence date.
          const startDate = parseISO(expense.start_date);
          nextDate = new Date(startDate);

          while (nextDate < today) {
            if (expense.frequency === 'monthly') {
              nextDate.setMonth(nextDate.getMonth() + 1);
            } else if (expense.frequency === 'yearly') {
              nextDate.setFullYear(nextDate.getFullYear() + 1);
            } else {
              break;
            }
          }
        }

        if (nextDate && nextDate >= today && nextDate <= next30Days) {
          items.push({
            ...expense,
            nextOccurrence: nextDate
          });
          totalSum += parseFloat(expense.amount);
        }
      });

      // Sort by next occurrence date
      items.sort((a, b) => a.nextOccurrence - b.nextOccurrence);

      setUpcoming(items);
      setTotalNext30(totalSum);
    } catch (error) {
      console.error('Error fetching upcoming expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecurring();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatDatePTBR = (date) => {
    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    let formatted = new Intl.DateTimeFormat('pt-BR', options).format(date);
    // Transform "qui., 6 de fev." into "QUI, 6 FEV"
    return formatted
      .replace(/\./g, '')           // Remove dots
      .replace(/^(\w+)/, '$1,')      // Add comma after weekday
      .replace(/ de /g, ' ')         // Remove " de "
      .toUpperCase();
  };

  if (loading) {
    return (
      <Card className="border-none shadow-md overflow-hidden animate-pulse">
        <div className="h-[400px] bg-secondary/10" />
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-md overflow-hidden flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" />
            Próximas Despesas
          </CardTitle>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            Total 30 dias: <PrivateValue value={formatCurrency(totalNext30)} />
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary hover:text-primary hover:bg-primary/10 text-xs font-bold uppercase tracking-wider"
          onClick={() => navigate('/recorrentes')}
        >
          Ver todas <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 pt-4">
        {upcoming.length === 0 ? (
          <div className="h-full flex items-center justify-center py-10">
            <p className="text-muted-foreground italic text-sm">Nenhuma despesa próxima</p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcoming.slice(0, 5).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">
                    {item.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="secondary"
                      className="text-[10px] h-5 px-1.5 font-bold uppercase tracking-wider whitespace-nowrap"
                      style={{
                        backgroundColor: `${item.category?.color}12`,
                        color: item.category?.color,
                        border: `1px solid ${item.category?.color}20`
                      }}
                    >
                      <span className="mr-1">{item.category?.icon || '💰'}</span>
                      {item.category?.name || 'Sem Categoria'}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-bold uppercase whitespace-nowrap">
                      {formatDatePTBR(item.nextOccurrence)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black tracking-tight text-destructive">
                    <PrivateValue value={formatCurrency(item.amount)} />
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingExpensesCard;
