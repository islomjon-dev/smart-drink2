import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Role, NotificationItem } from '../../types';
import { apiRequest, formatDate } from '../../services/api';
import {
  Bell,
  LogOut,
  ShieldCheck,
  UserCheck,
  ShoppingBag,
  CheckCheck,
  ChevronDown,
  Menu,
  Clock
} from 'lucide-react';

interface HeaderProps {
  currentTab?: string;
  activeTab?: string;
  onToggleSidebar?: () => void;
  onNavigate?: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, activeTab, onToggleSidebar, onNavigate }) => {
  const activeCurrentTab = activeTab || currentTab || 'dashboard';
  const { user, switchDemoRole, logout } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState<boolean>(false);
  const [shiftStatus, setShiftStatus] = useState<{ active: boolean; cashier?: string }>({ active: false });

  useEffect(() => {
    fetchNotifications();
    fetchShiftStatus();
    const interval = setInterval(() => {
      fetchNotifications();
      fetchShiftStatus();
    }, 20000);
    return () => clearInterval(interval);
  }, [user]);

  async function fetchNotifications() {
    try {
      const res = await apiRequest<{ success: boolean; unreadCount: number; notifications: NotificationItem[] }>(
        '/api/notifications'
      );
      if (res.success) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (e) {
      // quiet fail
    }
  }

  async function fetchShiftStatus() {
    try {
      const res = await apiRequest<{ success: boolean; active: boolean; shift?: any }>('/api/shifts/current');
      if (res.success) {
        setShiftStatus({ active: res.active, cashier: res.shift?.cashier_name });
      }
    } catch (e) {
      // quiet fail
    }
  }

  const markAllRead = async () => {
    try {
      await apiRequest('/api/notifications/mark-all-read', { method: 'POST' });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleRoleChange = async (targetRole: Role) => {
    await switchDemoRole(targetRole);
    if (onNavigate) {
      if (targetRole === 'CEO') onNavigate('dashboard');
      else if (targetRole === 'CASHIER') onNavigate('pos');
      else onNavigate('customer_shop');
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100">
      {/* Zone 1: Brand & Sidebar toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl lg:hidden transition-colors"
          aria-label="Menyu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-baseline gap-2">
          <span className="font-extrabold text-base md:text-lg tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            SMART DRINK
          </span>
          <span className="hidden sm:inline-block text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
            POS
          </span>
        </div>

        <span className="hidden md:inline-block text-slate-600 text-xs">/</span>
        <span className="hidden md:inline-block text-xs font-medium text-slate-400 capitalize">
          {activeCurrentTab.replace('_', ' ')}
        </span>
      </div>

      {/* Zone 2: Fast Role Switcher & Active Shift Indicator */}
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center p-1 bg-slate-950/60 border border-slate-800 rounded-xl text-xs">
          <button
            onClick={() => handleRoleChange('CEO')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-lg transition-all ${
              user?.role === 'CEO'
                ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>CEO</span>
          </button>

          <button
            onClick={() => handleRoleChange('CASHIER')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-lg transition-all ${
              user?.role === 'CASHIER'
                ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Kassir</span>
          </button>

          <button
            onClick={() => handleRoleChange('CUSTOMER')}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-lg transition-all ${
              user?.role === 'CUSTOMER'
                ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Mijoz Do'koni</span>
          </button>
        </div>

        {/* Shift indicator */}
        {shiftStatus.active && (
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <Clock className="w-3.5 h-3.5 ml-1" />
            <span>Smena ochiq</span>
          </div>
        )}
      </div>

      {/* Zone 3: Notifications & User Profile */}
      <div className="flex items-center gap-3">
        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="relative p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
            aria-label="Bildirishnomalar"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 text-[10px] font-bold text-slate-950 bg-emerald-400 rounded-full flex items-center justify-center ring-2 ring-slate-900">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/50">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Bildirishnomalar ({unreadCount})
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Barchasini o'qish
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    Yangi bildirishnomalar mavjud emas
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      className={`p-3.5 hover:bg-slate-800/40 transition-colors ${
                        n.read ? 'opacity-60' : 'bg-emerald-500/[0.03]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-200">{n.title}</p>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 mt-1"></span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{n.message}</p>
                      <p className="text-[10px] text-slate-500 mt-1.5">{formatDate(n.created_at)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <img
            src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || 'User'}`}
            alt={user?.name || 'Foydalanuvchi'}
            className="w-8 h-8 rounded-full border border-slate-700 bg-slate-800 object-cover"
          />
          <div className="hidden md:block text-left text-xs leading-tight">
            <p className="font-semibold text-slate-200 truncate max-w-[120px]">{user?.name}</p>
            <p className="text-[10px] text-emerald-400 font-medium">{user?.role}</p>
          </div>

          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors ml-1"
            title="Tizimdan chiqish"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
