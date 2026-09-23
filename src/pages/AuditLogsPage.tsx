import React, { useState, useEffect } from 'react';
import { AuditLog } from '../types';
import { apiRequest, formatDate } from '../services/api';
import { ShieldCheck, Search, Filter, RefreshCw, Activity } from 'lucide-react';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionFilter, setActionFilter] = useState<string>('all');

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; logs: AuditLog[] }>('/api/audit-logs', {
        params: { action: actionFilter }
      });
      if (res.success) setLogs(res.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Xavfsizlik & Audit Jurnali</h1>
          <p className="text-xs text-slate-400">
            Tizimda foydalanuvchilar tomonidan amalga oshirilgan barcha harakatlar qaydnomasi
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2 text-slate-400 hover:text-slate-100 bg-slate-950 border border-slate-800 rounded-xl transition-colors shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
        <Filter className="w-4 h-4 text-slate-400" />
        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
        >
          <option value="all">Barcha Harakatlar</option>
          <option value="ORDER_CREATED">Buyurtma rasmiylashtirish (ORDER_CREATED)</option>
          <option value="RETURN_CREATED">Tovarni qaytarish (RETURN_CREATED)</option>
          <option value="SHIFT_OPENED">Smena ochish (SHIFT_OPENED)</option>
          <option value="SHIFT_CLOSED">Smena yopish (SHIFT_CLOSED)</option>
          <option value="INVENTORY_ADJUSTED">Ombor qoldig'i (INVENTORY_ADJUSTED)</option>
          <option value="PRODUCT_CREATED">Mahsulot qo'shish (PRODUCT_CREATED)</option>
          <option value="SETTINGS_UPDATED">Sozlamalarni yangilash (SETTINGS_UPDATED)</option>
          <option value="LOGIN_SUCCESS">Tizimga kirish (LOGIN_SUCCESS)</option>
        </select>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="flex justify-center p-12 text-slate-400 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-400 mr-2" />
          Audit qaydnomalari yuklanmoqda...
        </div>
      ) : logs.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
          <Activity className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="font-semibold text-slate-300 text-sm">Audit qaydlari topilmadi</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">Vaqt</th>
                  <th className="p-4">Foydalanuvchi</th>
                  <th className="p-4">Harakat</th>
                  <th className="p-4">Ob'ekt (Entity)</th>
                  <th className="p-4">Tafsilotlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 text-slate-400 whitespace-nowrap">{formatDate(log.created_at)}</td>
                    <td className="p-4 font-sans font-medium text-slate-200">{log.user_name}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-400 font-bold text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-4 font-sans text-slate-300">
                      {log.entity_type} {log.entity_id ? `(#${log.entity_id.slice(-6)})` : ''}
                    </td>
                    <td className="p-4 font-sans text-slate-400 max-w-md truncate">
                      {log.details || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
