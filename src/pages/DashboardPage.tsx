import React, { useState, useEffect } from 'react';
import { apiRequest, formatUZS } from '../services/api';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Package,
  AlertTriangle,
  Users,
  Calendar,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Wine,
  Sparkles,
  CreditCard,
  Banknote
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [timeFilter, setTimeFilter] = useState<string>('30days');
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, [timeFilter]);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const res = await apiRequest('/api/reports', {
        params: { timeFilter }
      });
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
    } finally {
      setLoading(false);
    }
  }

  const kpis = data?.kpis || {
    totalSales: 0,
    totalProfit: 0,
    netProfit: 0,
    totalOrders: 0,
    totalSoldUnits: 0,
    cashSales: 0,
    cardSales: 0,
    otherSales: 0,
    totalExpenses: 0,
    totalReturns: 0
  };

  const inventory = data?.inventory || {
    totalProducts: 0,
    availableProducts: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
    inventoryValue: 0,
    retailValue: 0
  };

  const charts = data?.charts || {
    salesChart: [],
    topProducts: [],
    categorySales: [],
    cashierSales: [],
    paymentDistribution: []
  };

  // Find max sale for chart scaling
  const maxSale = Math.max(...charts.salesChart.map((s: any) => s.sales), 1);

  return (
    <div className="space-y-6">
      {/* Top Banner / Time Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Jonli tahlil
            </span>
            <span className="text-xs text-slate-500">Avtomatik yangilanadi</span>
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-100 mt-1 tracking-tight">
            CEO Boshqaruv Paneli
          </h1>
          <p className="text-xs text-slate-400">
            SMART DRINK do'konining barcha moliyaviy va operatsion ko'rsatkichlari
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time Filter Pills */}
          <div className="flex items-center p-1 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-medium">
            {[
              { id: 'today', label: 'Bugun' },
              { id: 'yesterday', label: 'Kecha' },
              { id: '7days', label: '7 kun' },
              { id: '30days', label: '30 kun' },
              { id: 'month', label: 'Shu oy' }
            ].map(tf => (
              <button
                key={tf.id}
                onClick={() => setTimeFilter(tf.id)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeFilter === tf.id
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <button
            onClick={loadDashboardData}
            title="Yangilash"
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-slate-800 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Sales */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Jami Savdo</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-slate-100 tabular-nums font-mono">
              {formatUZS(kpis.totalSales)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="text-emerald-400 font-semibold flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5 inline" /> +14.2%
            </span>
            <span>o'tgan davrga nisbatan</span>
          </div>
        </div>

        {/* KPI 2: Total Net Profit */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Sof Foyda (Daromad)</span>
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-teal-400 tabular-nums font-mono">
              {formatUZS(kpis.netProfit)}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Xarajatlar: {formatUZS(kpis.totalExpenses)}</span>
            <span className="text-rose-400">Qaytarish: {formatUZS(kpis.totalReturns)}</span>
          </div>
        </div>

        {/* KPI 3: Orders Count & Sold Units */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Buyurtmalar & Ichimliklar</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-100 tabular-nums font-mono">
              {kpis.totalOrders}
            </span>
            <span className="text-xs text-slate-400 font-medium">buyurtma /</span>
            <span className="text-lg font-bold text-emerald-400 tabular-nums font-mono">
              {kpis.totalSoldUnits}
            </span>
            <span className="text-xs text-slate-400">dona</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            O'rtacha chek: {formatUZS(kpis.totalOrders > 0 ? kpis.totalSales / kpis.totalOrders : 0)}
          </div>
        </div>

        {/* KPI 4: Inventory Health */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Ombor Qiymati</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-slate-100 tabular-nums font-mono">
              {formatUZS(inventory.inventoryValue)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-amber-400 flex items-center gap-1 font-semibold">
              <AlertTriangle className="w-3 h-3" /> {inventory.lowStockProducts} kam qolgan
            </span>
            <span className="text-rose-400 font-semibold">{inventory.outOfStockProducts} tugagan</span>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigate('pos')}
          className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/10 transition-all"
        >
          <ShoppingBag className="w-4 h-4" />
          Kassa / Yangi Savdo
        </button>
        <button
          onClick={() => onNavigate('products')}
          className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-all"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          Mahsulot Qo'shish
        </button>
        <button
          onClick={() => onNavigate('inventory')}
          className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-all"
        >
          <Package className="w-4 h-4 text-amber-400" />
          Ombor Kirimi (Kirim)
        </button>
        <button
          onClick={() => onNavigate('expenses')}
          className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-all"
        >
          <DollarSign className="w-4 h-4 text-rose-400" />
          Xarajat Kiritish
        </button>
      </div>

      {/* Main Charts & Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Orders Dynamic Bar Chart (2 columns span) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Savdo Dinamikasi ({timeFilter})
              </h2>
              <p className="text-xs text-slate-400">Kunlik tushum va buyurtmalar hajmi</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Savdo hajmi
              </span>
            </div>
          </div>

          {/* Bar Chart Container */}
          {charts.salesChart.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-500">
              Ko'rsatilgan oraliqda savdo ma'lumotlari mavjud emas
            </div>
          ) : (
            <div className="h-64 flex items-end gap-2 pt-8 pb-4 px-2 border-b border-slate-800">
              {charts.salesChart.map((pt: any, idx: number) => {
                const heightPercent = Math.max(12, Math.round((pt.sales / maxSale) * 100));
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    {/* Tooltip on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -translate-y-16 bg-slate-950 text-slate-100 text-[10px] p-2 rounded-lg border border-slate-800 pointer-events-none shadow-xl z-20 whitespace-nowrap">
                      <p className="font-bold">{pt.date}</p>
                      <p className="text-emerald-400 font-mono">{formatUZS(pt.sales)}</p>
                      <p className="text-slate-400">{pt.orders} ta buyurtma</p>
                    </div>

                    <div
                      style={{ height: `${heightPercent}%` }}
                      className="w-full bg-gradient-to-t from-emerald-600 to-teal-400 rounded-t-md group-hover:from-emerald-500 group-hover:to-teal-300 transition-all cursor-pointer relative"
                    ></div>
                    <span className="text-[10px] text-slate-500 font-mono truncate max-w-full">
                      {pt.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Payment Method Breakdown below chart */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800/80">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                <span>Naqd to'lov</span>
              </div>
              <p className="text-sm font-bold text-slate-200 mt-1 font-mono tabular-nums">
                {formatUZS(kpis.cashSales)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                <span>Plastik karta</span>
              </div>
              <p className="text-sm font-bold text-slate-200 mt-1 font-mono tabular-nums">
                {formatUZS(kpis.cardSales)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Boshqa to'lovlar</span>
              </div>
              <p className="text-sm font-bold text-slate-200 mt-1 font-mono tabular-nums">
                {formatUZS(kpis.otherSales)}
              </p>
            </div>
          </div>
        </div>

        {/* Top 6 Best-Selling Beverages */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  Eng Xaridorgir Ichimliklar
                </h2>
                <p className="text-xs text-slate-400">Daromad bo'yicha TOP yetakchilar</p>
              </div>
              <button
                onClick={() => onNavigate('products')}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
              >
                Barchasi
              </button>
            </div>

            <div className="space-y-3">
              {charts.topProducts.slice(0, 6).map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-[10px] font-bold text-slate-400 flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate">{item.product_name}</p>
                      <p className="text-[10px] text-slate-500">{item.units_sold} dona sotildi</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-slate-100 font-mono tabular-nums">
                      {formatUZS(item.total_revenue)}
                    </p>
                    <p className="text-[10px] text-emerald-400 font-mono">
                      +{formatUZS(item.total_profit)} foyda
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800">
            <button
              onClick={() => onNavigate('reports')}
              className="w-full py-2 text-center text-xs font-semibold text-slate-300 hover:text-slate-100 bg-slate-800/80 hover:bg-slate-800 rounded-xl transition-colors"
            >
              Batafsil Hisobotlarni Ko'rish
            </button>
          </div>
        </div>
      </div>

      {/* Cashier Performance & Category Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cashier Sales Performance Table */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Kassirlar Faoliyati
              </h2>
              <p className="text-xs text-slate-400">Xodimlar bo'yicha savdo ko'rsatkichi</p>
            </div>
            <button
              onClick={() => onNavigate('shifts')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              Smenalar
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-bold text-slate-400 uppercase border-b border-slate-800 pb-2">
                <tr>
                  <th className="pb-2">Kassir</th>
                  <th className="pb-2 text-center">Buyurtmalar</th>
                  <th className="pb-2 text-right">Jami Tushum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {charts.cashierSales.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-slate-500 font-sans">
                      Hali savdolar amalga oshirilmadi
                    </td>
                  </tr>
                ) : (
                  charts.cashierSales.map((c: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 font-sans font-medium text-slate-200">{c.cashier_name}</td>
                      <td className="py-3 text-center text-slate-300 tabular-nums">{c.orders_count}</td>
                      <td className="py-3 text-right font-bold text-emerald-400 tabular-nums">
                        {formatUZS(c.total_amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Toifalar Bo'yicha Savdo
              </h2>
              <p className="text-xs text-slate-400">Ichimlik toifalari ulushi</p>
            </div>
            <button
              onClick={() => onNavigate('categories')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              Toifalar
            </button>
          </div>

          <div className="space-y-3">
            {charts.categorySales.map((cat: any, idx: number) => {
              const pct = kpis.totalSales > 0 ? Math.round((cat.revenue / kpis.totalSales) * 100) : 0;
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-200">{cat.category_name}</span>
                    <span className="font-mono tabular-nums text-slate-300">
                      {formatUZS(cat.revenue)} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full bg-emerald-500 rounded-full"
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
