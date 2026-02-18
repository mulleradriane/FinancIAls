import React, { useState, useEffect } from 'react';
import api from '@/api/api';
import { toast } from 'sonner';
import EmojiPicker from 'emoji-picker-react';
import { Edit2, Trash2, Plus, X, Search, Tag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

function Categories() {
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

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta categoria?')) {
      try {
        await api.delete(`/categories/${id}`);
        toast.success('Categoria excluída!');
        fetchCategories();
      } catch (err) {
        toast.error('Erro ao excluir categoria.');
        console.error(err);
      }
    }
  };

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
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
              className="group border-none shadow-md hover:shadow-lg transition-all duration-300 rounded-2xl overflow-hidden"
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
                      <div>
                        <h3 className="font-bold text-lg truncate max-w-[120px]">{category.name}</h3>
                        <Badge variant="outline" className={cn(
                          "mt-1 text-[10px] uppercase font-bold",
                          category.type === 'expense' ? "text-destructive border-destructive/20 bg-destructive/5" : "text-success border-success/20 bg-success/5"
                        )}>
                          {category.type === 'expense' ? 'Despesa' : 'Receita'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditModal(category)}
                        className="h-8 w-8 rounded-full"
                      >
                        <Edit2 size={14} className="text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(category.id)}
                        className="h-8 w-8 rounded-full"
                      >
                        <Trash2 size={14} className="text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div
                  className="h-1.5 w-full"
                  style={{ backgroundColor: category.color || '#2563eb' }}
                />
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
  );
}

export default Categories;
