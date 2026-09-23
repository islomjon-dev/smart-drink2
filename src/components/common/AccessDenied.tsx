import React from 'react';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AccessDeniedProps {
  onGoHome: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ onGoHome }) => {
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
        <ShieldAlert className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-extrabold text-slate-100 tracking-tight">Ruxsat Cheklangan</h2>
      <p className="text-sm text-slate-400 max-w-md mt-2">
        Sizning akkauntingiz ({user?.role}) ushbu bo'limni ko'rish yoki boshqarish huquqiga ega emas. Ushbu sahifa faqat CEO/Admin uchun himoyalangan.
      </p>

      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={onGoHome}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
        >
          <Home className="w-4 h-4" />
          Mening bosh sahifamga o'tish
        </button>
      </div>
    </div>
  );
};
