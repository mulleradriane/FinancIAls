import React, { useState, useEffect } from 'react';
import api from '@/api/api';
import { toast } from 'sonner';
import EmojiPicker from 'emoji-picker-react';
import { RotateCcw, Info, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import InfoTooltip from '@/components/ui/InfoTooltip';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  '#2563eb', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e',
  '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444', '#f43f5e', '#ec4899',
  '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#64748b', '#475569'
];

const PRESET_EMOJIS = ['💰', '🍕', '🚗', '🏠', '🛒', '🎮', '💊', '🎓', '✈️', '🎁', '💪', '🛡️', '📱', '👔', '💡', '🏦'];

export function CategoryForm({ category, onSaved, onClose }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('expense');
  const [icon, setIcon] = useState('💰');
  const [color, setColor] = useState('#2563eb');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [parentId, setParentId] = useState('');
  const [parentCategories, setParentCategories] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const isEditing = !!category;
  const isSystem = category?.is_system;
  const hasOverride = category?.has_override;

  useEffect(() => {
    // Load parent category candidates (top-level only, same type)
    api.get('/categories/').then((res) => {
      // Only top-level categories (no parent) can be parents, excluding self
      const tops = (res.data || []).filter(
        (c) => !c.parent_id && c.id !== category?.id && !c.is_system
      );
      setParentCategories(tops);
    }).catch(() => {});
  }, [category?.id]);

  useEffect(() => {
    if (category) {
      setName(category.name || '');
      setType(category.type || 'expense');
      setIcon(category.icon || '💰');
      setColor(category.color || '#2563eb');
      setMonthlyBudget(category.monthly_budget || '');
      setParentId(category.parent_id || '');
    }
  }, [category]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      name,
      type,
      icon,
      color,
      monthly_budget: monthlyBudget === '' ? null : parseFloat(monthlyBudget),
      parent_id: parentId || null,
    };

    try {
      if (isEditing) {
        await api.put(`/categories/${category.id}`, payload);
        toast.success(isSystem ? 'Personalização salva!' : 'Categoria atualizada!');
      } else {
        await api.post('/categories/', payload);
        toast.success('Categoria criada!');
      }
      onSaved();
      onClose();
    } catch (err) {
      const detail = err.response?.data?.detail || 'Erro ao salvar categoria.';
      toast.error(detail);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreDefault = async () => {
    if (!isSystem || !hasOverride) return;

    try {
      setLoading(true);
      await api.delete(`/categories/${category.id}/override`);
      toast.success('Restaurado para o padrão do sistema!');
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Erro ao restaurar padrão.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
      {isSystem && (
        <Alert className="bg-primary/5 border-primary/20 text-primary rounded-xl">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs font-medium">
            Esta é uma categoria do sistema. Suas alterações serão aplicadas apenas ao seu perfil.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col items-center gap-6">
        <div className="relative group">
          <Label className="text-center block mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Visualização
          </Label>

          <div className="flex flex-col items-center gap-4">
             {/* Preview Card Simulation */}
             <div className="flex items-center gap-4 p-4 rounded-2xl bg-secondary/20 border border-border/50 min-w-[240px]">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-3xl shadow-sm"
                  style={{
                    backgroundColor: `${color}20`,
                    boxShadow: `0 0 0 3px ${color}18`,
                  }}
                >
                  {icon}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-bold text-lg truncate leading-tight">{name || 'Nova Categoria'}</p>
                  <div className="flex gap-1.5 mt-1">
                    <Badge variant="outline" className={cn(
                        "text-[10px] uppercase font-bold px-1.5 py-0",
                        type === 'expense' ? "text-destructive border-destructive/20 bg-destructive/5" : "text-success border-success/20 bg-success/5"
                    )}>
                        {type === 'expense' ? 'Despesa' : 'Receita'}
                    </Badge>
                    {isSystem && (
                        <Badge variant="secondary" className="text-[10px] uppercase font-bold px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                           {hasOverride ? '✏️ Personalizada' : '⚙️ Padrão'}
                        </Badge>
                    )}
                  </div>
                </div>
             </div>

             <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="text-xs font-medium text-primary hover:underline"
              >
                Alterar ícone
              </button>
          </div>

          {showEmojiPicker && (
            <div className="absolute z-50 top-full mt-2 left-1/2 -translate-x-1/2">
              <div className="fixed inset-0" onClick={() => setShowEmojiPicker(false)} />
              <div className="relative shadow-2xl rounded-2xl overflow-hidden border border-border">
                <EmojiPicker
                  onEmojiClick={(emojiData) => {
                    setIcon(emojiData.emoji);
                    setShowEmojiPicker(false);
                  }}
                  theme="auto"
                  lazyLoadEmojis={true}
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
            className="bg-secondary/30 border-none h-11 rounded-xl focus-visible:ring-primary/30"
          />
        </div>

        {!isSystem && (
          <div className="grid gap-2">
            <Label htmlFor="cat-type">Tipo</Label>
            <Select
                value={type}
                onValueChange={setType}
                disabled={isEditing}
            >
              <SelectTrigger className="bg-secondary/30 border-none h-11 rounded-xl focus:ring-primary/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/50 shadow-xl">
                <SelectItem value="expense" className="rounded-lg">Despesa</SelectItem>
                <SelectItem value="income" className="rounded-lg">Receita</SelectItem>
              </SelectContent>
            </Select>
            {isEditing && <p className="text-[10px] text-muted-foreground px-1">O tipo não pode ser alterado após a criação.</p>}
          </div>
        )}

        {/* Parent category selector — only for non-system categories */}
        {!isSystem && parentCategories.filter(c => c.type === type).length > 0 && (
          <div className="grid gap-2">
            <Label htmlFor="cat-parent">Categoria Pai (opcional)</Label>
            <Select value={parentId || 'none'} onValueChange={(v) => setParentId(v === 'none' ? '' : v)}>
              <SelectTrigger className="bg-secondary/30 border-none h-11 rounded-xl focus:ring-primary/30">
                <SelectValue placeholder="Nenhuma (categoria principal)" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/50 shadow-xl">
                <SelectItem value="none" className="rounded-lg">
                  <span className="text-muted-foreground">Nenhuma (categoria principal)</span>
                </SelectItem>
                {parentCategories.filter(c => c.type === type).map((c) => (
                  <SelectItem key={c.id} value={c.id} className="rounded-lg">
                    <span className="flex items-center gap-2">
                      <span>{c.icon || '💰'}</span>
                      <span>{c.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground px-1">Subcategorias aparecem agrupadas sob a categoria pai.</p>
          </div>
        )}

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-1.5">
               <Label htmlFor="cat-budget">
                 {type === 'expense' ? 'Orçamento Mensal' : 'Meta Mensal'}
               </Label>
               <InfoTooltip
                 icon={HelpCircle}
                 content={type === 'expense'
                   ? "Define o limite para a barra de progresso nas listagens e relatórios."
                   : "Define um objetivo de recebimento para esta categoria."}
               />
             </div>
          </div>
          <Input
            id="cat-budget"
            type="number"
            step="0.01"
            value={monthlyBudget}
            onChange={(e) => setMonthlyBudget(e.target.value)}
            placeholder="R$ 0,00"
            className="bg-secondary/30 border-none h-11 rounded-xl focus-visible:ring-primary/30"
          />
        </div>

        <div className="grid gap-3">
          <Label>Cor de Identificação</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                    "w-8 h-8 rounded-full border-2 transition-transform hover:scale-110",
                    color === c ? "border-foreground scale-110" : "border-transparent"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-4">
            <Input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-16 h-11 p-1 bg-secondary/30 border-none rounded-xl cursor-pointer"
            />
            <code className="bg-secondary/30 px-3 py-2 rounded-lg text-sm font-mono flex-1 text-center">{color}</code>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-4">
        <Button
            type="submit"
            className="w-full rounded-xl h-12 font-bold shadow-lg shadow-primary/20 text-base"
            disabled={loading}
        >
          {loading ? 'Processando...' : (isSystem ? 'Salvar Personalização' : (isEditing ? 'Atualizar Categoria' : 'Criar Categoria'))}
        </Button>

        {isSystem && hasOverride && (
          <Button
            type="button"
            variant="outline"
            onClick={handleRestoreDefault}
            disabled={loading}
            className="w-full h-12 rounded-xl border-dashed hover:bg-destructive/5 hover:text-destructive hover:border-destructive/30 gap-2"
          >
            <RotateCcw size={16} />
            Restaurar Padrão do Sistema
          </Button>
        )}

        <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="w-full h-11 rounded-xl text-muted-foreground"
            disabled={loading}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}
