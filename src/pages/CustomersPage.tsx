import React, { useState, useEffect } from 'react';
import { Customer } from '../types';
import { apiRequest, formatUZS, formatDate } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Plus,
  Search,
  Eye,
  Trash2,
  Edit2,
  X,
  RefreshCw,
  Award,
  Phone,
  Mail,
  History
} from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const { user } = useAuth();
  const isCeo = user?.role === 'CEO';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  // Add/Edit Customer Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Customer History Modal
  const [historyCustomer, setHistoryCustomer] = useState<any>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  async function fetchCustomers() {
    setLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; customers: Customer[] }>('/api/customers', {
        params: { search }
      });
      if (res.success) setCustomers(res.customers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const openAdd = () => {
    setEditingCustomer(null);
    setForm({ name: '', phone: '+998', email: '', notes: '' });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditingCustomer(c);
    setForm({
      name: c.name,
      phone: c.phone || '',
      email: c.email || '',
      notes: c.notes || ''
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrorMsg('Mijoz ismini kiriting');
      return;
    }

    try {
      if (editingCustomer) {
        await apiRequest(`/api/customers/${editingCustomer.id}`, {
          method: 'PUT',
          body: JSON.stringify(form)
        });
      } else {
        await apiRequest('/api/customers', {
          method: 'POST',
          body: JSON.stringify(form)
        });
      }
      setIsModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Saqlashda xatolik');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" mijozini o'chirishni xohlaysizmi?`)) return;
    try {
      await apiRequest(`/api/customers/${id}`, { method: 'DELETE' });
      fetchCustomers();
    } catch (err: any) {
      alert(err.message || 'O\'chirishda xatolik');
    }
  };

  const openHistory = async (c: Customer) => {
    try {
      const res = await apiRequest<{ success: boolean; customer: any; orders: any[] }>(
        `/api/customers/${c.id}`
      );
      if (res.success) {
        setHistoryCustomer(res);
        setIsHistoryOpen(true);
      }
    } catch (err: any) {
      alert(err.message || 'Mijoz tarixini yuklashda xatolik');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Mijozlar Boshqaruvi</h1>
          <p className="text-xs text-slate-400">Doimiy mijozlar bazasi, xaridlar tarixi va sodiqlik ballari</p>
        </div>

        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          Yangi Mijoz
        </button>
      </div>

      {/* Search */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Ismi, telefon raqami yoki emaili..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center p-12 text-slate-400 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-400 mr-2" />
          Mijozlar yuklanmoqda...
        </div>
      ) : customers.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
          <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="font-semibold text-slate-300 text-sm">Mijozlar topilmadi</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">Mijoz</th>
                  <th className="p-4">Telefon</th>
                  <th className="p-4 text-center">Sodiqlik ballari</th>
                  <th className="p-4 text-center">Xaridlar soni</th>
                  <th className="p-4 text-right">Jami sarflagan</th>
                  <th className="p-4 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {customers.map(c => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-sans font-semibold text-slate-200">
                      <p>{c.name}</p>
                      {c.email && <p className="text-[11px] text-slate-500 font-mono">{c.email}</p>}
                    </td>
                    <td className="p-4 text-slate-300">{c.phone || '—'}</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 text-[11px]">
                        <Award className="w-3 h-3" />
                        {c.loyalty_points || 0} ball
                      </span>
                    </td>
                    <td className="p-4 text-center text-slate-300 tabular-nums">{c.total_orders || 0}</td>
                    <td className="p-4 text-right font-extrabold text-emerald-400 tabular-nums">
                      {formatUZS(c.total_spent || 0)}
                    </td>
                    <td className="p-4 text-right font-sans">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openHistory(c)}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Xaridlar tarixi"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Tahrirlash"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {isCeo && (
                          <button
                            onClick={() => handleDelete(c.id, c.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title="O'chirish"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-slate-100">
                {editingCustomer ? 'Mijozni tahrirlash' : 'Yangi mijoz qo\'shish'}
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

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Mijoz ismi *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Ism Familiya"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Telefon raqami</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="+998 90 123 45 67"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="mijoz@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Izoh</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  placeholder="Sevimli ichimliklari, chegirmalari..."
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

      {/* CUSTOMER HISTORY MODAL */}
      {isHistoryOpen && historyCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs text-slate-400">Mijoz xaridlar tarixi</span>
                <h3 className="font-bold text-base text-slate-100">{historyCustomer.customer?.name}</h3>
              </div>
              <button onClick={() => setIsHistoryOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-3 rounded-xl text-center text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[10px] font-sans">Jami buyurtmalar:</span>
                <span className="text-slate-200 font-bold">{historyCustomer.orders?.length || 0}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-sans">Sodiqlik ballari:</span>
                <span className="text-emerald-400 font-bold">{historyCustomer.customer?.loyalty_points || 0}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-sans">Jami sarflagan:</span>
                <span className="text-emerald-400 font-bold">{formatUZS(historyCustomer.customer?.total_spent || 0)}</span>
              </div>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto divide-y divide-slate-800/60">
              {historyCustomer.orders?.length === 0 ? (
                <p className="text-center py-6 text-slate-500 text-xs">Hali xaridlar mavjud emas</p>
              ) : (
                historyCustomer.orders?.map((o: any) => (
                  <div key={o.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold font-mono text-slate-200">{o.order_number}</p>
                      <p className="text-[11px] text-slate-500">{formatDate(o.created_at)}</p>
                    </div>
                    <div className="text-right font-mono">
                      <p className="font-bold text-emerald-400">{formatUZS(o.total)}</p>
                      <p className="text-[10px] text-slate-400 uppercase">{o.payment_method}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
