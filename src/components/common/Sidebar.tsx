import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Store,
  Wine,
  FolderTree,
  Warehouse,
  ReceiptText,
  Users,
  RotateCcw,
  BadgeDollarSign,
  BarChart3,
  Clock3,
  Bell,
  ScrollText,
  Sliders,
  LogOut,
  ShoppingBag,
  Sparkles,
  UserCircle
} from 'lucide-react';

interface SidebarProps {
  currentTab?: string;
  activeTab?: string;
  onSelectTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, activeTab, onSelectTab, isOpen, onClose }) => {
  const selectedTab = activeTab || currentTab || 'dashboard';
  const { user, logout } = useAuth();
  const role = user?.role || 'CUSTOMER';

  let navItems: Array<{ id: string; label: string; icon: any; badge?: string }> = [];

  if (role === 'CEO') {
    navItems = [
      { id: 'dashboard', label: 'Boshqaruv paneli', icon: LayoutDashboard },
      { id: 'pos', label: 'Savdo (POS)', icon: Store },
      { id: 'products', label: 'Mahsulotlar', icon: Wine },
      { id: 'categories', label: 'Toifalar', icon: FolderTree },
      { id: 'inventory', label: 'Omborxona', icon: Warehouse },
      { id: 'orders', label: 'Buyurtmalar', icon: ReceiptText },
      { id: 'customers', label: 'Mijozlar', icon: Users },
      { id: 'returns', label: 'Qaytarishlar', icon: RotateCcw },
      { id: 'expenses', label: 'Xarajatlar', icon: BadgeDollarSign },
      { id: 'reports', label: 'Hisobotlar', icon: BarChart3 },
      { id: 'shifts', label: 'Smenalar', icon: Clock3 },
      { id: 'notifications', label: 'Bildirishnomalar', icon: Bell },
      { id: 'audit-logs', label: 'Audit jurnali', icon: ScrollText },
      { id: 'settings', label: 'Sozlamalar', icon: Sliders }
    ];
  } else if (role === 'CASHIER') {
    navItems = [
      { id: 'pos', label: 'Savdo (POS)', icon: Store },
      { id: 'products', label: 'Mahsulotlar', icon: Wine },
      { id: 'inventory', label: 'Omborxona', icon: Warehouse },
      { id: 'orders', label: 'Buyurtmalar', icon: ReceiptText },
      { id: 'customers', label: 'Mijozlar', icon: Users },
      { id: 'returns', label: 'Qaytarishlar', icon: RotateCcw },
      { id: 'expenses', label: 'Xarajatlar', icon: BadgeDollarSign },
      { id: 'shifts', label: 'Kassa Smenasi', icon: Clock3 },
      { id: 'notifications', label: 'Bildirishnomalar', icon: Bell }
    ];
  } else {
    // Customer
    navItems = [
      { id: 'shop', label: "Ichimliklar Do'koni", icon: ShoppingBag },
      { id: 'notifications', label: 'Bildirishnomalar', icon: Bell }
    ];
  }

  const handleItemClick = (id: string) => {
    onSelectTab(id);
    onClose();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-extrabold">
            <Sparkles className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-slate-100 tracking-tight">SMART DRINK</h1>
            <p className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
              {role === 'CEO' ? 'CEO Boshqaruv' : role === 'CASHIER' ? 'Kassir Tizimi' : 'Mijoz Portali'}
            </p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = selectedTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Card & Logout at bottom */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/30">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-800/40 border border-slate-800">
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name || 'User'}`}
              alt={user?.name}
              className="w-9 h-9 rounded-full object-cover border border-slate-700 bg-slate-800"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-200 truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              title="Chiqish"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
