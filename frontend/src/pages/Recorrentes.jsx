import React, { useState, useEffect } from 'react';
import api from '@/api/api';
import { toast } from 'sonner';
import {
  Package,
  Tv,
  Trash2,
  Square,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Calendar,
  Info,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { cn } from '@/lib/utils';
import PrivateValue from '@/components/ui/PrivateValue';

import RecurringExpenseForm from '@/components/RecurringExpenseForm';

const Recorrentes = () => {
  const [activeTab, setActiveTab] = useState('despesas');
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [summary, setSummary] = useState({
    total_recurring: 0,
    total_subscriptions: 0,
    total_installments: 0,
    subscriptions_paid: 0,
    subscriptions_total: 0,
    installments_paid: 0,
    installments_total: 0,
    commitment_percentage: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const categoryType = activeTab === 'despesas' ? 'expense' : 'income';
      const [expensesRes, summaryRes] = await Promise.all([
        api.get(`/recurring-expenses/?category_type=${categoryType}`),
        api.get('/recurring-expenses/summary')
      ]);
      setRecurringExpenses(expensesRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const installments = recurringExpenses.filter(e => e.type === 'installment');
  const subscriptions = recurringExpenses.filter(e => e.type === 'subscription');

  const handleDelete = async (id) => {
    if (window.confirm('Deseja realmente excluir esta recorrência? Todas as transações (passadas e futuras) vinculadas a ela serão apagadas.')) {
      try {
        await api.delete(`/recurring-expenses/${id}`);
        toast.success('Recorrência excluída!');
        fetchData();
      } catch (error) {
        console.error('Error deleting recurrence:', error);
        toast.error('Erro ao excluir recorrência.');
      }
    }
  };

  const handleTerminate = async (id) => {
    if (window.confirm('Deseja realmente encerrar esta recorrência? As transações passadas serão mantidas, mas as futuras serão apagadas.')) {
      try {
        await api.post(`/recurring-expenses/${id}/terminate`);
        toast.success('Recorrência encerrada!');
        fetchData();
      } catch (error) {
        console.error('Error terminating recurrence:', error);
        toast.error('Erro ao encerrar recorrência.');
      }
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const chartData = [
    { name: 'Parcelas', value: summary.total_installments, color: '#F59E0B' },
    { name: 'Assinaturas', value: summary.total_subscriptions, color: '#3B82F6' }
  ].filter(d => d.value > 0);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);

  const fetchDependencies = async () => {
    try {
      const [catsRes, accsRes] = await Promise.all([
        api.get('/categories/'),
        api.get('/accounts/')
      ]);
      setCategories(catsRes.data);
      setAccounts(accsRes.data);
    } catch (error) {
      console.error('Error fetching dependencies:', error);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recorrências</h1>
          <p className="text-muted-foreground mt-1">Gerencie seus compromissos financeiros fixos e parcelados.</p>
        </div>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl font-bold gap-2 shadow-lg shadow-primary/20 h-11 px-6">
              <Plus size={18} />
              Nova Recorrência
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] p-0 border-none bg-transparent shadow-none overflow-visible">
            <Card className="border-none shadow-2xl rounded-2xl overflow-hidden">
              <CardHeader className="bg-primary pb-8 pt-6">
                <CardTitle className="text-white flex items-center gap-2">
                  <Calendar className="text-white/80" />
                  Nova Recorrência
                </CardTitle>
                <CardDescription className="text-primary-foreground/70">
                  Configure uma nova despesa ou receita recorrente.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <RecurringExpenseForm
                  categories={categories}
                  accounts={accounts}
                  onSuccess={() => {
                    setIsFormOpen(false);
                    fetchData();
                  }}
                  onCancel={() => setIsFormOpen(false)}
                />
              </CardContent>
            </Card>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-md rounded-2xl overflow-hidden">
          <CardContent className="p-8 flex flex-col md:flex-row items-center gap-10">
            <div className="w-40 h-40 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.length > 0 ? chartData : [{ name: 'Empty', value: 1, color: '#e5e7eb' }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {chartData.length > 0 ? chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    )) : <Cell fill="#e5e7eb" stroke="none" />}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-2xl font-black">{summary.commitment_percentage}%</p>
                <p className="text-[10px] text-muted-foreground font-bold uppercase">Comprometido</p>
              </div>
            </div>

            <div className="flex-1 space-y-6">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Comprometimento Mensal</p>
                <h2 className="text-4xl font-black mt-1 text-primary"><PrivateValue value={formatCurrency(summary.total_recurring)} /></h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <span className="text-xs font-bold text-muted-foreground uppercase">Parcelas</span>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black"><PrivateValue value={formatCurrency(summary.installments_paid)} /></span>
                    <span className="text-xs text-muted-foreground font-medium">de <PrivateValue value={formatCurrency(summary.installments_total)} /></span>
                  </div>
                  <Progress value={(summary.installments_paid / (summary.installments_total || 1)) * 100} className="h-1 bg-amber-500/10" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-xs font-bold text-muted-foreground uppercase">Assinaturas</span>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black"><PrivateValue value={formatCurrency(summary.subscriptions_paid)} /></span>
                    <span className="text-xs text-muted-foreground font-medium">de <PrivateValue value={formatCurrency(summary.subscriptions_total)} /></span>
                  </div>
                  <Progress value={(summary.subscriptions_paid / (summary.subscriptions_total || 1)) * 100} className="h-1 bg-blue-500/10" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md rounded-2xl bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Info size={18} className="text-primary" />
              Insight
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Suas despesas recorrentes representam <strong>{summary.commitment_percentage}%</strong> da sua média de renda.
              {summary.commitment_percentage > 30 ?
                " Considere revisar assinaturas que você não utiliza com frequência." :
                " Seu nível de comprometimento está saudável (abaixo de 30%)."}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-secondary/30 p-1 rounded-xl h-12">
          <TabsTrigger value="despesas" className="rounded-lg px-8 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all h-full">
            <TrendingDown className="mr-2 h-4 w-4" /> Despesas
          </TabsTrigger>
          <TabsTrigger value="receitas" className="rounded-lg px-8 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all h-full">
            <TrendingUp className="mr-2 h-4 w-4" /> Receitas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="despesas" className="mt-6 space-y-12">
          {/* Blocos em coluna: Parcelas primeiro, Assinaturas depois */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2 px-1">
              <Package className="text-amber-500" size={20} />
              Parcelamentos
              <Badge variant="secondary" className="rounded-full">{installments.length}</Badge>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {installments.map(item => {
                const total = item.total_installments || 1;
                const completed = item.current_installment || 0;
                const progress = (completed / total) * 100;

                const endDateStr = item.end_date ? new Date(item.end_date).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : '-';

                return (
                  <Card key={item.id} className="group border-none shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4">
                          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 border border-amber-500/20">
                            <Package size={22} />
                          </div>
                          <div>
                            <h4 className="font-bold leading-tight">{item.description}</h4>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1">{item.category?.name || 'Sem Categoria'}</p>
                            <Badge variant="secondary" className="mt-2 text-[10px] font-black h-5 px-2 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10 border-none">
                              {completed}/{total}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity mb-2">
                            <Button variant="ghost" size="icon" onClick={() => handleTerminate(item.id)} className="h-8 w-8 rounded-full" title="Encerrar">
                              <Square size={14} className="text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-8 w-8 rounded-full text-destructive hover:text-destructive" title="Excluir">
                              <Trash2 size={14} />
                            </Button>
                          </div>
                          <p className="font-black text-xl"><PrivateValue value={formatCurrency(item.amount)} /></p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">até {endDateStr}</p>
                        </div>
                      </div>
                      <div className="mt-6 space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          <span>Progresso</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5 bg-amber-500/10" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {installments.length === 0 && (
                <div className="col-span-full p-8 text-center border-2 border-dashed rounded-2xl bg-secondary/5">
                  <p className="text-sm text-muted-foreground italic">Nenhum parcelamento registrado.</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xl font-bold flex items-center gap-2 px-1">
              <Tv className="text-blue-500" size={20} />
              Assinaturas
              <Badge variant="secondary" className="rounded-full">{subscriptions.length}</Badge>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {subscriptions.map(item => (
                <Card key={item.id} className="group border-none shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden bg-card/50 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 border border-blue-500/20">
                          <Tv size={22} />
                        </div>
                        <div>
                          <h4 className="font-bold leading-tight">{item.description}</h4>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-1">{item.category?.name || 'Sem Categoria'}</p>
                          <Badge variant="outline" className="text-[9px] uppercase font-black h-4 px-1.5 mt-2">
                            {item.frequency === 'monthly' ? 'Mensal' : 'Anual'}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity mb-2">
                          <Button variant="ghost" size="icon" onClick={() => handleTerminate(item.id)} className="h-8 w-8 rounded-full" title="Encerrar">
                            <Square size={14} className="text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-8 w-8 rounded-full text-destructive hover:text-destructive" title="Excluir">
                            <Trash2 size={14} />
                          </Button>
                        </div>
                        <p className="font-black text-xl"><PrivateValue value={formatCurrency(item.amount)} /></p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {subscriptions.length === 0 && (
                <div className="col-span-full p-8 text-center border-2 border-dashed rounded-2xl bg-secondary/5">
                  <p className="text-sm text-muted-foreground italic">Nenhuma assinatura registrada.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="receitas" className="mt-6">
           {/* Same structure but for income... reusing logic if needed, but the backend filter takes care of it */}
           <div className="p-10 text-center border-dashed border-2 rounded-2xl bg-secondary/5">
             <p className="text-muted-foreground italic font-medium">Listagem de receitas recorrentes em desenvolvimento ou filtradas acima.</p>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Recorrentes;
