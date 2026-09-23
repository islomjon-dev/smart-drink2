import React, { useState, useEffect } from 'react';
import { Shift } from '../types';
import { apiRequest, formatUZS, formatDate } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Clock3,
  CheckCircle,
  Play,
  Square,
  AlertTriangle,
  Banknote,
  CreditCard,
  Sparkles,
  History,
  TrendingDown,
  RefreshCw,
  X
} from 'lucide-react';

export const ShiftsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeShift, setActiveShift] = useState<any>(null);
  const [shiftsHistory, setShiftsHistory] = useState<Shift[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Start shift modal
  const [isStartModalOpen, setIsStartModalOpen] = useState<boolean>(false);
  const [openingCashInput, setOpeningCashInput] = useState<string>('500000');
  const [startNotes, setStartNotes] = useState<string>('');

  // Close shift modal
  const [isCloseModalOpen, setIsCloseModalOpen] = useState<boolean>(false);
  const [actualCashInput, setActualCashInput] = useState<string>('');
  const [closeNotes, setCloseNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadShiftsData();
  }, []);

  async function loadShiftsData() {
    setLoading(true);
    try {
      const [curRes, histRes] = await Promise.all([
        apiRequest<{ success: boolean; active: boolean; shift: any }>('/api/shifts/current'),
        apiRequest<{ success: boolean; shifts: Shift[] }>('/api/shifts')
      ]);

      if (curRes.success && curRes.active) {
        setActiveShift(curRes.shift);
        setActualCashInput(String(curRes.shift.expected_cash || 0));
      } else {
        setActiveShift(null);
      }

      if (histRes.success) {
        setShiftsHistory(histRes.shifts || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleStartShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      await apiRequest('/api/shifts/start', {
        method: 'POST',
        body: JSON.stringify({
          openingCash: Number(openingCashInput) || 0,
          notes: startNotes
        })
      });
      setIsStartModalOpen(false);
      loadShiftsData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Smenani ochishda xatolik');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actualCashInput) {
      setErrorMsg('Kassadagi amaldagi naqd pul summasini kiriting');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      await apiRequest('/api/shifts/close', {
        method: 'POST',
        body: JSON.stringify({
          actualCash: Number(actualCashInput),
          notes: closeNotes
        })
      });
      setIsCloseModalOpen(false);
      loadShiftsData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Smenani yopishda xatolik');
    } finally {
      setSubmitting(false);
    }
  };

  // Expected calculations
  const expectedCash = activeShift
    ? activeShift.opening_cash + activeShift.cash_sales - activeShift.refunds - activeShift.expenses
    : 0;

  const actualNum = Number(actualCashInput) || 0;
  const difference = actualNum - expectedCash;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">Kassa Smenalari Boshqaruvi</h1>
          <p className="text-xs text-slate-400">Kassirlar ish vaqti, naqd pul harakati va smenani yakunlash</p>
        </div>

        <div className="flex items-center gap-2">
          {activeShift ? (
            <button
              onClick={() => {
                setActualCashInput(String(expectedCash));
                setIsCloseModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs shadow-lg shadow-rose-500/20 transition-all"
            >
              <Square className="w-4 h-4 fill-current" />
              Smenani Yopish
            </button>
          ) : (
            <button
              onClick={() => setIsStartModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              Yangi Smena Ochish
            </button>
          )}

          <button
            onClick={loadShiftsData}
            className="p-2 text-slate-400 hover:text-slate-100 bg-slate-950 border border-slate-800 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Active Shift Live Card */}
      {activeShift ? (
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-emerald-500/30 p-6 rounded-2xl space-y-6 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <div>
                <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                  AMALDAGI OCHIQ SMENA
                </span>
                <h2 className="text-lg font-bold text-slate-100">Kassir: {activeShift.cashier_name}</h2>
              </div>
            </div>

            <div className="text-right text-xs text-slate-400">
              <span>Boshlangan vaqti: </span>
              <span className="font-mono text-slate-200 font-bold">{formatDate(activeShift.opened_at)}</span>
            </div>
          </div>

          {/* Real-time counters */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Boshlang'ich Naqd</span>
              <p className="text-base font-bold text-slate-200 font-mono tabular-nums mt-1">
                {formatUZS(activeShift.opening_cash)}
              </p>
            </div>

            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Naqd Savdo (+)</span>
              <p className="text-base font-bold text-emerald-400 font-mono tabular-nums mt-1">
                +{formatUZS(activeShift.cash_sales)}
              </p>
            </div>

            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Karta Savdosi</span>
              <p className="text-base font-bold text-blue-400 font-mono tabular-nums mt-1">
                {formatUZS(activeShift.card_sales)}
              </p>
            </div>

            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Qaytarish / Xarajat (-)</span>
              <p className="text-base font-bold text-rose-400 font-mono tabular-nums mt-1">
                -{formatUZS(activeShift.refunds + activeShift.expenses)}
              </p>
            </div>

            <div className="col-span-2 lg:col-span-1 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
              <span className="text-[10px] text-emerald-400 uppercase font-bold">Kutilayotgan Naqd Pul</span>
              <p className="text-lg font-extrabold text-emerald-400 font-mono tabular-nums mt-1">
                {formatUZS(expectedCash)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <Clock3 className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="font-bold text-slate-200 text-sm">Hozirda ochiq kassa smenasi yo'q</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Savdoni boshlash uchun avvalo yangi smena oching va boshlang'ich naqd pul qoldig'ini kiriting.
          </p>
          <button
            onClick={() => setIsStartModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all inline-flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            Smenani Boshlash
          </button>
        </div>
      )}

      {/* Shifts History Table */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Avvalgi Smenalar Tarixi</h3>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-4">Kassir</th>
                  <th className="p-4">Ochilgan vaqt</th>
                  <th className="p-4">Yopilgan vaqt</th>
                  <th className="p-4 text-right">Boshlang'ich</th>
                  <th className="p-4 text-right">Naqd savdo</th>
                  <th className="p-4 text-right">Karta savdo</th>
                  <th className="p-4 text-right">Kutilgan naqd</th>
                  <th className="p-4 text-right">Amaldagi naqd</th>
                  <th className="p-4 text-center">Farq (Разница)</th>
                  <th className="p-4 text-center">Holat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {shiftsHistory.map(s => {
                  const isClosed = s.status === 'closed';
                  const diff = s.actual_cash != null ? s.actual_cash - s.expected_cash : 0;

                  return (
                    <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 font-sans font-semibold text-slate-200">{s.cashier_name}</td>
                      <td className="p-4 text-slate-400">{formatDate(s.opened_at)}</td>
                      <td className="p-4 text-slate-400">{s.closed_at ? formatDate(s.closed_at) : '—'}</td>
                      <td className="p-4 text-right text-slate-300 tabular-nums">{formatUZS(s.opening_cash)}</td>
                      <td className="p-4 text-right text-emerald-400 font-bold tabular-nums">
                        {formatUZS(s.cash_sales)}
                      </td>
                      <td className="p-4 text-right text-blue-400 tabular-nums">{formatUZS(s.card_sales)}</td>
                      <td className="p-4 text-right text-slate-300 tabular-nums">{formatUZS(s.expected_cash)}</td>
                      <td className="p-4 text-right font-bold text-slate-100 tabular-nums">
                        {s.actual_cash != null ? formatUZS(s.actual_cash) : '—'}
                      </td>
                      <td className="p-4 text-center font-bold tabular-nums">
                        {isClosed ? (
                          <span
                            className={
                              diff === 0
                                ? 'text-slate-400'
                                : diff > 0
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }
                          >
                            {diff > 0 ? `+${formatUZS(diff)}` : formatUZS(diff)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-4 text-center font-sans">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            s.status === 'open'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {s.status === 'open' ? 'Ochiq' : 'Yopilgan'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* START SHIFT MODAL */}
      {isStartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-slate-100">Kassa Smenasini Boshlash</h3>
              <button onClick={() => setIsStartModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleStartShift} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Boshlang'ich naqd pul (UZS) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={openingCashInput}
                  onChange={e => setOpeningCashInput(e.target.value)}
                  placeholder="500000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Izoh (ixtiyoriy)</label>
                <input
                  type="text"
                  value={startNotes}
                  onChange={e => setStartNotes(e.target.value)}
                  placeholder="Kassa qoldig'i sanaldi..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsStartModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20"
                >
                  {submitting ? 'Ochilmoqda...' : 'Smenani Ochish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLOSE SHIFT MODAL */}
      {isCloseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-slate-100">Kassa Smenasini Yakunlash</h3>
              <button onClick={() => setIsCloseModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                {errorMsg}
              </div>
            )}

            {/* Reconciliation summary */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Boshlang'ich naqd:</span>
                <span>{formatUZS(activeShift?.opening_cash)}</span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Naqd savdo (+):</span>
                <span>+{formatUZS(activeShift?.cash_sales)}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>Qaytarish va xarajatlar (-):</span>
                <span>-{formatUZS((activeShift?.refunds || 0) + (activeShift?.expenses || 0))}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-sm text-slate-100">
                <span>Kutilayotgan naqd pul:</span>
                <span className="text-emerald-400">{formatUZS(expectedCash)}</span>
              </div>
            </div>

            <form onSubmit={handleCloseShift} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Kassadagi amaldagi sanalgan naqd pul (UZS) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={actualCashInput}
                  onChange={e => setActualCashInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Calculated difference */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Farq (Ortish / Kamomad):</span>
                <span
                  className={`font-mono font-bold text-sm ${
                    difference === 0
                      ? 'text-emerald-400'
                      : difference > 0
                      ? 'text-teal-400'
                      : 'text-rose-400'
                  }`}
                >
                  {difference > 0 ? `+${formatUZS(difference)} (Ortiqcha)` : difference < 0 ? `${formatUZS(difference)} (Kamomad)` : '0 UZS (To\'liq mos)'}
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Izoh</label>
                <input
                  type="text"
                  value={closeNotes}
                  onChange={e => setCloseNotes(e.target.value)}
                  placeholder="Kassa hisob-kitobi bo'yicha izoh..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCloseModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold text-xs shadow-lg shadow-rose-500/20"
                >
                  {submitting ? 'Yopilmoqda...' : 'Smenani Yakunlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
