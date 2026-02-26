import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, History } from 'lucide-react';
import api from '@/api/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PrivateValue from '@/components/ui/PrivateValue';
import { cn } from '@/lib/utils';

const RecentTransactionsCard = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchRecent = async () => {
    try {
      setLoading(true);
      const response = await api.get('/transactions/', { params: { limit: 5 } });
      setTransactions(response.data);
    } catch (error) {
      console.error('Error fetching recent transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecent();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Transações Recentes
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary hover:text-primary hover:bg-primary/10 text-xs font-bold uppercase tracking-wider"
          onClick={() => navigate('/transactions')}
        >
          Ver todas <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1">
        {transactions.length === 0 ? (
          <div className="h-full flex items-center justify-center py-10">
            <p className="text-muted-foreground italic text-sm">Nenhuma transação recente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-4 group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">
                    {t.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                     <Badge
                      variant="secondary"
                      className="text-[10px] h-5 px-1.5 font-bold uppercase tracking-wider whitespace-nowrap"
                      style={{
                        backgroundColor: t.is_transfer ? undefined : `${t.category_color}12`,
                        color: t.is_transfer ? undefined : t.category_color,
                        border: t.is_transfer ? undefined : `1px solid ${t.category_color}20`
                      }}
                    >
                      <span className="mr-1">{t.is_transfer ? '💸' : (t.category_icon || '💰')}</span>
                      {t.category_is_system ? 'Sistema' : t.category_name}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase truncate max-w-[80px]">
                      {t.account_name}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-sm font-black tracking-tight",
                    t.amount < 0 ? "text-destructive" : "text-success"
                  )}>
                    <PrivateValue value={formatCurrency(t.amount)} />
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

export default RecentTransactionsCard;
