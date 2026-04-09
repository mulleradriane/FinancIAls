import React, { useState, useEffect } from 'react';
import api from '@/api/api';
import { toast } from 'sonner';
import {
  Edit2, Trash2, Plus, Search, Tag, MoreVertical, Target, Ban,
  Paintbrush, TrendingDown, TrendingUp,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/EmptyState';
import PrivateValue from '@/components/ui/PrivateValue';
import { cn, formatCurrency } from '@/lib/utils';
import { useBudget } from '@/context/BudgetContext';
import { CategoryForm } from '@/components/CategoryForm';

// ── Action Menu (reutilizado em card principal e em subcategorias) ──────────────
const ActionMenu = ({
  category, onEdit, onDelete, onSetBudget, onRemoveBudget,
  activeBudgetPopover, setActiveBudgetPopover, budgetAmount, setBudgetAmount,
  size = 'default',
}) => {
  const isSystem = category.is_system;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'rounded-full text-muted-foreground shrink-0',
            size === 'sm' ? 'h-6 w-6' : 'h-7 w-7',
          )}
        >
          <MoreVertical size={size === 'sm' ? 12 : 14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 rounded-xl border-border/50 shadow-xl">
        <DropdownMenuItem onClick={() => onEdit(category)} className="cursor-pointer gap-2 py-2.5">
          {isSystem
            ? <Paintbrush size={14} className="text-primary" />
            : <Edit2 size={14} className="text-primary" />}
          <span>{isSystem ? 'Personalizar' : 'Editar'}</span>
        </DropdownMenuItem>

        {(category.type === 'expense' || category.has_override) && (
          <>
            <Popover
              open={activeBudgetPopover === category.id}
              onOpenChange={(open) => {
                setActiveBudgetPopover(open ? category.id : null);
                if (open) setBudgetAmount(category.monthly_budget || '');
              }}
            >
              <PopoverTrigger asChild>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="cursor-pointer gap-2 py-2.5"
                >
                  <Target size={14} className="text-success" />
                  <span>{category.type === 'expense' ? 'Definir limite' : 'Definir meta'}</span>
                </DropdownMenuItem>
              </PopoverTrigger>
              <PopoverContent side="left" align="start" className="w-64 p-4 rounded-2xl shadow-2xl border-border/50">
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-sm">
                      {category.type === 'expense' ? 'Limite Mensal' : 'Meta de Receita'}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Para {category.name}</p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={budgetAmount}
                      onChange={(e) => setBudgetAmount(e.target.value)}
                      placeholder="R$ 0,00"
                      className="h-9 rounded-lg"
                    />
                    <Button size="sm" onClick={() => onSetBudget(category)} className="rounded-lg px-4">
                      Salvar
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {category.monthly_budget && (
              <DropdownMenuItem
                onClick={() => onRemoveBudget(category)}
                className="cursor-pointer gap-2 py-2.5 text-destructive focus:text-destructive"
              >
                <Ban size={14} />
                <span>Remover {category.type === 'expense' ? 'limite' : 'meta'}</span>
              </DropdownMenuItem>
            )}
          </>
        )}

        {!isSystem && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(category)}
              className="cursor-pointer gap-2 py-2.5 text-destructive focus:text-destructive"
            >
              <Trash2 size={14} />
              <span>Excluir</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// ── Category Card ──────────────────────────────────────────────────────────────
const CategoryCard = ({ category, subcategories = [], showBudget, actionProps }) => {
  const accentColor = category.color || '#2563eb';
  const spending = parseFloat(category.current_spending || 0);
  const limit = parseFloat(category.monthly_budget || 0);
  const hasLimit = limit > 0;
  const pct = hasLimit ? Math.min((spending / limit) * 100, 100) : 0;
  const overBudget = hasLimit && spending > limit;
  const isSystem = category.is_system;

  const barColor = overBudget ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#22c55e';

  return (
    <Card className={cn(
      'rounded-2xl border-none shadow-sm overflow-hidden flex flex-col transition-shadow hover:shadow-md',
      isSystem && !category.has_override && 'opacity-70',
    )}>
      {/* Color accent bar */}
      <div className="h-1 flex-shrink-0" style={{ backgroundColor: accentColor }} />

      {/* Main card body */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Icon row + menu */}
        <div className="flex items-start justify-between gap-2">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
            style={{
              backgroundColor: `${accentColor}18`,
              boxShadow: `0 0 0 3px ${accentColor}10`,
            }}
          >
            {category.icon || '💰'}
          </div>
          <ActionMenu category={category} {...actionProps} />
        </div>

        {/* Name + system badge */}
        <div>
          <p className="font-bold text-sm leading-snug">{category.name}</p>
          {isSystem && (
            <Badge
              variant="secondary"
              className={cn(
                'mt-1 text-[9px] uppercase font-bold px-1.5 h-4 leading-none border',
                category.has_override
                  ? 'bg-primary/10 text-primary border-primary/20'
                  : 'bg-muted/60 text-muted-foreground/40 border-transparent',
              )}
            >
              {category.has_override ? '✏️ Custom' : 'Sistema'}
            </Badge>
          )}
        </div>

        {/* Budget area */}
        <div className="mt-auto">
          {hasLimit ? (
            <div className="space-y-1.5">
              <div className="h-2 w-full bg-secondary/50 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: barColor }}
                />
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className={cn(
                  'text-[11px] font-semibold tabular-nums',
                  overBudget ? 'text-destructive' : pct >= 80 ? 'text-amber-500' : 'text-muted-foreground',
                )}>
                  {showBudget
                    ? <PrivateValue value={formatCurrency(spending)} />
                    : `${Math.round(pct)}%`}
                </span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {showBudget
                    ? <><span className="opacity-50">/ </span><PrivateValue value={formatCurrency(limit)} /></>
                    : <PrivateValue value={`limite ${formatCurrency(limit)}`} />}
                </span>
              </div>
            </div>
          ) : (
            <button
              onClick={() => actionProps.onEdit(category)}
              className="text-[11px] text-muted-foreground/40 hover:text-primary transition-colors"
            >
              + definir limite
            </button>
          )}
        </div>
      </div>

      {/* Subcategories */}
      {subcategories.length > 0 && (
        <div className="border-t border-border/20">
          {subcategories.map((sub) => {
            const subColor = sub.color || accentColor;
            const subSpending = parseFloat(sub.current_spending || 0);
            const subLimit = parseFloat(sub.monthly_budget || 0);
            const subHasLimit = subLimit > 0;
            const subPct = subHasLimit ? Math.min((subSpending / subLimit) * 100, 100) : 0;

            return (
              <div
                key={sub.id}
                className="group flex items-center gap-2.5 px-4 py-2.5 hover:bg-muted/30 transition-colors"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                  style={{ backgroundColor: `${subColor}18` }}
                >
                  {sub.icon || '💰'}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate leading-none">{sub.name}</p>
                  {subHasLimit && showBudget && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="flex-1 h-1 bg-secondary/60 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${subPct}%`,
                            backgroundColor: subPct >= 100 ? '#ef4444' : subPct >= 80 ? '#f59e0b' : '#22c55e',
                          }}
                        />
                      </div>
                      <span className="text-[9px] text-muted-foreground tabular-nums">{Math.round(subPct)}%</span>
                    </div>
                  )}
                </div>

                <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <ActionMenu category={sub} {...actionProps} size="sm" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

// ── Section ────────────────────────────────────────────────────────────────────
const Section = ({ icon: Icon, label, colorClass, categories, actionProps, showBudget }) => {
  const topLevel = categories.filter((c) => !c.parent_id);
  const subMap = categories.filter((c) => c.parent_id).reduce((acc, c) => {
    if (!acc[c.parent_id]) acc[c.parent_id] = [];
    acc[c.parent_id].push(c);
    return acc;
  }, {});
  // Orphaned subcategories (parent filtered out by search)
  const orphans = categories.filter((c) => c.parent_id && !topLevel.find((t) => t.id === c.parent_id));

  const allCards = [
    ...topLevel.map((cat) => ({ cat, subs: subMap[cat.id] || [] })),
    ...orphans.map((cat) => ({ cat, subs: [] })),
  ];

  return (
    <div>
      <div className={cn('flex items-center gap-2 mb-3', colorClass)}>
        <Icon className="h-4 w-4" />
        <h2 className="text-sm font-bold">{label}</h2>
        <span className="text-xs opacity-60">({categories.length})</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {allCards.map(({ cat, subs }) => (
          <CategoryCard
            key={cat.id}
            category={cat}
            subcategories={subs}
            showBudget={showBudget}
            actionProps={actionProps}
          />
        ))}
      </div>
    </div>
  );
};

// ── Loading skeleton ───────────────────────────────────────────────────────────
const LoadingSkeleton = () => (
  <div className="space-y-8">
    {[0, 1].map((s) => (
      <div key={s}>
        <Skeleton className="h-4 w-24 mb-3 rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="rounded-2xl border-none shadow-sm overflow-hidden">
              <div className="h-1 bg-secondary/60" />
              <div className="p-4 space-y-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <Skeleton className="h-4 w-3/4 rounded-lg" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    ))}
  </div>
);

// ── Main page ──────────────────────────────────────────────────────────────────
export default function Categories() {
  const { showBudget } = useBudget();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [budgetAmount, setBudgetAmount] = useState('');
  const [activeBudgetPopover, setActiveBudgetPopover] = useState(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/categories/');
      setCategories(res.data);
    } catch {
      toast.error('Erro ao carregar categorias.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleSetBudget = async (category) => {
    try {
      await api.put(`/categories/${category.id}`, {
        monthly_budget: budgetAmount === '' ? null : parseFloat(budgetAmount),
      });
      toast.success(budgetAmount === '' ? 'Limite removido!' : 'Limite definido!');
      setActiveBudgetPopover(null);
      setBudgetAmount('');
      fetchCategories();
    } catch {
      toast.error('Erro ao definir limite.');
    }
  };

  const handleRemoveBudget = async (category) => {
    try {
      await api.put(`/categories/${category.id}`, { monthly_budget: null });
      toast.success('Limite removido!');
      fetchCategories();
    } catch {
      toast.error('Erro ao remover limite.');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/categories/${deleteTarget.id}`);
      toast.success('Categoria excluída!');
      fetchCategories();
    } catch {
      toast.error('Erro ao excluir categoria.');
    } finally {
      setDeleteTarget(null);
    }
  };

  const filtered = categories.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === 'all' || c.type === typeFilter;
    return matchSearch && matchType;
  });

  const expenses = filtered.filter((c) => c.type === 'expense');
  const incomes  = filtered.filter((c) => c.type === 'income');

  const totalExpense = categories.filter((c) => c.type === 'expense').length;
  const totalIncome  = categories.filter((c) => c.type === 'income').length;
  const withLimit    = categories.filter((c) => parseFloat(c.monthly_budget || 0) > 0).length;

  const actionProps = {
    onEdit: (c) => { setEditingCategory(c); setIsModalOpen(true); },
    onDelete: (c) => { if (!c.is_system) setDeleteTarget(c); },
    onSetBudget: handleSetBudget,
    onRemoveBudget: handleRemoveBudget,
    activeBudgetPopover,
    setActiveBudgetPopover,
    budgetAmount,
    setBudgetAmount,
  };

  const TAB_FILTERS = [
    { value: 'all',     label: 'Todas',    count: categories.length },
    { value: 'expense', label: 'Despesas', count: totalExpense },
    { value: 'income',  label: 'Receitas', count: totalIncome },
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categorias</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {!loading && categories.length > 0 && (
              <span>
                {categories.length} categorias · {totalExpense} despesas · {totalIncome} receitas
                {withLimit > 0 && <span className="text-primary font-medium"> · {withLimit} com limite</span>}
              </span>
            )}
            {(loading || categories.length === 0) && 'Personalize suas classificações.'}
          </p>
        </div>
        <Button
          onClick={() => { setEditingCategory(null); setIsModalOpen(true); }}
          className="rounded-xl w-fit gap-2"
        >
          <Plus className="h-4 w-4" /> Nova Categoria
        </Button>
      </div>

      {/* Search + type tabs */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary/30 border-none rounded-xl h-9"
          />
        </div>
        <div className="flex bg-secondary/40 rounded-xl p-1 gap-0.5 shrink-0">
          {TAB_FILTERS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setTypeFilter(tab.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
                typeFilter === tab.value
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
              <span className={cn(
                'ml-1.5 text-[10px]',
                typeFilter === tab.value ? 'text-muted-foreground' : 'text-muted-foreground/40',
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="Nenhuma categoria"
          description={search ? `Nenhuma categoria para "${search}".` : 'Crie sua primeira categoria.'}
          actionLabel="Nova Categoria"
          onAction={() => { setEditingCategory(null); setIsModalOpen(true); }}
        />
      ) : (
        <div className="space-y-8">
          {(typeFilter === 'all' || typeFilter === 'expense') && expenses.length > 0 && (
            <Section
              icon={TrendingDown}
              label="Despesas"
              colorClass="text-destructive"
              categories={expenses}
              actionProps={actionProps}
              showBudget={showBudget}
            />
          )}
          {(typeFilter === 'all' || typeFilter === 'income') && incomes.length > 0 && (
            <Section
              icon={TrendingUp}
              label="Receitas"
              colorClass="text-success"
              categories={incomes}
              actionProps={actionProps}
              showBudget={showBudget}
            />
          )}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl border-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="rounded-xl bg-destructive hover:bg-destructive/90 text-white"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add/Edit modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md rounded-2xl overflow-hidden border-border/50 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingCategory
                ? editingCategory.is_system ? 'Personalizar Categoria' : 'Editar Categoria'
                : 'Nova Categoria'}
            </DialogTitle>
          </DialogHeader>
          <CategoryForm
            category={editingCategory}
            onSaved={fetchCategories}
            onClose={() => setIsModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
