import React, { useState, useEffect } from 'react';
import api from '@/api/api';
import { toast } from 'sonner';
import EmojiPicker from 'emoji-picker-react';
import { Edit2, Trash2, Plus, X, Search, Tag, ShieldCheck, MoreVertical, Target, Ban } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import PrivateValue from '@/components/ui/PrivateValue';
import { useBudget } from '@/context/BudgetContext';

function Categories() {
  const { showBudget } = useBudget();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState('expense');
  const [icon, setIcon] = useState('💰');
  const [color, setColor] = useState('#2563eb');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  // Budget state
  const [budgetAmount, setBudgetAmount] = useState('');
  const [activeBudgetPopover, setActiveBudgetPopover] = useState(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/categories/');
      setCategories(response.data);
    } catch (err) {
      toast.error('Erro ao carregar categorias.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const resetForm = () => {
    setName('');
    setType('expense');
    setIcon('💰');
    setColor('#2563eb');
    setEditingCategory(null);
    setShowEmojiPicker(false);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (category) => {
    if (category.is_system) return;
    setEditingCategory(category);
    setName(category.name);
    setType(category.type);
    setIcon(category.icon || '💰');
    setColor(category.color || '#2563eb');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { name, type, icon, color };

    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, payload);
        toast.success('Categoria atualizada!');
      } else {
        await api.post('/categories/', payload);
        toast.success('Categoria criada!');
      }
      setIsModalOpen(false);
      resetForm();
      fetchCategories();
    } catch (err) {
      const detail = err.response?.data?.detail || 'Erro ao salvar categoria.';
      toast.error(detail);
      console.error(err);
    }
  };

  const handleDelete = async (category) => {
    if (category.is_system) return;
    if (window.confirm('Tem certeza que deseja excluir esta categoria?')) {
      try {
        await api.delete(`/categories/${category.id}`);
        toast.success('Categoria excluída!');
        fetchCategories();
      } catch (err) {
        toast.error('Erro ao excluir categoria.');
        console.error(err);
      }
    }
  };

  const handleSetBudget = async (category) => {
    try {
      await api.put(`/categories/${category.id}`, {
        monthly_budget: budgetAmount === '' ? null : parseFloat(budgetAmount)
      });
      toast.success(budgetAmount === '' ? 'Limite removido!' : 'Limite definido!');
      setActiveBudgetPopover(null);
      setBudgetAmount('');
      fetchCategories();
    } catch (err) {
      toast.error('Erro ao definir limite.');
      console.error(err);
    }
  };

  const handleRemoveBudget = async (category) => {
    try {
      await api.put(`/categories/${category.id}`, { monthly_budget: null });
      toast.success('Limite removido!');
      fetchCategories();
    } catch (err) {
      toast.error('Erro ao remover limite.');
      console.error(err);
    }
  };

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <TooltipProvider>
      <div className="space-y-8 pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Categorias</h1>
            <p className="text-muted-foreground mt-1">Personalize suas classificações financeiras.</p>
          </div>
          <Button onClick={openAddModal} size="lg" className="rounded-xl shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-5 w-5" /> Nova Categoria
          </Button>
        </div>

        <div className="flex items-center gap-4 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Procurar categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-secondary/30 border-none rounded-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))
          ) : filteredCategories.length > 0 ? (
            filteredCategories.map((category) => (
              <Card
                key={category.id}
                className={cn(
                  "group border-none shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden",
                  category.is_system && "bg-secondary/[0.03] border border-primary/10"
                )}
              >
                <CardContent className="p-0">
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl border shadow-sm"
                          style={{
                            backgroundColor: `${category.color}15`,
                            borderColor: `${category.color}30`
                          }}
                        >
                          {category.icon || '💰'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-lg truncate pr-2">{category.name}</h3>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <Badge variant="outline" className={cn(
                              "text-[10px] uppercase font-bold",
                              category.type === 'expense' ? "text-destructive border-destructive/20 bg-destructive/5" : "text-success border-success/20 bg-success/5"
                            )}>
                              {category.type === 'expense' ? 'Despesa' : 'Receita'}
                            </Badge>
                            {category.is_system && (
                              <Badge variant="secondary" className="text-[10px] uppercase font-bold bg-primary/10 text-primary border-primary/20">
                                Sistema
                              </Badge>
                            )}
                            {category.monthly_budget && (
                              <Badge variant="outline" className="text-[10px] uppercase font-bold border-primary/20 bg-primary/5 text-primary">
                                Limite: <PrivateValue value={category.monthly_budget} />
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        {category.is_system ? (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="p-2 text-primary/40">
                                  <ShieldCheck size={18} />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                Categoria protegida pelo sistema
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical size={18} className="text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl">
                              <DropdownMenuItem onClick={() => openEditModal(category)} className="cursor-pointer gap-2 py-2.5">
                                <Edit2 size={14} className="text-primary" />
                                <span>Editar</span>
                              </DropdownMenuItem>

                              {category.type === 'expense' && (
                                <>
                                  <Popover
                                    open={activeBudgetPopover === category.id}
                                    onOpenChange={(open) => {
                                      setActiveBudgetPopover(open ? category.id : null);
                                      if (open) setBudgetAmount(category.monthly_budget || '');
                                    }}
                                  >
                                    <PopoverTrigger asChild>
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer gap-2 py-2.5">
                                        <Target size={14} className="text-success" />
                                        <span>Definir limite</span>
                                      </DropdownMenuItem>
                                    </PopoverTrigger>
                                    <PopoverContent side="left" align="start" className="w-64 p-4 rounded-xl shadow-xl">
                                      <div className="space-y-3">
                                        <div className="space-y-1">
                                          <h4 className="font-semibold text-sm">Limite Mensal</h4>
                                          <p className="text-xs text-muted-foreground">Defina o gasto máximo para {category.name}</p>
                                        </div>
                                        <div className="flex gap-2">
                                          <Input
                                            type="number"
                                            value={budgetAmount}
                                            onChange={(e) => setBudgetAmount(e.target.value)}
                                            placeholder="R$ 0,00"
                                            className="h-9"
                                          />
                                          <Button size="sm" onClick={() => handleSetBudget(category)}>Salvar</Button>
                                        </div>
                                      </div>
                                    </PopoverContent>
                                  </Popover>

                                  {category.monthly_budget && (
                                    <DropdownMenuItem onClick={() => handleRemoveBudget(category)} className="cursor-pointer gap-2 py-2.5 text-destructive">
                                      <Ban size={14} />
                                      <span>Remover limite</span>
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}

                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(category)} className="cursor-pointer gap-2 py-2.5 text-destructive">
                                <Trash2 size={14} />
                                <span>Excluir</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </div>
                  {showBudget && (() => {
                    const spending = parseFloat(category.current_spending || 0);
                    const limit = parseFloat(category.monthly_budget || 0);
                    const hasLimit = limit > 0;
                    const percent = hasLimit ? (spending / limit) * 100 : 0;

                    let barColor = category.color || '#2563eb';
                    if (hasLimit) {
                      if (percent < 80) barColor = '#22c55e'; // Verde
                      else if (percent <= 100) barColor = '#eab308'; // Amarelo
                      else barColor = '#ef4444'; // Vermelho
                    }

                    return (
                      <div className="h-1.5 w-full bg-secondary/20 relative overflow-hidden">
                        <div
                          className="h-full transition-all duration-500"
                          style={{
                            backgroundColor: barColor,
                            width: hasLimit ? `${Math.min(percent, 100)}%` : '100%'
                          }}
                        />
                        {hasLimit && percent > 100 && (
                          <div className="absolute inset-0 bg-destructive/20 animate-pulse" />
                        )}
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            ))
          ) : null}
        </div>

        {!loading && filteredCategories.length === 0 && (
          <div className="col-span-full">
            <EmptyState
              icon={Tag}
              title="Nenhuma categoria"
              description="Você ainda não possui categorias cadastradas ou os filtros não retornaram resultados."
              actionLabel="Nova Categoria"
              onAction={openAddModal}
            />
          </div>
        )}

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Label className="text-center block mb-2">Ícone</Label>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="w-20 h-20 rounded-2xl border-2 border-dashed border-primary/20 hover:border-primary/50 hover:bg-primary/5 flex items-center justify-center text-4xl transition-all"
                    style={{ backgroundColor: `${color}10` }}
                  >
                    {icon}
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute z-50 top-full mt-2 left-1/2 -translate-x-1/2">
                      <div className="fixed inset-0" onClick={() => setShowEmojiPicker(false)} />
                      <div className="relative shadow-2xl">
                        <EmojiPicker
                          onEmojiClick={(emojiData) => {
                            setIcon(emojiData.emoji);
                            setShowEmojiPicker(false);
                          }}
                          theme="auto"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="cat-name">Nome da Categoria</Label>
                  <Input
                    id="cat-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Alimentação, Lazer..."
                    required
                    className="bg-secondary/30 border-none h-11 rounded-xl"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="cat-type">Tipo</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="bg-secondary/30 border-none h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Despesa</SelectItem>
                      <SelectItem value="income">Receita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="cat-color">Cor de Identificação</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="cat-color"
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-16 h-11 p-1 bg-secondary/30 border-none rounded-xl cursor-pointer"
                    />
                    <code className="bg-secondary/30 px-3 py-2 rounded-lg text-sm font-mono">{color}</code>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1 rounded-xl h-12 font-bold shadow-lg shadow-primary/20">
                  {editingCategory ? 'Salvar Alterações' : 'Criar Categoria'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="flex-1 h-12 rounded-xl">
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

export default Categories;
