import React, { useState, useEffect } from 'react';
import { apiRequest, formatUZS } from '../services/api';
import {
  BarChart3,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  Package,
  Users,
  Wine,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState<string>('30days');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchReport();
  }, [timeFilter]);

  async function fetchReport() {
    setLoading(true);
    try {
      const res = await apiRequest('/api/reports', {
        params: { timeFilter }
      });
      if (res.success) setReportData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const exportCSV = () => {
    if (!reportData) return;
    const rows = [
      ['SMART DRINK POS - Moliya va Savdo Hisoboti'],
      ['Vaqt oralig\'i:', timeFilter],
      ['Sana:', new Date().toLocaleDateString('uz-UZ')],
      [],
      ['KORSATKICH', 'QIYMAT'],
      ['Jami Savdo', reportData.kpis.totalSales],
      ['Sof Foyda', reportData.kpis.netProfit],
      ['Jami Buyurtmalar', reportData.kpis.totalOrders],
      ['Sotilgan Ichimliklar Soni', reportData.kpis.totalSoldUnits],
      ['Naqd Savdo', reportData.kpis.cashSales],
      ['Karta Savdosi', reportData.kpis.cardSales],
      ['Jami Xarajatlar', reportData.kpis.totalExpenses],
      ['Jami Qaytarishlar', reportData.kpis.totalReturns],
      [],
      ['ENG KOP SOTILGAN MAHSULOTLAR'],
      ['Mahsulot', 'Sotilgan dona', 'Tushum', 'Foyda'],
      ...reportData.charts.topProducts.map((p: any) => [
        p.product_name,
        p.units_sold,
        p.total_revenue,
        p.total_profit
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `smart_drink_hisobot_${timeFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const kpis = reportData?.kpis || {
    totalSales: 0,
    totalProfit: 0,
    netProfit: 0,
    totalOrders: 0,
    totalSoldUnits: 0,
    cashSales: 0,
    cardSales: 0,
    totalExpenses: 0,
    totalReturns: 0
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Moliyaviy & Savdo Hisobotlari</h1>
          <p className="text-xs text-slate-400">Biznes samaradorligi, tushum, sof foyda va xaridlar tahlili</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time Filter Tabs */}
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold">
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
                  timeFilter === tf.id ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            <Download className="w-4 h-4" />
            CSV Yuklash
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12 text-slate-400 text-xs bg-slate-900 border border-slate-800 rounded-2xl">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-400 mr-2" />
          Hisobotlar hisoblanmoqda...
        </div>
      ) : (
        <>
          {/* Main KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400">Umumiy Tushum</span>
              <p className="text-2xl font-extrabold text-slate-100 font-mono tabular-nums mt-1">
                {formatUZS(kpis.totalSales)}
              </p>
              <div className="text-[11px] text-slate-400 mt-2 flex justify-between">
                <span>Naqd: {formatUZS(kpis.cashSales)}</span>
                <span>Karta: {formatUZS(kpis.cardSales)}</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400">Sof Foyda</span>
              <p className="text-2xl font-extrabold text-teal-400 font-mono tabular-nums mt-1">
                +{formatUZS(kpis.netProfit)}
              </p>
              <div className="text-[11px] text-slate-400 mt-2">
                Daromad rentabelligi: {kpis.totalSales > 0 ? Math.round((kpis.netProfit / kpis.totalSales) * 100) : 0}%
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400">Buyurtmalar va Hajm</span>
              <p className="text-2xl font-extrabold text-slate-100 font-mono tabular-nums mt-1">
                {kpis.totalOrders} <span className="text-xs font-normal text-slate-400">ta / {kpis.totalSoldUnits} dona</span>
              </p>
              <div className="text-[11px] text-slate-400 mt-2">
                O'rtacha chek: {formatUZS(kpis.totalOrders > 0 ? kpis.totalSales / kpis.totalOrders : 0)}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <span className="text-xs text-slate-400">Xarajatlar & Qaytarishlar</span>
              <p className="text-2xl font-extrabold text-rose-400 font-mono tabular-nums mt-1">
                -{formatUZS(kpis.totalExpenses + kpis.totalReturns)}
              </p>
              <div className="text-[11px] text-slate-400 mt-2 flex justify-between">
                <span>Xarajat: {formatUZS(kpis.totalExpenses)}</span>
                <span>Qaytarish: {formatUZS(kpis.totalReturns)}</span>
              </div>
            </div>
          </div>

          {/* Tables Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Mahsulotlar Bo'yicha Sotuv Hisoboti
              </h3>
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-3">Ichimlik</th>
                      <th className="p-3 text-center">Soni</th>
                      <th className="p-3 text-right">Tushum</th>
                      <th className="p-3 text-right">Foyda</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {reportData?.charts?.topProducts?.map((p: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="p-3 font-sans font-medium text-slate-200">{p.product_name}</td>
                        <td className="p-3 text-center text-slate-300 tabular-nums">{p.units_sold}</td>
                        <td className="p-3 text-right font-bold text-slate-100 tabular-nums">{formatUZS(p.total_revenue)}</td>
                        <td className="p-3 text-right text-emerald-400 tabular-nums font-bold">+{formatUZS(p.total_profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Category Performance */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Toifalar Samaradorligi
              </h3>
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-3">Toifa</th>
                      <th className="p-3 text-center">Sotilgan dona</th>
                      <th className="p-3 text-right">Tushum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {reportData?.charts?.categorySales?.map((c: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="p-3 font-sans font-medium text-slate-200">{c.category_name}</td>
                        <td className="p-3 text-center text-slate-300 tabular-nums">{c.units}</td>
                        <td className="p-3 text-right font-bold text-emerald-400 tabular-nums">{formatUZS(c.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
