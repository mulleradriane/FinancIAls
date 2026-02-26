import React, { useState, useEffect } from 'react';
import api from '@/api/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, TrendingDown, Wallet, Briefcase, CreditCard,
  AlertCircle, RefreshCw, Landmark, PiggyBank
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import PrivateValue from '@/components/ui/PrivateValue';
import { usePrivacy } from '@/context/PrivacyContext';

const Patrimonio = () => {
  const { isPrivate } = usePrivacy();
  const [data, setData] = useState(null);
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [newBalance, setNewBalance] = useState('');

  const fetchNetWorth = async () => {
    try {
      const response = await api.get('/summary/net-worth');
      setData(response.data);
    } catch (error) {
      console.error('Error fetching net worth data:', error);
      toast.error('Erro ao carregar dados do patrimônio');
    }
  };

  const fetchInvestments = async () => {
    try {
      const response = await api.get('/accounts/');
      const filtered = response.data.filter(acc => acc.type === 'investimento' || acc.type === 'poupanca');
      setInvestments(filtered);
    } catch (error) {
      console.error('Error fetching investments:', error);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchNetWorth(), fetchInvestments()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleUpdateBalance = async (e) => {
    e.preventDefault();
    if (!selectedAccount || !newBalance) return;

    try {
      const val = parseFloat(newBalance.replace(/[R$\s.]/g, '').replace(',', '.'));
      await api.put(`/accounts/${selectedAccount.id}`, {
        current_balance: val
      });
      toast.success('Saldo atualizado com sucesso');
      setIsUpdateModalOpen(false);
      setNewBalance('');
      loadAll();
    } catch (error) {
      console.error('Error updating balance:', error);
      toast.error('Erro ao atualizar saldo');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const formatInputCurrency = (value) => {
    if (!value) return '';
    const cleanValue = value.replace(/\D/g, '');
    const numberValue = parseFloat(cleanValue) / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numberValue);
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-pulse text-muted-foreground font-medium">Carregando patrimônio...</div>
      </div>
    );
  }

  const COLORS = ['#2563EB', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6'];

  const typeLabels = {
    carteira: 'Dinheiro',
    banco: 'Banco',
    poupanca: 'Poupança',
    investimento: 'Investimento',
    cartao_credito: 'Cartão de Crédito'
  };

  const allocationData = data?.allocation ? Object.entries(data.allocation).map(([type, value]) => ({
    name: typeLabels[type] || type,
    value: Math.abs(parseFloat(value))
  })).filter(item => item.value > 0) : [];

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Patrimônio</h1>
        <p className="text-muted-foreground mt-1">Visão consolidada dos seus ativos e passivos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card className="border-none shadow-md bg-success/5">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-success/10 rounded-2xl text-success">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Ativos</p>
                  <h3 className="text-2xl font-bold text-success"><PrivateValue value={formatCurrency(data?.total_assets)} /></h3>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md bg-destructive/5">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-destructive/10 rounded-2xl text-destructive">
                  <TrendingDown size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Passivos</p>
                  <h3 className="text-2xl font-bold text-destructive"><PrivateValue value={formatCurrency(data?.total_liabilities)} /></h3>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className={cn(
            "border-none shadow-lg rounded-2xl overflow-hidden",
            data?.net_worth >= 0 ? "bg-primary/5" : "bg-destructive/5"
          )}>
            <CardContent className="p-10 text-center space-y-2">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-[0.2em]">Patrimônio Líquido</p>
              <h1 className={cn(
                "text-5xl font-black tracking-tighter",
                data?.net_worth >= 0 ? "text-primary" : "text-destructive"
              )}>
                <PrivateValue value={formatCurrency(data?.net_worth)} />
              </h1>
            </CardContent>
          </Card>
        </div>

        {/* Allocation Chart */}
        <Card className="border-none shadow-md rounded-2xl">
          <CardHeader>
            <CardTitle>Alocação de Ativos</CardTitle>
            <CardDescription>Distribuição por tipo de conta</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <Card className="p-3 shadow-xl border-none bg-background/90 backdrop-blur-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].payload.fill }} />
                              <span className="font-bold text-sm">{payload[0].name}</span>
                            </div>
                            <p className="text-xs font-bold mt-1">{isPrivate ? '•••••' : formatCurrency(payload[0].value)}</p>
                          </Card>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend verticalAlign="bottom" align="center" iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Evolution Chart */}
      <Card className="border-none shadow-md rounded-2xl">
        <CardHeader>
          <CardTitle>Evolução Patrimonial</CardTitle>
          <CardDescription>Histórico de valorização líquida</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.history} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground) / 0.1)" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickFormatter={(value) => isPrivate ? '•••' : `R$${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <Card className="p-3 shadow-xl border-none bg-background/90 backdrop-blur-sm">
                          <p className="font-bold text-sm mb-1">{label}</p>
                          <p className="text-primary font-black text-base">{isPrivate ? '•••••' : formatCurrency(payload[0].value)}</p>
                        </Card>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={4}
                  dot={{ r: 6, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--background))" }}
                  activeDot={{ r: 8, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Assets Management */}
      <Card className="border-none shadow-md rounded-2xl overflow-hidden">
        <CardHeader>
          <CardTitle>Gestão de Ativos</CardTitle>
          <CardDescription>Atualize o saldo de seus investimentos e poupanças</CardDescription>
        </CardHeader>
        <CardContent className="bg-secondary/10 pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {investments.map(acc => (
              <Card key={acc.id} className="border-none shadow-sm rounded-xl hover:shadow-md transition-all">
                <CardContent className="p-5 flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold truncate max-w-[150px]">{acc.name}</p>
                    <p className="text-xl font-bold text-success"><PrivateValue value={formatCurrency(acc.balance)} /></p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedAccount(acc);
                      setNewBalance(formatCurrency(acc.balance));
                      setIsUpdateModalOpen(true);
                    }}
                    className="rounded-lg h-9"
                  >
                    <RefreshCw size={14} className="mr-2" /> Atualizar
                  </Button>
                </CardContent>
              </Card>
            ))}
            {investments.length === 0 && (
              <div className="col-span-full py-10 text-center text-muted-foreground italic">
                Nenhum investimento cadastrado como conta.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Atualizar Saldo</DialogTitle>
            <CardDescription>{selectedAccount?.name}</CardDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateBalance} className="space-y-6 pt-4">
            <div className="grid gap-2">
              <Label htmlFor="newBalance">Novo Saldo Atual</Label>
              <Input
                id="newBalance"
                type="text"
                value={newBalance}
                onChange={(e) => setNewBalance(formatInputCurrency(e.target.value))}
                placeholder="R$ 0,00"
                className="bg-secondary/30 border-none h-12 rounded-xl text-xl font-bold"
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> Isso criará um ajuste de saldo automático.
              </p>
            </div>
            <div className="flex gap-3">
              <Button type="submit" className="flex-1 h-12 rounded-xl font-bold shadow-lg shadow-success/20 bg-success hover:bg-success/90">
                Confirmar
              </Button>
              <Button type="button" variant="ghost" onClick={() => setIsUpdateModalOpen(false)} className="flex-1 h-12 rounded-xl">
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Patrimonio;
