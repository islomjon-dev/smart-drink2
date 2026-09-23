import React, { useState, useEffect } from 'react';
import { Notification } from '../types';
import { apiRequest, formatDate } from '../services/api';
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Info,
  Clock,
  Sparkles,
  Package,
  RefreshCw
} from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    setLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; notifications: Notification[] }>(
        '/api/notifications'
      );
      if (res.success) setNotifications(res.notifications || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const markAllRead = async () => {
    try {
      await apiRequest('/api/notifications/read-all', { method: 'POST' });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const markOneRead = async (id: string) => {
    try {
      await apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'low_stock':
      case 'out_of_stock':
        return <Package className="w-5 h-5 text-amber-400" />;
      case 'shift_opened':
      case 'shift_closed':
        return <Clock className="w-5 h-5 text-blue-400" />;
      case 'large_sale':
        return <Sparkles className="w-5 h-5 text-emerald-400" />;
      case 'refund':
        return <AlertTriangle className="w-5 h-5 text-rose-400" />;
      default:
        return <Info className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Tizim Bildirishnomalari</h1>
          <p className="text-xs text-slate-400">
            Qoldiq ogohlantirishlari, kassa smenalari va muhim hodisalar
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors"
          >
            <CheckCheck className="w-4 h-4 text-emerald-400" />
            Barchasini o'qilgan qilish
          </button>
          <button
            onClick={fetchNotifications}
            className="p-2 text-slate-400 hover:text-slate-100 bg-slate-950 border border-slate-800 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12 text-slate-400 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-400 mr-2" />
          Bildirishnomalar yuklanmoqda...
        </div>
      ) : notifications.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl">
          <Bell className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="font-semibold text-slate-300 text-sm">Hozircha yangi bildirishnomalar yo'q</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(n => (
            <div
              key={n.id}
              onClick={() => !n.is_read && markOneRead(n.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                n.is_read
                  ? 'bg-slate-900/60 border-slate-800/80 opacity-70'
                  : 'bg-slate-900 border-slate-700/80 shadow-lg shadow-black/20'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                {getIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-xs font-bold text-slate-100 truncate">{n.title}</h3>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0">
                    {formatDate(n.created_at)}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">{n.message}</p>
              </div>

              {!n.is_read && (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 mt-1"></span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
