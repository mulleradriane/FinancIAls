import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { toast } from 'react-toastify';
import EmojiPicker from 'emoji-picker-react';
import { Edit2, Trash2, Plus, X } from 'lucide-react';
import Modal from '../components/Modal';

function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState('expense');
  const [icon, setIcon] = useState('💰');
  const [color, setColor] = useState('#007bff');
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
    setColor('#007bff');
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
    setColor(category.color || '#007bff');
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

  return (
    <div className="categories-page" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>Categorias</h1>
        <button
          onClick={openAddModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          <Plus size={20} /> Nova Categoria
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
        {loading ? (
          <p>Carregando...</p>
        ) : (
          categories.map((category) => (
            <div
              key={category.id}
              style={{
                backgroundColor: 'var(--card-bg, #fff)',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                borderLeft: `6px solid ${category.color || '#007bff'}`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>{category.icon || '💰'}</span>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{category.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#666', textTransform: 'capitalize' }}>
                      {category.type === 'expense' ? 'Despesa' : 'Receita'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => openEditModal(category)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#007bff', padding: '5px' }}
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', padding: '5px' }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
        {!loading && categories.length === 0 && <p>Nenhuma categoria encontrada.</p>}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <div style={{ flex: '0 0 100px', textAlign: 'center' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>Ícone</label>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                style={{
                  fontSize: '32px',
                  width: '64px',
                  height: '64px',
                  borderRadius: '12px',
                  border: '1px solid #ddd',
                  backgroundColor: '#f8f9fa',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {icon}
              </button>
              {showEmojiPicker && (
                <div style={{ position: 'absolute', zIndex: 1000, marginTop: '10px' }}>
                  <div
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
                    onClick={() => setShowEmojiPicker(false)}
                  />
                  <div style={{ position: 'relative' }}>
                    <EmojiPicker
                      onEmojiClick={(emojiData) => {
                        setIcon(emojiData.emoji);
                        setShowEmojiPicker(false);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: '15px' }}>
                <label htmlFor="cat-name" style={{ display: 'block', marginBottom: '5px' }}>Nome</label>
                <input
                  id="cat-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label htmlFor="cat-type" style={{ display: 'block', marginBottom: '5px' }}>Tipo</label>
                <select
                  id="cat-type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
                >
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                </select>
              </div>
              <div>
                <label htmlFor="cat-color" style={{ display: 'block', marginBottom: '5px' }}>Cor</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    id="cat-color"
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    style={{ width: '50px', height: '40px', padding: '2px', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer' }}
                  />
                  <span style={{ fontFamily: 'monospace' }}>{color}</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
            <button
              type="submit"
              style={{
                flex: 1,
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                padding: '12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              {editingCategory ? 'Salvar Alterações' : 'Criar Categoria'}
            </button>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              style={{
                flex: 1,
                backgroundColor: '#f8f9fa',
                border: '1px solid #ddd',
                padding: '12px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Categories;
