import React, { useState, useEffect } from 'react';
import { Category } from '../types';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit2, Trash2, FolderTree, X, RefreshCw, AlertCircle } from 'lucide-react';

export const CategoriesPage: React.FC = () => {
  const { user } = useAuth();
  const isCeo = user?.role === 'CEO';

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: '', description: '', icon: 'Wine', display_order: '0' });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    setLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; categories: Category[] }>('/api/categories');
      if (res.success) setCategories(res.categories || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const openAdd = () => {
    setEditingCategory(null);
    setForm({ name: '', description: '', icon: 'Wine', display_order: String(categories.length + 1) });
    setError(null);
    setIsModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setForm({
      name: cat.name,
      description: cat.description || '',
      icon: cat.icon || 'Wine',
      display_order: String(cat.display_order || 0)
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Toifa nomini kiriting');
      return;
    }

    try {
      if (editingCategory) {
        await apiRequest(`/api/categories/${editingCategory.id}`, {
          method: 'PUT',
          body: JSON.stringify(form)
        });
      } else {
        await apiRequest('/api/categories', {
          method: 'POST',
          body: JSON.stringify(form)
        });
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      setError(err.message || 'Saqlashda xatolik');
    }
  };

  const handleDelete = async (cat: Category) => {
    if (cat.product_count && cat.product_count > 0) {
      alert(`Ushbu toifada ${cat.product_count} ta mahsulot mavjud. Toifani o'chirishdan oldin undagi mahsulotlarni boshqa toifaga o'tkazing.`);
      return;
    }

    if (!confirm(`"${cat.name}" toifasini o'chirishni xohlaysizmi?`)) return;

    try {
      await apiRequest(`/api/categories/${cat.id}`, { method: 'DELETE' });
      fetchCategories();
    } catch (err: any) {
      alert(err.message || 'O\'chirishda xatolik');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Ichimlik Toifalari</h1>
          <p className="text-xs text-slate-400">Do'kondagi mahsulotlar guruhlari va toifalari</p>
        </div>

        {isCeo && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Yangi Toifa
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-12 text-slate-400 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-400 mr-2" />
          Toifalar yuklanmoqda...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => (
            <div
              key={cat.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold">
                    <FolderTree className="w-5 h-5" />
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800 text-slate-300 font-semibold font-mono">
                    {cat.product_count || 0} ta mahsulot
                  </span>
                </div>
                <h3 className="font-bold text-base text-slate-100">{cat.name}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{cat.description || 'Tavsif mavjud emas'}</p>
              </div>

              {isCeo && (
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEdit(cat)}
                    className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-slate-100">
                {editingCategory ? 'Toifani tahrirlash' : 'Yangi toifa qo\'shish'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Toifa nomi *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Masalan: Gazli Ichimliklar"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Tartib raqami</label>
                <input
                  type="number"
                  value={form.display_order}
                  onChange={e => setForm({ ...form, display_order: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Tavsif</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Toifa haqida qisqacha ma'lumot..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
