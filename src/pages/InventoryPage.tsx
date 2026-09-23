import React, { useState, useEffect } from 'react';
import { Product, InventoryMovement } from '../types';
import { apiRequest, formatUZS, formatDate } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Warehouse,
  ArrowDownLeft,
  ArrowUpRight,
  Sliders,
  History,
  AlertTriangle,
  Package,
  Plus,
  X,
  RefreshCw,
  Search
} from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const { user } = useAuth();
  const isCeo = user?.role === 'CEO';

  const [activeTab, setActiveTab] = useState<'inventory' | 'movements'>('inventory');
  const [summary, setSummary] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  // Adjustment Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalType, setModalType] = useState<'purchase' | 'damaged' | 'manual_adjustment'>('purchase');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [qtyInput, setQtyInput] = useState<string>('');
  const [reasonInput, setReasonInput] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === 'inventory') {
        const res = await apiRequest<{ success: boolean; summary: any; products: Product[] }>('/api/inventory');
        if (res.success) {
          setSummary(res.summary);
          setProducts(res.products || []);
        }
      } else {
        const res = await apiRequest<{ success: boolean; movements: InventoryMovement[] }>('/api/inventory/movements');
        if (res.success) {
          setMovements(res.movements || []);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const openModal = (type: 'purchase' | 'damaged' | 'manual_adjustment', prodId?: string) => {
    setModalType(type);
    setSelectedProductId(prodId || products[0]?.id || '');
    setQtyInput('');
    setReasonInput('');
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setErrorMsg('Mahsulotni tanlang');
      return;
    }
    const q = Number(qtyInput);
    if (!q || q <= 0) {
      setErrorMsg('Miqdor musbat son bo\'lishi shart');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      await apiRequest('/api/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          productId: selectedProductId,
          type: modalType,
          quantity: q,
          reason: reasonInput || (modalType === 'purchase' ? 'Yangi partiya qabul qilindi' : 'Ombor nazorati')
        })
      });

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const q = search.toLowerCase().trim();
    return !q || p.name.toLowerCase().includes(q) || p.barcode.includes(q) || p.sku.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      {/* Top Header & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Omborxona Boshqaruvi</h1>
          <p className="text-xs text-slate-400">Tovarlarni kirim qilish, hisobdan chiqarish va qoldiq monitoringi</p>
        </div>

        {isCeo && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => openModal('purchase')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
            >
              <ArrowDownLeft className="w-4 h-4" />
              Kirim qilish
            </button>
            <button
              onClick={() => openModal('damaged')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 font-semibold text-xs transition-all"
            >
              <ArrowUpRight className="w-4 h-4" />
              Yaroqsiz / Chiqim
            </button>
          </div>
        )}
      </div>

      {/* Summary KPI Grid */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Jami Mahsulotlar</span>
            <p className="text-xl font-extrabold text-slate-100 font-mono tabular-nums mt-1">
              {summary.totalProducts} <span className="text-xs font-sans text-slate-400 font-normal">xil ({summary.totalUnits} dona)</span>
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tannarx bo'yicha qiymat</span>
            <p className="text-xl font-extrabold text-slate-100 font-mono tabular-nums mt-1">
              {formatUZS(summary.totalPurchaseValue)}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Kutilayotgan daromad</span>
            <p className="text-xl font-extrabold text-emerald-400 font-mono tabular-nums mt-1">
              +{formatUZS(summary.expectedProfit)}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Qoldiq ogohlantirishlari</span>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm font-bold text-amber-400 flex items-center gap-1 font-mono">
                <AlertTriangle className="w-3.5 h-3.5" /> {summary.lowStockCount} kam
              </span>
              <span className="text-sm font-bold text-rose-400 font-mono">
                {summary.outOfStockCount} tugagan
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'inventory'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Warehouse className="w-4 h-4" />
            Mavjud Qoldiqlar
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'movements'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            Ombor Harakatlari Tarixi
          </button>
        </div>

        {activeTab === 'inventory' && (
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Qoldiqdan qidirish..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
        )}
      </div>

      {/* Main Tab Content */}
      {loading ? (
        <div className="flex justify-center p-12 text-slate-400 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-400 mr-2" />
          Yuklanmoqda...
        </div>
      ) : activeTab === 'inventory' ? (
        /* Inventory Table */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">Mahsulot</th>
                  <th className="p-4">Toifa</th>
                  <th className="p-4 text-right">Kelish narxi</th>
                  <th className="p-4 text-right">Sotish narxi</th>
                  <th className="p-4 text-center">Qoldiq</th>
                  <th className="p-4 text-right">Jami tannarx</th>
                  <th className="p-4 text-center">Holat</th>
                  {isCeo && <th className="p-4 text-right">Tezkor amal</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredProducts.map(p => {
                  const isOut = p.quantity <= 0;
                  const isLow = p.quantity > 0 && p.quantity <= p.min_stock;
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-sans font-medium text-slate-100 flex items-center gap-3">
                        <img src={p.image_url} alt="" className="w-8 h-8 rounded-lg object-cover bg-slate-950" />
                        <div>
                          <p className="font-bold text-slate-200">{p.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{p.barcode}</p>
                        </div>
                      </td>
                      <td className="p-4 font-sans text-slate-400">{p.category_name}</td>
                      <td className="p-4 text-right text-slate-400 tabular-nums">{formatUZS(p.purchase_price)}</td>
                      <td className="p-4 text-right font-bold text-slate-200 tabular-nums">{formatUZS(p.selling_price)}</td>
                      <td className="p-4 text-center font-bold tabular-nums">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] ${
                            isOut
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : isLow
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'text-slate-100'
                          }`}
                        >
                          {p.quantity} {p.unit}
                        </span>
                      </td>
                      <td className="p-4 text-right text-slate-300 tabular-nums">
                        {formatUZS(p.total_purchase_value || p.purchase_price * p.quantity)}
                      </td>
                      <td className="p-4 text-center font-sans">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isOut
                              ? 'bg-rose-500/10 text-rose-400'
                              : isLow
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-emerald-500/10 text-emerald-400'
                          }`}
                        >
                          {isOut ? 'Tugagan' : isLow ? 'Kam qolgan' : 'Yetarli'}
                        </span>
                      </td>
                      {isCeo && (
                        <td className="p-4 text-right font-sans">
                          <button
                            onClick={() => openModal('purchase', p.id)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-xs font-semibold mr-1 transition-colors"
                          >
                            + Kirim
                          </button>
                          <button
                            onClick={() => openModal('damaged', p.id)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-lg text-xs font-semibold transition-colors"
                          >
                            - Chiqim
                          </button>
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
        /* Movements History Table */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">Vaqt</th>
                  <th className="p-4">Mahsulot</th>
                  <th className="p-4">Harakat turi</th>
                  <th className="p-4 text-center">Miqdor</th>
                  <th className="p-4">Sabab / Izoh</th>
                  <th className="p-4">Mas'ul xodim</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {movements.map(m => {
                  const isPositive = m.type === 'purchase' || m.type === 'return';
                  return (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 text-slate-400">{formatDate(m.created_at)}</td>
                      <td className="p-4 font-sans font-semibold text-slate-200">{m.product_name}</td>
                      <td className="p-4 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            m.type === 'purchase'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : m.type === 'sale'
                              ? 'bg-blue-500/10 text-blue-400'
                              : m.type === 'return'
                              ? 'bg-teal-500/10 text-teal-400'
                              : m.type === 'damaged'
                              ? 'bg-rose-500/10 text-rose-400'
                              : 'bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {m.type === 'purchase'
                            ? 'Kirim'
                            : m.type === 'sale'
                            ? 'Savdo'
                            : m.type === 'return'
                            ? 'Qaytarish'
                            : m.type === 'damaged'
                            ? 'Yaroqsiz'
                            : 'Tuzatish'}
                        </span>
                      </td>
                      <td className="p-4 text-center font-bold tabular-nums">
                        <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                          {isPositive ? '+' : '-'}{m.quantity} {m.unit || 'dona'}
                        </span>
                      </td>
                      <td className="p-4 font-sans text-slate-300 max-w-xs truncate">{m.reason}</td>
                      <td className="p-4 font-sans text-slate-400">{m.user_name}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADJUSTMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-slate-100">
                {modalType === 'purchase'
                  ? 'Omborga tovar kiritish (Kirim)'
                  : modalType === 'damaged'
                  ? 'Yaroqsiz tovar (Chiqim)'
                  : 'Qoldiqni qo\'lda tuzatish'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAdjust} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Mahsulotni tanlang</label>
                <select
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Hozirda: {p.quantity} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Miqdor ({products.find(p => p.id === selectedProductId)?.unit || 'dona'}) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={qtyInput}
                  onChange={e => setQtyInput(e.target.value)}
                  placeholder="Masalan: 24"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Sabab / Izoh</label>
                <input
                  type="text"
                  value={reasonInput}
                  onChange={e => setReasonInput(e.target.value)}
                  placeholder="Masalan: Yangi partiya keldi, yaroqsiz chiqdi..."
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
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                >
                  {submitting ? 'Bajarilmoqda...' : 'Tasdiqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
