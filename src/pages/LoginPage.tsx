import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Wine,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  User,
  ShoppingBag,
  Sparkles,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface LoginPageProps {
  onSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { loginWithCredentials, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState<string>('ceo@smartdrink.uz');
  const [password, setPassword] = useState<string>('ceo123456');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await loginWithCredentials(email, password);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Kirishda xatolik yuz berdi. Email yoki parolni tekshiring.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (customEmail?: string, customName?: string, role?: 'CEO' | 'CASHIER' | 'CUSTOMER') => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle({
        email: customEmail || 'google.user@gmail.com',
        name: customName || 'Google Foydalanuvchi',
        role: role || 'CUSTOMER'
      });
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Google orqali kirishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glow Accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* App Logo */}
        <div className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-xl shadow-emerald-500/20 mb-3">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Wine className="w-7 h-7 text-emerald-400" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-100 tracking-tight">SMART DRINK POS</h2>
          <p className="text-xs text-slate-400 mt-1">
            Ichimliklar do'koni avtomatlashtirilgan savdo va boshqaruv tizimi
          </p>
        </div>

        {/* Login Card */}
        <div className="mt-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Google Login Button */}
          <div>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleGoogleLogin()}
              className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-xl font-bold text-xs flex items-center justify-center gap-3 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Google orqali kirish (Tezkor)
            </button>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                <span className="bg-slate-900 px-3 text-slate-500">yoki email orqali</span>
              </div>
            </div>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Elektron Pochta</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Maxfiy Parol</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Kirilmoqda...
                </>
              ) : (
                <>
                  <span>Tizimga Kirish</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Switcher Buttons */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block text-center">
              Tezkor sinov uchun rollar (1-klikda to'ldirish):
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDemoCredentials('ceo@smartdrink.uz', 'ceo123456')}
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] font-semibold text-purple-400 flex flex-col items-center gap-1 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>CEO / Admin</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('kassir@smartdrink.uz', 'cashier123456')}
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] font-semibold text-blue-400 flex flex-col items-center gap-1 transition-colors"
              >
                <ShoppingBag className="w-4 h-4 text-blue-400" />
                <span>Kassir</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials('mijoz@gmail.com', 'customer123456')}
                className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] font-semibold text-emerald-400 flex flex-col items-center gap-1 transition-colors"
              >
                <User className="w-4 h-4 text-emerald-400" />
                <span>Xaridor</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
