import React, { useState, useEffect } from 'react';
import { Expense } from '../types';
import { apiRequest, formatUZS, formatDate } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  BadgeDollarSign,
  Plus,
  Trash2,
  Filter,
  DollarSign,
  X,
  RefreshCw,
  Lightbulb,
  Building,
  Users,
  Truck,
  Wrench,
  Sparkles
} from 'lucide-react';

export const ExpensesPage: React.FC = () => {
  const { user } = useAuth();
  const isCeo = user?.role === 'CEO';

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);

  // Add Expense Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [form, setForm] = useState({
    title: '',
    category: 'electricity',
    amount: '',
    description: ''
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    fetchExpenses();
  }, [categoryFilter]);

  async function fetchExpenses() {
    setLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; totalAmount: number; expenses: Expense[] }>(
        '/api/expenses',
        {
          params: { category: categoryFilter }
        }
      );
      if (res.success) {
        setExpenses(res.expenses || []);
        setTotalAmount(res.totalAmount || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setErrorMsg('Xarajat nomini kiriting');
      return;
    }
    const amt = Number(form.amount);
    if (!amt || amt <= 0) {
      setErrorMsg('Summani to\'g\'ri kiriting');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      await apiRequest('/api/expenses', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      setIsModalOpen(false);
      setForm({ title: '', category: 'electricity', amount: '', description: '' });
      fetchExpenses();
    } catch (err: any) {
      setErrorMsg(err.message || 'Xarajatni saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" xarajatini o'chirishni xohlaysizmi?`)) return;
    try {
      await apiRequest(`/api/expenses/${id}`, { method: 'DELETE' });
      fetchExpenses();
    } catch (err: any) {
      alert(err.message || 'O\'chirishda xatolik');
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'electricity':
        return <Lightbulb className="w-4 h-4 text-amber-400" />;
      case 'rent':
        return <Building className="w-4 h-4 text-blue-400" />;
      case 'salary':
        return <Users className="w-4 h-4 text-emerald-400" />;
      case 'transport':
        return <Truck className="w-4 h-4 text-teal-400" />;
      case 'maintenance':
        return <Wrench className="w-4 h-4 text-orange-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Do'kon Xarajatlari</h1>
          <p className="text-xs text-slate-400">Kommunal, ijara, maosh va boshqa operatsion xarajatlar</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          Yangi Xarajat
        </button>
      </div>

      {/* Filter and Summary Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Barcha Toifalar</option>
            <option value="electricity">Elektr & Kommunal</option>
            <option value="rent">Ijara haqi</option>
            <option value="salary">Ish haqi (Maosh)</option>
            <option value="transport">Yetkazib berish & Transport</option>
            <option value="maintenance">Ta'mirlash & Xizmat</option>
            <option value="other">Boshqa xarajatlar</option>
          </select>
        </div>

        <div className="text-right w-full sm:w-auto">
          <span className="text-xs text-slate-400 mr-2">Ko'rsatilgan xarajatlar jami:</span>
          <span className="text-base font-extrabold text-rose-400 font-mono tabular-nums">
            -{formatUZS(totalAmount)}
          </span>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center p-12 text-slate-400 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-400 mr-2" />
          Yuklanmoqda...
        </div>
      ) : expenses.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
          <BadgeDollarSign className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="font-semibold text-slate-300 text-sm">Xarajatlar mavjud emas</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">Nomi / Tavsifi</th>
                  <th className="p-4">Toifa</th>
                  <th className="p-4">Kiritgan xodim</th>
                  <th className="p-4">Sana</th>
                  <th className="p-4 text-right">Summa</th>
                  {isCeo && <th className="p-4 text-right">Amal</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {expenses.map(e => (
                  <tr key={e.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 font-sans font-semibold text-slate-200">
                      <p>{e.title}</p>
                      {e.description && <p className="text-[11px] text-slate-500">{e.description}</p>}
                    </td>
                    <td className="p-4 font-sans">
                      <span className="flex items-center gap-1.5 text-slate-300 capitalize">
                        {getCategoryIcon(e.category)}
                        <span>{e.category}</span>
                      </span>
                    </td>
                    <td className="p-4 font-sans text-slate-400">{e.created_by}</td>
                    <td className="p-4 text-slate-400">{formatDate(e.created_at)}</td>
                    <td className="p-4 text-right font-extrabold text-rose-400 tabular-nums">
                      -{formatUZS(e.amount)}
                    </td>
                    {isCeo && (
                      <td className="p-4 text-right font-sans">
                        <button
                          onClick={() => handleDelete(e.id, e.title)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD EXPENSE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-slate-100">Yangi Xarajat Kiritish</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAddExpense} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Xarajat nomi *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Masalan: Elektr energiyasi uchun to'lov"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Xarajat toifasi *</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="electricity">Elektr & Kommunal</option>
                  <option value="rent">Ijara haqi</option>
                  <option value="salary">Ish haqi (Maosh)</option>
                  <option value="transport">Yetkazib berish & Transport</option>
                  <option value="maintenance">Ta'mirlash & Xizmat</option>
                  <option value="other">Boshqa xarajatlar</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Summa (UZS) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={form.amount}
                  onChange={e => setForm({ ...form, amount: e.target.value })}
                  placeholder="150000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Qo'shimcha izoh</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Hisob-faktura yoki kvitansiya ma'lumotlari..."
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
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20"
                >
                  {saving ? 'Saqlanmoqda...' : 'Xarajatni Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
