import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Printer, Download, X, CheckCircle, Sparkles } from 'lucide-react';
import { formatUZS } from '../../services/api';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiptData: {
    storeName?: string;
    storeAddress?: string;
    storePhone?: string;
    orderId?: string;
    orderNumber: string;
    date: string;
    time: string;
    cashier?: string;
    customer?: string;
    items: Array<{
      productName?: string;
      name?: string;
      quantity: number;
      unitPrice?: number;
      unit_price?: number;
      totalPrice?: number;
      total_price?: number;
    }>;
    subtotal: number;
    discount?: number;
    tax?: number;
    total: number;
    paymentMethod: string;
    footer?: string;
    verificationUrl?: string;
  } | null;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ isOpen, onClose, receiptData }) => {
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (isOpen && receiptData && qrCanvasRef.current) {
      const qrPayload = JSON.stringify({
        store: 'SMART DRINK POS',
        order: receiptData.orderNumber,
        total: receiptData.total,
        date: receiptData.date,
        verify: receiptData.verificationUrl || `https://smartdrink.uz/verify/${receiptData.orderNumber}`
      });

      QRCode.toCanvas(qrCanvasRef.current, qrPayload, {
        width: 140,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      }).catch(err => console.error('QR code generation failed:', err));
    }
  }, [isOpen, receiptData]);

  if (!isOpen || !receiptData) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const textContent = `
========================================
           SMART DRINK POS
    Ichimliklar va Tetiklik Maskani
----------------------------------------
Manzil: ${receiptData.storeAddress || "Toshkent sh., Amir Temur shox ko'chasi, 45-uy"}
Tel: ${receiptData.storePhone || '+998 71 200 44 88'}
Chek raqami: ${receiptData.orderNumber}
Sana/Vaqt: ${receiptData.date} ${receiptData.time}
Kassir: ${receiptData.cashier || 'Asosiy Kassa'}
Mijoz: ${receiptData.customer || 'Umumiy Xaridor'}
----------------------------------------
MAHSULOTLAR:
${receiptData.items
  .map(
    it =>
      `${it.productName || it.name} x ${it.quantity} = ${formatUZS(it.totalPrice || it.total_price || (it.unitPrice || it.unit_price || 0) * it.quantity)}`
  )
  .join('\n')}
----------------------------------------
Oraliq summa: ${formatUZS(receiptData.subtotal)}
Chegirma: ${formatUZS(receiptData.discount || 0)}
To'lov usuli: ${receiptData.paymentMethod.toUpperCase()}
JAMI TO'LOV: ${formatUZS(receiptData.total)}
========================================
Thank you for choosing SMART DRINK!
Xaridingiz uchun tashakkur!
========================================
    `;

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `chek-${receiptData.orderNumber}.txt`;
    link.click();
  };

  const paymentLabel =
    receiptData.paymentMethod === 'cash'
      ? 'Naqd pul'
      : receiptData.paymentMethod === 'card'
      ? 'Plastik karta'
      : "Boshqa to'lov";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Top Header / Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 print:hidden">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-sm font-semibold text-slate-100">Xarid cheki tayyor</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Thermal Receipt Container */}
        <div className="p-6 bg-white text-slate-900 font-mono text-xs select-text">
          <div className="text-center space-y-1 pb-4 border-b border-dashed border-slate-300">
            <div className="flex items-center justify-center gap-1.5 font-sans font-extrabold text-lg text-slate-950 tracking-tight">
              <Sparkles className="w-5 h-5 text-emerald-600 inline" />
              SMART DRINK
            </div>
            <p className="text-[11px] text-slate-600 font-sans">Ichimliklar va Tetiklik Markazi</p>
            <p className="text-[10px] text-slate-500">{receiptData.storeAddress || 'Toshkent sh., Amir Temur 45'}</p>
            <p className="text-[10px] text-slate-500">Tel: {receiptData.storePhone || '+998 71 200 44 88'}</p>
          </div>

          <div className="py-3 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Chek raqami:</span>
              <span className="font-bold text-slate-950">{receiptData.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Sana & Vaqt:</span>
              <span>{receiptData.date} {receiptData.time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Kassir:</span>
              <span>{receiptData.cashier || 'Asosiy Kassa'}</span>
            </div>
            {receiptData.customer && (
              <div className="flex justify-between">
                <span className="text-slate-500">Mijoz:</span>
                <span className="font-semibold text-slate-900">{receiptData.customer}</span>
              </div>
            )}
          </div>

          {/* Product Items Table */}
          <div className="py-3 border-b border-dashed border-slate-300">
            <div className="grid grid-cols-12 font-bold text-slate-700 pb-1 mb-2 border-b border-slate-200">
              <div className="col-span-6">Mahsulot</div>
              <div className="col-span-2 text-center">Soni</div>
              <div className="col-span-4 text-right">Summa</div>
            </div>
            <div className="space-y-2">
              {receiptData.items.map((it, idx) => {
                const name = it.productName || it.name || 'Ichimlik';
                const qty = it.quantity;
                const unitPr = it.unitPrice || it.unit_price || 0;
                const lineTotal = it.totalPrice || it.total_price || qty * unitPr;
                return (
                  <div key={idx} className="grid grid-cols-12 text-[11px] items-center">
                    <div className="col-span-6 truncate pr-1">
                      <p className="font-semibold text-slate-900 truncate">{name}</p>
                      <p className="text-[10px] text-slate-500">{formatUZS(unitPr)}</p>
                    </div>
                    <div className="col-span-2 text-center tabular-nums font-medium">{qty}</div>
                    <div className="col-span-4 text-right font-bold tabular-nums text-slate-950">{formatUZS(lineTotal)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Totals */}
          <div className="py-3 border-b border-dashed border-slate-300 space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-600">Oraliq jami:</span>
              <span className="tabular-nums">{formatUZS(receiptData.subtotal)}</span>
            </div>
            {receiptData.discount ? (
              <div className="flex justify-between text-emerald-700">
                <span>Chegirma:</span>
                <span className="tabular-nums font-semibold">-{formatUZS(receiptData.discount)}</span>
              </div>
            ) : null}
            <div className="flex justify-between">
              <span className="text-slate-600">To'lov turi:</span>
              <span className="font-semibold uppercase">{paymentLabel}</span>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 text-sm">
              <span className="font-bold text-slate-900">JAMI SUMMA:</span>
              <span className="font-extrabold text-base text-slate-950 tabular-nums">
                {formatUZS(receiptData.total)}
              </span>
            </div>
          </div>

          {/* QR Code and Footer */}
          <div className="pt-4 flex flex-col items-center justify-center text-center space-y-2">
            <canvas ref={qrCanvasRef} className="rounded border border-slate-200 bg-white" />
            <p className="text-[10px] text-slate-500">QR kod orqali chekni tekshirish mumkin</p>
            <p className="font-sans font-semibold text-xs text-slate-900 pt-1">
              Thank you for choosing SMART DRINK!
            </p>
            <p className="text-[10px] text-slate-500">
              {receiptData.footer || "Xaridingiz uchun tashakkur! Har doim yangi va tetiklantiruvchi!"}
            </p>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
          >
            Yopish
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors"
            >
              <Download className="w-4 h-4" />
              Yuklab olish
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl shadow-lg shadow-emerald-500/20 transition-all"
            >
              <Printer className="w-4 h-4" />
              Chekni chiqarish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
