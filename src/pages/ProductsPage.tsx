import React, { useState, useEffect } from 'react';
import { Product, Category } from '../types';
import { apiRequest, formatUZS } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  Search,
  Filter,
  Wine,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  LayoutGrid,
  List,
  Sparkles,
  Barcode,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const { user } = useAuth();
  const isCeo = user?.role === 'CEO';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Filters
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<string>('ASC');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [modalForm, setModalForm] = useState({
    name: '',
    category_id: '',
    description: '',
    purchase_price: '',
    selling_price: '',
    quantity: '',
    min_stock: '5',
    unit: 'dona',
    barcode: '',
    sku: '',
    image_url: '',
    status: 'active'
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [search, selectedCategory, stockFilter, sortBy, sortOrder]);

  async function fetchProducts() {
    setLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; products: Product[] }>('/api/products', {
        params: {
          search,
          category: selectedCategory,
          stockStatus: stockFilter === 'all' ? undefined : stockFilter,
          sortBy,
          sortOrder
        }
      });
      if (res.success) setProducts(res.products || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const res = await apiRequest<{ success: boolean; categories: Category[] }>('/api/categories');
      if (res.success) setCategories(res.categories || []);
    } catch (e) {
      console.error(e);
    }
  }

  const openAddModal = () => {
    setEditingProduct(null);
    setModalForm({
      name: '',
      category_id: categories[0]?.id || '',
      description: '',
      purchase_price: '',
      selling_price: '',
      quantity: '',
      min_stock: '5',
      unit: 'dona',
      barcode: `478${Date.now().toString().slice(-9)}`,
      sku: `SD-${Date.now().toString().slice(-4)}`,
      image_url: '/src/assets/images/smart_drink_hero_1790182172012.jpg',
      status: 'active'
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setModalForm({
      name: p.name,
      category_id: p.category_id,
      description: p.description,
      purchase_price: String(p.purchase_price),
      selling_price: String(p.selling_price),
      quantity: String(p.quantity),
      min_stock: String(p.min_stock),
      unit: p.unit,
      barcode: p.barcode,
      sku: p.sku,
      image_url: p.image_url,
      status: p.status
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalForm.name.trim()) {
      setFormError('Mahsulot nomini kiriting');
      return;
    }
    if (!modalForm.category_id) {
      setFormError('Toifani tanlang');
      return;
    }
    if (Number(modalForm.purchase_price) < 0 || Number(modalForm.selling_price) < 0) {
      setFormError('Narxlar manfiy bo\'lishi mumkin emas');
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      if (editingProduct) {
        // Update
        await apiRequest(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(modalForm)
        });
      } else {
        // Create
        await apiRequest('/api/products', {
          method: 'POST',
          body: JSON.stringify(modalForm)
        });
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      setFormError(err.message || 'Saqlashda xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Haqiqatan ham "${name}" mahsulotini o'chirmoqchimisiz?`)) return;
    try {
      await apiRequest(`/api/products/${id}`, { method: 'DELETE' });
      fetchProducts();
    } catch (err: any) {
      alert(err.message || 'O\'chirishda xatolik');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Ichimliklar Katalogi</h1>
          <p className="text-xs text-slate-400">Do'kondagi barcha ichimliklar, narxlar va qoldiqlar</p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Jadval ko'rinishi"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Kataklar ko'rinishi"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {isCeo && (
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Yangi Ichimlik
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Nomi, shtrix-kodi yoki SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Barcha Toifalar</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={stockFilter}
            onChange={e => setStockFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Barcha Holatlar</option>
            <option value="in_stock">Yetarli qoldiq</option>
            <option value="low_stock">Kam qolgan (&lt;= Min)</option>
            <option value="out_of_stock">Tugagan (0 dona)</option>
          </select>
        </div>

        <div>
          <select
            value={`${sortBy}_${sortOrder}`}
            onChange={e => {
              const [sb, so] = e.target.value.split('_');
              setSortBy(sb);
              setSortOrder(so);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="name_ASC">Nomi (A - Z)</option>
            <option value="name_DESC">Nomi (Z - A)</option>
            <option value="price_ASC">Narx (Arzonroq)</option>
            <option value="price_DESC">Narx (Qimmatroq)</option>
            <option value="quantity_DESC">Qoldiq (Ko'proq)</option>
            <option value="quantity_ASC">Qoldiq (Kamroq)</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mb-2" />
          Mahsulotlar yuklanmoqda...
        </div>
      ) : products.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
          <Wine className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="font-semibold text-slate-300 text-sm">Hech qanday mahsulot topilmadi</p>
          <p className="text-xs text-slate-500 mt-1">Filtr parametrlarini tozalab ko'ring</p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">Mahsulot</th>
                  <th className="p-4">Toifa</th>
                  <th className="p-4">Shtrix-kod / SKU</th>
                  <th className="p-4 text-right">Kelish narxi</th>
                  <th className="p-4 text-right">Sotish narxi</th>
                  <th className="p-4 text-center">Qoldiq</th>
                  <th className="p-4 text-center">Holat</th>
                  {isCeo && <th className="p-4 text-right">Amallar</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {products.map(p => {
                  const isLow = p.quantity > 0 && p.quantity <= p.min_stock;
                  const isOut = p.quantity <= 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-sans">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-800 bg-slate-950 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-100 truncate">{p.name}</p>
                            <p className="text-[10px] text-slate-500 truncate max-w-[200px]">{p.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-sans text-slate-300">{p.category_name || '-'}</td>
                      <td className="p-4 text-slate-400">
                        <p className="text-slate-300 font-semibold">{p.barcode}</p>
                        <p className="text-[10px] text-slate-500">{p.sku}</p>
                      </td>
                      <td className="p-4 text-right text-slate-400 tabular-nums">{formatUZS(p.purchase_price)}</td>
                      <td className="p-4 text-right font-bold text-emerald-400 tabular-nums">
                        {formatUZS(p.selling_price)}
                      </td>
                      <td className="p-4 text-center tabular-nums">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            isOut
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : isLow
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'text-slate-200'
                          }`}
                        >
                          {p.quantity} {p.unit}
                        </span>
                      </td>
                      <td className="p-4 text-center font-sans">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            p.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {p.status === 'active' ? 'Faol' : 'Nofaol'}
                        </span>
                      </td>
                      {isCeo && (
                        <td className="p-4 text-right font-sans">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(p)}
                              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                              title="Tahrirlash"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id, p.name)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                              title="O'chirish"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map(p => (
            <div
              key={p.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700 transition-all group"
            >
              <div>
                <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-950 mb-3">
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur-sm text-[11px] font-bold font-mono text-emerald-400">
                    {p.quantity} {p.unit}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-slate-100 line-clamp-1">{p.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{p.category_name}</p>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{p.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-500">Sotish narxi:</p>
                  <p className="text-sm font-extrabold text-emerald-400 font-mono tabular-nums">
                    {formatUZS(p.selling_price)}
                  </p>
                </div>
                {isCeo && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(p)}
                      className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(p.id, p.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT PRODUCT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="font-bold text-base text-slate-100">
                {editingProduct ? "Mahsulotni Tahrirlash" : "Yangi Ichimlik Qo'shish"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Mahsulot nomi *
                  </label>
                  <input
                    type="text"
                    required
                    value={modalForm.name}
                    onChange={e => setModalForm({ ...modalForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                    placeholder="Masalan: Royal Craft Cola 0.5L"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Toifa *</label>
                  <select
                    value={modalForm.category_id}
                    onChange={e => setModalForm({ ...modalForm, category_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Holati</label>
                  <select
                    value={modalForm.status}
                    onChange={e => setModalForm({ ...modalForm, status: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="active">Faol (Sotuvda)</option>
                    <option value="inactive">Nofaol</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Kelish narxi (Tannarx, UZS) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={modalForm.purchase_price}
                    onChange={e => setModalForm({ ...modalForm, purchase_price: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                    placeholder="10000"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Sotish narxi (UZS) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={modalForm.selling_price}
                    onChange={e => setModalForm({ ...modalForm, selling_price: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                    placeholder="15000"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Mavjud miqdor (Qoldiq)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={modalForm.quantity}
                    onChange={e => setModalForm({ ...modalForm, quantity: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                    placeholder="50"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Minimal ogohlantirish qoldig'i
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={modalForm.min_stock}
                    onChange={e => setModalForm({ ...modalForm, min_stock: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                    placeholder="5"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Shtrix-kod</label>
                  <input
                    type="text"
                    value={modalForm.barcode}
                    onChange={e => setModalForm({ ...modalForm, barcode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">SKU</label>
                  <input
                    type="text"
                    value={modalForm.sku}
                    onChange={e => setModalForm({ ...modalForm, sku: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Rasm URL</label>
                  <input
                    type="text"
                    value={modalForm.image_url}
                    onChange={e => setModalForm({ ...modalForm, image_url: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                    placeholder="https://... yoki /src/assets/images/..."
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Tavsif</label>
                  <textarea
                    rows={2}
                    value={modalForm.description}
                    onChange={e => setModalForm({ ...modalForm, description: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                    placeholder="Tarkibi, xususiyatlari, saqlash sharoiti..."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
