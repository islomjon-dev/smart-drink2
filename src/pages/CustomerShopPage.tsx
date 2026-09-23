import React, { useState, useEffect } from 'react';
import { Product, Category } from '../types';
import { apiRequest, formatUZS } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ReceiptModal } from '../components/common/ReceiptModal';
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Wine,
  CheckCircle2,
  Clock,
  Sparkles,
  Phone,
  MapPin,
  ArrowRight,
  RefreshCw
} from 'lucide-react';

export const CustomerShopPage: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'catalog' | 'my_orders'>('catalog');
  const [loading, setLoading] = useState<boolean>(true);

  // Checkout modal
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [phone, setPhone] = useState<string>('+998');
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('pickup');
  const [address, setAddress] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Receipt modal
  const [receiptData, setReceiptData] = useState<any>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffect(() => {
    if (activeTab === 'my_orders') {
      loadMyOrders();
    }
  }, [activeTab]);

  async function loadCatalog() {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        apiRequest<{ success: boolean; products: Product[] }>('/api/products?status=active'),
        apiRequest<{ success: boolean; categories: Category[] }>('/api/categories')
      ]);
      if (prodRes.success) setProducts(prodRes.products || []);
      if (catRes.success) setCategories(catRes.categories || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadMyOrders() {
    try {
      const res = await apiRequest<{ success: boolean; orders: any[] }>('/api/orders');
      if (res.success) {
        // Filter orders placed by this customer or recent orders
        const filtered = (res.orders || []).filter(
          o => o.customer_name === user?.name || !o.customer_id
        );
        setMyOrders(filtered);
      }
    } catch (err) {
      console.error(err);
    }
  }

  const addToCart = (product: Product) => {
    if (product.quantity <= 0) {
      alert('Afsuski, ushbu ichimlik hozirda tugagan');
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) {
          alert(`Maksimal ${product.quantity} dona mavjud`);
          return prev;
        }
        return prev.map(i =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev =>
      prev
        .map(i => {
          if (i.product.id === productId) {
            const n = i.quantity + delta;
            return n > 0 ? { ...i, quantity: n } : null;
          }
          return i;
        })
        .filter(Boolean) as any
    );
  };

  const filtered = products.filter(p => {
    const matchesCat = selectedCategory === 'all' || p.category_id === selectedCategory;
    const matchesSearch =
      !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const cartTotal = cart.reduce((sum, i) => sum + i.product.selling_price * i.quantity, 0);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setSubmitting(true);
    try {
      const payload = {
        customerName: user?.name || 'Mijoz',
        paymentMethod: 'card',
        discount: 0,
        notes: `Online Buyurtma (${deliveryType}): ${deliveryType === 'delivery' ? address : 'Do\'kondan olib ketish'}. Tel: ${phone}. ${notes}`,
        items: cart.map(i => ({
          productId: i.product.id,
          quantity: i.quantity
        }))
      };

      const res = await apiRequest<{ success: boolean; receipt: any }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.success) {
        setIsCheckoutOpen(false);
        setCart([]);
        setReceiptData(res.receipt);
        setIsReceiptOpen(true);
        loadCatalog();
      }
    } catch (err: any) {
      alert(err.message || 'Buyurtma rasmiylashtirishda xatolik');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-500/20 p-6 md:p-8">
        <div className="max-w-xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Premium Ichimliklar & Tetiklantiruvchi Kokteyllar</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">
            Xush kelibsiz, {user?.name || 'Hurmatli Mehmon'}!
          </h1>
          <p className="text-xs md:text-sm text-slate-400">
            Tabiiy mevali sharbatlar, muzdek kofe, energiya va tetiklantiruvchi ichimliklarni onlayn buyurtma qiling.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 mt-5">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'catalog'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-950/60 border border-slate-800 text-slate-300 hover:text-slate-100'
            }`}
          >
            Ichimliklar Menyusi
          </button>
          <button
            onClick={() => setActiveTab('my_orders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'my_orders'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-950/60 border border-slate-800 text-slate-300 hover:text-slate-100'
            }`}
          >
            Mening Buyurtmalarim
          </button>
        </div>
      </div>

      {activeTab === 'catalog' ? (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Main Products Grid (Flex-1) */}
          <div className="flex-1 space-y-4 w-full">
            {/* Search and Category Filter */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ichimlik nomi yoki ta'mi bo'yicha qidiruv..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 no-scrollbar">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Barchasi
                </button>
                {categories.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedCategory === c.id
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mx-auto mb-2" />
                Ichimliklar yuklanmoqda...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-xs">
                Hech qanday ichimlik topilmadi
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map(p => {
                  const isOutOfStock = p.quantity <= 0;
                  return (
                    <div
                      key={p.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-4 flex flex-col justify-between hover:border-emerald-500/50 transition-all group"
                    >
                      <div>
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 mb-3">
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {isOutOfStock ? (
                            <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-rose-500/90 text-white text-[10px] font-bold">
                              Tugagan
                            </span>
                          ) : (
                            <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur-sm text-emerald-400 text-[10px] font-bold font-mono">
                              Mavjud: {p.quantity} {p.unit}
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                          {p.category_name}
                        </span>
                        <h3 className="font-bold text-sm text-slate-100 mt-0.5">{p.name}</h3>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{p.description}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-base font-extrabold text-emerald-400 font-mono tabular-nums">
                          {formatUZS(p.selling_price)}
                        </span>
                        <button
                          disabled={isOutOfStock}
                          onClick={() => addToCart(p)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 disabled:opacity-40 transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Savatga
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sticky Mini Cart (w-80) */}
          <div className="w-full lg:w-80 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shrink-0 shadow-2xl sticky top-20">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">Mening Savatim</h3>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400">{cart.length} xil</span>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto divide-y divide-slate-800/60">
              {cart.length === 0 ? (
                <p className="text-center py-8 text-slate-500 text-xs">Savatchangiz bo'sh</p>
              ) : (
                cart.map(item => (
                  <div key={item.product.id} className="pt-2 first:pt-0 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-200 truncate">{item.product.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {formatUZS(item.product.selling_price)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="p-1 text-slate-400 hover:text-slate-200"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center text-xs font-bold text-slate-100 font-mono">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="p-1 text-slate-400 hover:text-slate-200"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-slate-400 font-semibold">Jami to'lov:</span>
                  <span className="text-lg font-extrabold text-emerald-400 font-mono tabular-nums">
                    {formatUZS(cartTotal)}
                  </span>
                </div>

                <button
                  onClick={() => setIsCheckoutOpen(true)}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <span>Buyurtma Berish</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* MY ORDERS TAB */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Xaridlar Tarixim</h2>
          {myOrders.length === 0 ? (
            <p className="text-center py-10 text-slate-500 text-xs">Siz hali hech qanday buyurtma bermadingiz</p>
          ) : (
            <div className="space-y-3">
              {myOrders.map(o => (
                <div
                  key={o.id}
                  className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <span className="text-xs font-bold font-mono text-slate-200">{o.order_number}</span>
                    <p className="text-[11px] text-slate-500">{new Date(o.created_at).toLocaleString('uz-UZ')}</p>
                    <p className="text-xs text-slate-400 mt-1">{o.notes || 'Ichimliklar xaridi'}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-sm font-extrabold text-emerald-400 font-mono tabular-nums">
                      {formatUZS(o.total)}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        o.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {o.status === 'completed' ? 'Yetkazildi / Tayyor' : o.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CHECKOUT MODAL */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-100">Buyurtmani Tasdiqlash</h3>

            <form onSubmit={handlePlaceOrder} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Yetkazib berish usuli</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryType('pickup')}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      deliveryType === 'pickup'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Olib ketish (Do'kondan)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryType('delivery')}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      deliveryType === 'delivery'
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Yetkazib berish (Kuryer)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Telefon raqamingiz *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              {deliveryType === 'delivery' && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Manzilingiz *</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Ko'cha, uy, xonadon..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Qo'shimcha istaklar</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Muz ko'proq solinsin, shakarsiz..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 bg-slate-950 rounded-xl flex justify-between items-baseline text-xs font-mono">
                <span className="font-sans text-slate-400">Jami to'lov:</span>
                <span className="text-base font-bold text-emerald-400">{formatUZS(cartTotal)}</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20"
                >
                  {submitting ? 'Yuborilmoqda...' : 'Tasdiqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        receiptData={receiptData}
      />
    </div>
  );
};
