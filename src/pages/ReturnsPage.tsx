import React, { useState, useEffect } from 'react';
import { apiRequest, formatUZS, formatDate } from '../services/api';
import {
  RotateCcw,
  Search,
  CheckCircle2,
  AlertCircle,
  Package,
  X,
  History,
  ReceiptText,
  RefreshCw
} from 'lucide-react';

export const ReturnsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'new_return' | 'history'>('new_return');
  const [orderSearchQuery, setOrderSearchQuery] = useState<string>('');
  const [foundOrder, setFoundOrder] = useState<any>(null);
  const [returnItemsState, setReturnItemsState] = useState<{ [orderItemId: string]: number }>({});
  const [reason, setReason] = useState<string>('Damaged (Yaroqsiz mahsulot)');
  const [notes, setNotes] = useState<string>('');

  const [returnsHistory, setReturnsHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchReturnsHistory();
    }
  }, [activeTab]);

  async function fetchReturnsHistory() {
    setLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; returns: any[] }>('/api/returns');
      if (res.success) setReturnsHistory(res.returns || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Search order for return
  const handleSearchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderSearchQuery.trim()) return;

    setLoading(true);
    setFoundOrder(null);
    setReturnItemsState({});
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiRequest<{ success: boolean; order: any }>(`/api/orders/${orderSearchQuery.trim()}`);
      if (res.success && res.order) {
        if (res.order.status === 'cancelled') {
          setErrorMsg('Ushbu buyurtma bekor qilingan, undan qaytarish amalga oshirib bo\'lmaydi.');
          return;
        }
        setFoundOrder(res.order);
      } else {
        setErrorMsg('Bunday buyurtma topilmadi');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Buyurtma topilmadi');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (orderItemId: string, maxQty: number, value: number) => {
    const safeVal = Math.max(0, Math.min(maxQty, value));
    setReturnItemsState(prev => ({
      ...prev,
      [orderItemId]: safeVal
    }));
  };

  // Calculate refund sum
  const totalRefund = foundOrder
    ? foundOrder.items.reduce((sum: number, it: any) => {
        const qty = returnItemsState[it.id] || 0;
        return sum + qty * it.unit_price;
      }, 0)
    : 0;

  // Submit return
  const handleSubmitReturn = async () => {
    if (!foundOrder) return;
    const itemsToReturn = Object.entries(returnItemsState)
      .filter(([_, qty]) => qty > 0)
      .map(([orderItemId, quantity]) => ({
        orderItemId,
        quantity
      }));

    if (itemsToReturn.length === 0) {
      setErrorMsg('Kamida bitta mahsulot uchun qaytarish miqdorini belgilang');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await apiRequest('/api/returns', {
        method: 'POST',
        body: JSON.stringify({
          orderId: foundOrder.id,
          items: itemsToReturn,
          reason,
          notes
        })
      });

      if (res.success) {
        setSuccessMsg(
          `Mahsulotlar muvaffaqiyatli qaytarildi! Qaytarilgan summa: ${formatUZS(res.refundAmount)}. Ombor qoldig'i qayta tiklandi.`
        );
        setFoundOrder(null);
        setReturnItemsState({});
        setOrderSearchQuery('');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Qaytarishda xatolik yuz berdi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Qaytarishlar & Tovarni Tiklash</h1>
          <p className="text-xs text-slate-400">
            Xaridor tomonidan qaytarilgan mahsulotlarni rasmiylashtirish va omborga qaytarish
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('new_return')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'new_return'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-slate-100'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            Yangi Qaytarish
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'history'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'bg-slate-950 border border-slate-800 text-slate-300 hover:text-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            Qaytarishlar Tarixi
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {activeTab === 'new_return' ? (
        <div className="space-y-5">
          {/* Order Search Bar */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              1. Chek / Buyurtma raqamini kiriting
            </h2>
            <form onSubmit={handleSearchOrder} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Masalan: SD-20260923-4521 yoki buyurtma ID si..."
                  value={orderSearchQuery}
                  onChange={e => setOrderSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Qidirish
              </button>
            </form>
          </div>

          {/* Found Order Card & Return Flow */}
          {foundOrder && (
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Topilgan Buyurtma</span>
                  <h3 className="text-lg font-bold text-slate-100 font-mono">{foundOrder.order_number}</h3>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Sana:</span>
                    <span className="text-slate-200">{formatDate(foundOrder.created_at)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Mijoz:</span>
                    <span className="text-slate-200 font-sans">{foundOrder.customer_name || 'Umumiy'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Buyurtma summasi:</span>
                    <span className="text-emerald-400 font-bold">{formatUZS(foundOrder.total)}</span>
                  </div>
                </div>
              </div>

              {/* Items in Order */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  2. Qaytariladigan ichimliklar va miqdorini tanlang:
                </h4>
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                      <tr>
                        <th className="p-3">Mahsulot</th>
                        <th className="p-3 text-center">Xarid qilingan</th>
                        <th className="p-3 text-center">Qaytarilgan</th>
                        <th className="p-3 text-center">Maksimal qaytarish</th>
                        <th className="p-3 text-right">Dona narxi</th>
                        <th className="p-3 text-center w-32">Qaytarish miqdori</th>
                        <th className="p-3 text-right">Qaytariladigan summa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {foundOrder.items.map((it: any) => {
                        const alreadyReturned = it.returned_quantity || 0;
                        const available = it.quantity - alreadyReturned;
                        const selectedQty = returnItemsState[it.id] || 0;

                        return (
                          <tr key={it.id} className="hover:bg-slate-800/30">
                            <td className="p-3 font-sans font-semibold text-slate-200">{it.product_name}</td>
                            <td className="p-3 text-center text-slate-300">{it.quantity}</td>
                            <td className="p-3 text-center text-amber-400">{alreadyReturned}</td>
                            <td className="p-3 text-center font-bold text-emerald-400">{available}</td>
                            <td className="p-3 text-right text-slate-400">{formatUZS(it.unit_price)}</td>
                            <td className="p-3 text-center">
                              {available > 0 ? (
                                <input
                                  type="number"
                                  min="0"
                                  max={available}
                                  value={selectedQty}
                                  onChange={e =>
                                    handleQuantityChange(it.id, available, parseInt(e.target.value) || 0)
                                  }
                                  className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-center font-mono text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                                />
                              ) : (
                                <span className="text-[11px] text-slate-500 font-sans">To'liq qaytarilgan</span>
                              )}
                            </td>
                            <td className="p-3 text-right font-bold text-slate-100">
                              {formatUZS(selectedQty * it.unit_price)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Reason & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-800">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Qaytarish sababi *</label>
                  <select
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Damaged (Yaroqsiz mahsulot)">Damaged (Yaroqsiz / Shikastlangan)</option>
                    <option value="Wrong product (Noto'g'ri mahsulot)">Wrong product (Noto'g'ri berilgan)</option>
                    <option value="Customer changed mind (Mijoz fikridan qaytdi)">
                      Customer changed mind (Mijoz fikridan qaytdi)
                    </option>
                    <option value="Quality issue (Sifat muammosi)">Quality issue (Sifat muammosi)</option>
                    <option value="Other (Boshqa sabab)">Other (Boshqa sabab)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Qo'shimcha izoh</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Izoh yozing..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Total Refund Banner & Confirmation */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-slate-400">Mijozga qaytariladigan summa:</span>
                  <p className="text-2xl font-extrabold text-emerald-400 font-mono tabular-nums">
                    {formatUZS(totalRefund)}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={submitting || totalRefund <= 0}
                  onClick={handleSubmitReturn}
                  className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-40 transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {submitting ? 'Rasmiylashtirilmoqda...' : 'Qaytarishni Tasdiqlash'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* History of Returns */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">Qaytarish ID</th>
                  <th className="p-4">Asosiy Chek</th>
                  <th className="p-4">Vaqt</th>
                  <th className="p-4">Sabab</th>
                  <th className="p-4">Kassir</th>
                  <th className="p-4 text-center">Mahsulotlar</th>
                  <th className="p-4 text-right">Qaytarilgan summa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {returnsHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-500 font-sans">
                      Qaytarishlar tarixi mavjud emas
                    </td>
                  </tr>
                ) : (
                  returnsHistory.map(r => (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 text-slate-400">{r.id}</td>
                      <td className="p-4 font-bold text-slate-100">{r.order_number}</td>
                      <td className="p-4 text-slate-400">{formatDate(r.created_at)}</td>
                      <td className="p-4 font-sans text-slate-300">{r.reason}</td>
                      <td className="p-4 font-sans text-slate-400">{r.cashier_name}</td>
                      <td className="p-4 text-center font-sans text-slate-300">
                        {r.total_returned_units || r.item_count} dona
                      </td>
                      <td className="p-4 text-right font-extrabold text-rose-400 tabular-nums">
                        -{formatUZS(r.total_refund_amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
