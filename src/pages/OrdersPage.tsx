import React, { useState, useEffect } from 'react';
import { Order } from '../types';
import { apiRequest, formatUZS, formatDate } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ReceiptModal } from '../components/common/ReceiptModal';
import {
  ReceiptText,
  Search,
  Filter,
  Eye,
  Printer,
  XCircle,
  X,
  RefreshCw,
  CreditCard,
  Banknote,
  Sparkles,
  Calendar
} from 'lucide-react';

export const OrdersPage: React.FC = () => {
  const { user } = useAuth();
  const isCeo = user?.role === 'CEO';

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  // Selected order details modal
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

  // Receipt Modal
  const [receiptData, setReceiptData] = useState<any>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);

  useEffect(() => {
    fetchOrders();
  }, [search, statusFilter, paymentFilter]);

  async function fetchOrders() {
    setLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; orders: Order[] }>('/api/orders', {
        params: {
          search,
          status: statusFilter,
          paymentMethod: paymentFilter
        }
      });
      if (res.success) setOrders(res.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const openOrderDetail = async (id: string) => {
    try {
      const res = await apiRequest<{ success: boolean; order: any }>(`/api/orders/${id}`);
      if (res.success) {
        setSelectedOrder(res.order);
        setIsDetailOpen(true);
      }
    } catch (err: any) {
      alert(err.message || 'Buyurtma tafsilotlarini yuklashda xatolik');
    }
  };

  const handlePrintReceipt = (order: any) => {
    const rData = {
      storeName: 'SMART DRINK POS',
      storeAddress: 'Toshkent sh., Amir Temur shox ko\'chasi, 45-uy',
      storePhone: '+998 71 200 44 88',
      orderId: order.id,
      orderNumber: order.order_number,
      date: new Date(order.created_at).toLocaleDateString('uz-UZ'),
      time: new Date(order.created_at).toLocaleTimeString('uz-UZ'),
      cashier: order.cashier_name || 'Kassa',
      customer: order.customer_name || 'Umumiy Xaridor',
      items: order.items || [],
      subtotal: order.subtotal,
      discount: order.discount,
      tax: order.tax || 0,
      total: order.total,
      paymentMethod: order.payment_method,
      footer: 'Xaridingiz uchun tashakkur! Har doim yangi va tetiklantiruvchi!'
    };
    setReceiptData(rData);
    setIsReceiptOpen(true);
  };

  const handleCancelOrder = async (orderId: string, orderNumber: string) => {
    if (!confirm(`Haqiqatan ham ${orderNumber} buyurtmasini bekor qilmoqchimisiz? Tovarlar qoldig'i omborga qaytariladi.`)) {
      return;
    }

    try {
      await apiRequest(`/api/orders/${orderId}/cancel`, { method: 'PATCH' });
      fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setIsDetailOpen(false);
      }
    } catch (err: any) {
      alert(err.message || 'Buyurtmani bekor qilishda xatolik');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Buyurtmalar Jurnali</h1>
          <p className="text-xs text-slate-400">Do'kondagi barcha savdo operatsiyalari va cheklar tarixi</p>
        </div>

        <button
          onClick={fetchOrders}
          className="p-2.5 text-slate-400 hover:text-slate-100 bg-slate-950 border border-slate-800 rounded-xl transition-colors shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Chek raqami, mijoz yoki kassir..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Barcha Holatlar</option>
            <option value="completed">Muvaffaqiyatli</option>
            <option value="partially_returned">Qisman qaytarilgan</option>
            <option value="returned">To'liq qaytarilgan</option>
            <option value="cancelled">Bekor qilingan</option>
          </select>
        </div>

        <div>
          <select
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Barcha To'lov Turlari</option>
            <option value="cash">Naqd pul</option>
            <option value="card">Plastik karta</option>
            <option value="other">Boshqa (Click/Payme)</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="flex justify-center p-12 text-slate-400 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-400 mr-2" />
          Buyurtmalar yuklanmoqda...
        </div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
          <ReceiptText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="font-semibold text-slate-300 text-sm">Buyurtmalar topilmadi</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">Chek raqami</th>
                  <th className="p-4">Sana va Vaqt</th>
                  <th className="p-4">Mijoz</th>
                  <th className="p-4">Kassir</th>
                  <th className="p-4">To'lov turi</th>
                  <th className="p-4 text-right">Summa</th>
                  <th className="p-4 text-center">Holat</th>
                  <th className="p-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-bold text-slate-100">{o.order_number}</td>
                    <td className="p-4 text-slate-400">{formatDate(o.created_at)}</td>
                    <td className="p-4 font-sans text-slate-200">{o.customer_name || 'Umumiy'}</td>
                    <td className="p-4 font-sans text-slate-400">{o.cashier_name || 'Kassa'}</td>
                    <td className="p-4 font-sans">
                      <span className="flex items-center gap-1 text-slate-300">
                        {o.payment_method === 'cash' ? (
                          <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                        ) : o.payment_method === 'card' ? (
                          <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        )}
                        <span className="capitalize">{o.payment_method}</span>
                      </span>
                    </td>
                    <td className="p-4 text-right font-extrabold text-emerald-400 tabular-nums">
                      {formatUZS(o.total)}
                    </td>
                    <td className="p-4 text-center font-sans">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          o.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : o.status === 'cancelled'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {o.status === 'completed'
                          ? 'Muvaffaqiyatli'
                          : o.status === 'cancelled'
                          ? 'Bekor qilingan'
                          : o.status === 'partially_returned'
                          ? 'Qisman qaytarilgan'
                          : 'Qaytarilgan'}
                      </span>
                    </td>
                    <td className="p-4 text-right font-sans">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openOrderDetail(o.id)}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Tafsilotlar"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ORDER DETAILS MODAL */}
      {isDetailOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs text-slate-400">Buyurtma tafsilotlari</span>
                <h3 className="font-extrabold text-lg text-slate-100 font-mono">{selectedOrder.order_number}</h3>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-3 rounded-xl text-xs font-mono">
              <div>
                <span className="text-slate-500 font-sans block text-[10px]">Sana:</span>
                <span className="text-slate-200">{formatDate(selectedOrder.created_at)}</span>
              </div>
              <div>
                <span className="text-slate-500 font-sans block text-[10px]">Mijoz:</span>
                <span className="text-slate-200 font-sans">{selectedOrder.customer_name || 'Umumiy'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-sans block text-[10px]">Kassir:</span>
                <span className="text-slate-200 font-sans">{selectedOrder.cashier_name || 'Kassa'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-sans block text-[10px]">To'lov turi:</span>
                <span className="text-emerald-400 font-bold uppercase">{selectedOrder.payment_method}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Ichimliklar ro'yxati</h4>
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-3">Mahsulot</th>
                      <th className="p-3 text-center">Miqdor</th>
                      <th className="p-3 text-right">Dona narxi</th>
                      <th className="p-3 text-right">Jami</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {selectedOrder.items?.map((it: any) => (
                      <tr key={it.id}>
                        <td className="p-3 font-sans font-medium text-slate-200">
                          {it.product_name}
                          {it.returned_quantity > 0 && (
                            <span className="ml-2 text-[10px] text-amber-400 font-sans">
                              ({it.returned_quantity} dona qaytarilgan)
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center text-slate-300">{it.quantity}</td>
                        <td className="p-3 text-right text-slate-400">{formatUZS(it.unit_price)}</td>
                        <td className="p-3 text-right font-bold text-slate-100">{formatUZS(it.total_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Totals */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400 font-mono">
                <span>Oraliq summa:</span>
                <span>{formatUZS(selectedOrder.subtotal)}</span>
              </div>
              {selectedOrder.discount > 0 && (
                <div className="flex justify-between text-emerald-400 font-mono">
                  <span>Chegirma:</span>
                  <span>-{formatUZS(selectedOrder.discount)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline text-sm">
                <span className="font-bold text-slate-200">JAMI TO'LOV:</span>
                <span className="font-extrabold text-emerald-400 font-mono text-base tabular-nums">
                  {formatUZS(selectedOrder.total)}
                </span>
              </div>
            </div>

            {/* Modal Actions: Print Receipt & Cancel */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              {isCeo && selectedOrder.status !== 'cancelled' ? (
                <button
                  onClick={() => handleCancelOrder(selectedOrder.id, selectedOrder.order_number)}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  Buyurtmani bekor qilish
                </button>
              ) : (
                <div></div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintReceipt(selectedOrder)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  Chekni chiqarish
                </button>
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors"
                >
                  Yopish
                </button>
              </div>
            </div>
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
