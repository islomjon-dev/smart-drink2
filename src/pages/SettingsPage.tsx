import React, { useState, useEffect } from 'react';
import { apiRequest, formatUZS } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Settings,
  Store,
  Users,
  Database,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  KeyRound,
  Download,
  Upload,
  RefreshCw,
  Printer
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'store' | 'users' | 'backup'>('store');
  const [settings, setSettings] = useState<any>({});
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New Cashier Modal
  const [isAddUserOpen, setIsAddUserOpen] = useState<boolean>(false);
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: 'CASHIER',
    password: ''
  });

  useEffect(() => {
    loadSettings();
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab]);

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; settings: any }>('/api/settings');
      if (res.success) {
        setSettings(res.settings || {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    try {
      const res = await apiRequest<{ success: boolean; users: any[] }>('/api/users');
      if (res.success) {
        setUsersList(res.users || []);
      }
    } catch (err) {
      console.error(err);
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await apiRequest('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings })
      });
      setSuccessMsg('Sozlamalar muvaffaqiyatli saqlandi!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/users', {
        method: 'POST',
        body: JSON.stringify(userForm)
      });
      setIsAddUserOpen(false);
      setUserForm({ name: '', email: '', role: 'CASHIER', password: '' });
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Foydalanuvchi yaratishda xatolik');
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`"${name}" xodimini o'chirishni xohlaysizmi?`)) return;
    try {
      await apiRequest(`/api/users/${id}`, { method: 'DELETE' });
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'O\'chirishda xatolik');
    }
  };

  const downloadBackup = async () => {
    try {
      const res = await apiRequest<{ success: boolean; backup: any }>('/api/settings/backup');
      if (res.success) {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.backup, null, 2));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute('href', dataStr);
        dlAnchor.setAttribute('download', `smart_drink_backup_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
      }
    } catch (err: any) {
      alert(err.message || 'Zaxira nusxani yuklashda xatolik');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Tizim Sozlamalari</h1>
          <p className="text-xs text-slate-400">Do'kon rekvizitlari, chek parametrlari, xodimlar va ma'lumotlar bazasi</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('store')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'store' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            Do'kon & Chek
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'users' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Xodimlar (Kassirlar)
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'backup' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Zaxira Nusxasi (Backup)
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

      {/* STORE & RECEIPT SETTINGS TAB */}
      {activeTab === 'store' && (
        <form onSubmit={handleSaveSettings} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Do'kon Rekvizitlari</h2>
            <p className="text-xs text-slate-400">Ushbu ma'lumotlar chop etiladigan cheklarda ko'rsatiladi</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Do'kon Nomi *</label>
              <input
                type="text"
                value={settings.store_name || ''}
                onChange={e => setSettings({ ...settings, store_name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Shior / Slogan</label>
              <input
                type="text"
                value={settings.store_slogan || ''}
                onChange={e => setSettings({ ...settings, store_slogan: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Telefon Raqami</label>
              <input
                type="text"
                value={settings.store_phone || ''}
                onChange={e => setSettings({ ...settings, store_phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Email</label>
              <input
                type="email"
                value={settings.store_email || ''}
                onChange={e => setSettings({ ...settings, store_email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-300 block mb-1">Do'kon Manzili</label>
              <input
                type="text"
                value={settings.store_address || ''}
                onChange={e => setSettings({ ...settings, store_address: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="border-t border-b border-slate-800 py-4">
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Chek va Printer Parametrlari</h2>
            <p className="text-xs text-slate-400">Termal printer o'lchami va chek matni</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Printer Qog'oz Eni</label>
              <select
                value={settings.printer_paper_width || '80mm'}
                onChange={e => setSettings({ ...settings, printer_paper_width: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="80mm">80 mm (Standart POS printer)</option>
                <option value="58mm">58 mm (Ixcham mobil printer)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Valyuta Belgisi</label>
              <input
                type="text"
                value={settings.currency || 'UZS'}
                onChange={e => setSettings({ ...settings, currency: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-300 block mb-1">Chek Tagidagi Minnatdorchilik Matni</label>
              <textarea
                rows={2}
                value={settings.receipt_footer || ''}
                onChange={e => setSettings({ ...settings, receipt_footer: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saqlanmoqda...' : 'O\'zgarishlarni Saqlash'}
            </button>
          </div>
        </form>
      )}

      {/* USERS / CASHIERS TAB */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-200">Tizim Xodimlari Ro'yxati</h2>
            <button
              onClick={() => setIsAddUserOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Yangi Kassir Qo'shish
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-4">Xodim</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Roli</th>
                    <th className="p-4">Ro'yxatdan o'tgan</th>
                    <th className="p-4 text-right">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {usersList.map(u => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-sans font-semibold text-slate-200 flex items-center gap-2">
                        <img src={u.avatar} alt="" className="w-8 h-8 rounded-full border border-slate-800 object-cover" />
                        <span>{u.name}</span>
                      </td>
                      <td className="p-4 text-slate-400">{u.email}</td>
                      <td className="p-4 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            u.role === 'CEO'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : u.role === 'CASHIER'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                      <td className="p-4 text-right font-sans">
                        {u.role !== 'CEO' && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* BACKUP TAB */}
      {activeTab === 'backup' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Ma'lumotlar Bazasi Zaxirasi (Backup)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Barcha tovarlar, sotuvlar, kassa smenalari va mijozlar ma'lumotlarini xavfsiz JSON fayl ko'rinishida yuklab oling.
            </p>
          </div>

          <div className="p-5 bg-slate-950 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-slate-200 block">Do'kon to'liq zaxira nusxasi</span>
              <span className="text-[11px] text-slate-400">Oxirgi sinxronizatsiya: Jonli SQLite</span>
            </div>
            <button
              onClick={downloadBackup}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all shrink-0"
            >
              <Download className="w-4 h-4" />
              Zaxira Faylini Yuklab Olish (JSON)
            </button>
          </div>
        </div>
      )}

      {/* ADD CASHIER MODAL */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-slate-100">Yangi Xodim Qo'shish</h3>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Xodim ismi *</label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="Kassir ismi..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="kassir@smartdrink.uz"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Parol *</label>
                <input
                  type="password"
                  required
                  value={userForm.password}
                  onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="Kamida 6 belgi"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Roli</label>
                <select
                  value={userForm.role}
                  onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="CASHIER">Kassir (Faqat savdo va smenalar)</option>
                  <option value="CUSTOMER">Mijoz (Faqat katalog va buyurtma)</option>
                  <option value="CEO">Admin / CEO (To'liq nazorat)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
                >
                  Qo'shish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
