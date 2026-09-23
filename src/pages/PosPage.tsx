import React, { useState, useEffect, useRef } from 'react';
import { Product, Category, Customer, CartItem } from '../types';
import { apiRequest, formatUZS } from '../services/api';
import { ReceiptModal } from '../components/common/ReceiptModal';
import {
  Search,
  Barcode,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Sparkles,
  AlertCircle,
  User,
  CheckCircle,
  X,
  RefreshCw,
  Wine
} from 'lucide-react';

export const PosPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [loading, setLoading] = useState<boolean>(true);

  // Payment Modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'other'>('cash');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Receipt Modal state
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [completedReceiptData, setCompletedReceiptData] = useState<any>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    setLoading(true);
    try {
      const [prodRes, catRes, custRes] = await Promise.all([
        apiRequest<{ success: boolean; products: Product[] }>('/api/products?status=active'),
        apiRequest<{ success: boolean; categories: Category[] }>('/api/categories'),
        apiRequest<{ success: boolean; customers: Customer[] }>('/api/customers')
      ]);

      if (prodRes.success) setProducts(prodRes.products || []);
      if (catRes.success) setCategories(catRes.categories || []);
      if (custRes.success) setCustomers(custRes.customers || []);
    } catch (err) {
      console.error('POS data load error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Filter products by search and category
  const filteredProducts = products.filter(p => {
    const matchesCat = selectedCategory === 'all' || p.category_id === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.barcode.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  // Add to cart
  const addToCart = (product: Product) => {
    if (product.quantity <= 0) {
      alert(`${product.name} omborda qolmagan!`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) {
          alert(`Omborda faqat ${product.quantity} dona mavjud!`);
          return prev;
        }
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  // Modify quantity
  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.product.quantity) {
              alert(`Maksimal qoldiq: ${item.product.quantity} dona`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    if (confirm('Savatni tozalashni xohlaysizmi?')) {
      setCart([]);
      setDiscount(0);
    }
  };

  // Barcode enter event
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const found = products.find(
      p => p.barcode === barcodeInput.trim() || p.sku.toLowerCase() === barcodeInput.trim().toLowerCase()
    );

    if (found) {
      addToCart(found);
      setBarcodeInput('');
    } else {
      alert(`Shtrix-kod bo'yicha mahsulot topilmadi: ${barcodeInput}`);
      setBarcodeInput('');
    }
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.product.selling_price, 0);
  const discountAmount =
    discountType === 'percent'
      ? Math.round((subtotal * Math.min(100, Math.max(0, discount))) / 100)
      : Math.min(subtotal, Math.max(0, discount));
  const grandTotal = Math.max(0, subtotal - discountAmount);

  const tenderedNum = Number(cashTendered) || 0;
  const changeDue = Math.max(0, tenderedNum - grandTotal);

  // Submit Sale / Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === 'cash' && tenderedNum > 0 && tenderedNum < grandTotal) {
      setErrorMessage("To'langan naqd pul jami summadan kam bo'lishi mumkin emas");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const orderPayload = {
        customerId: selectedCustomer?.id || null,
        customerName: selectedCustomer?.name || 'Umumiy Xaridor',
        items: cart.map(it => ({
          productId: it.product.id,
          quantity: it.quantity
        })),
        paymentMethod,
        discount: discountAmount,
        notes: `Kassa orqali savdo (${paymentMethod})`
      };

      const res = await apiRequest<{
        success: boolean;
        orderId: string;
        orderNumber: string;
        receipt: any;
      }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify(orderPayload)
      });

      if (res.success) {
        setIsPaymentModalOpen(false);
        setCompletedReceiptData(res.receipt);
        setIsReceiptOpen(true);

        // Reset cart
        setCart([]);
        setDiscount(0);
        setSelectedCustomer(null);
        setCashTendered('');

        // Reload products to reflect updated inventory stock immediately
        loadInitialData();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Savdoni yakunlashda xatolik yuz berdi");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[calc(100vh-6rem)]">
      {/* LEFT COLUMN: Product Catalog & Fast Search (Flex 1) */}
      <div className="flex-1 flex flex-col space-y-4">
        {/* Search, Barcode & Action Bar */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Text Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Mahsulot nomi yoki toifasi..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Barcode Scanner Input */}
          <form onSubmit={handleBarcodeSubmit} className="relative sm:w-64">
            <Barcode className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={barcodeInputRef}
              type="text"
              placeholder="Shtrix-kod skaneri..."
              value={barcodeInput}
              onChange={e => setBarcodeInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
            />
          </form>

          <button
            onClick={loadInitialData}
            title="Yangilash"
            className="p-2.5 text-slate-400 hover:text-slate-100 bg-slate-950 border border-slate-800 rounded-xl transition-colors shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/20'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-800'
            }`}
          >
            Barchasi ({products.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-800'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Catalog Grid */}
        <div className="flex-1 bg-slate-900/60 border border-slate-800/80 p-4 rounded-2xl overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mb-2" />
              Ichimliklar yuklanmoqda...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-xs text-center p-6">
              <Wine className="w-10 h-10 text-slate-600 mb-2" />
              <p className="font-semibold text-slate-400">Hech qanday mahsulot topilmadi</p>
              <p className="text-[11px] mt-1">Qidiruv so'zini yoki tanlangan toifani o'zgartiring</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map(p => {
                const isOutOfStock = p.quantity <= 0;
                const isLowStock = p.quantity > 0 && p.quantity <= p.min_stock;

                return (
                  <div
                    key={p.id}
                    onClick={() => !isOutOfStock && addToCart(p)}
                    className={`group relative bg-slate-900 border rounded-xl overflow-hidden p-2.5 flex flex-col justify-between transition-all select-none cursor-pointer ${
                      isOutOfStock
                        ? 'opacity-50 border-slate-800 cursor-not-allowed'
                        : 'border-slate-800 hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-500/5'
                    }`}
                  >
                    {/* Top image & badges */}
                    <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-slate-950 mb-2">
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      {/* Stock Badge */}
                      <span
                        className={`absolute top-1.5 right-1.5 px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          isOutOfStock
                            ? 'bg-rose-500/90 text-white'
                            : isLowStock
                            ? 'bg-amber-500/90 text-slate-950'
                            : 'bg-slate-950/80 text-emerald-400 backdrop-blur-sm'
                        }`}
                      >
                        {p.quantity} {p.unit}
                      </span>
                    </div>

                    {/* Product Info */}
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-100 line-clamp-1 group-hover:text-emerald-400 transition-colors">
                        {p.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{p.category_name || 'Ichimlik'}</p>
                    </div>

                    {/* Price and Add button */}
                    <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-100 font-mono tabular-nums">
                        {formatUZS(p.selling_price)}
                      </span>
                      <button
                        disabled={isOutOfStock}
                        className="w-6 h-6 rounded-lg bg-emerald-500 group-hover:bg-emerald-400 text-slate-950 flex items-center justify-center font-bold transition-colors disabled:bg-slate-800 disabled:text-slate-500"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: POS Cart & Instant Checkout (w-96) */}
      <div className="w-full lg:w-96 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col justify-between overflow-hidden shadow-2xl">
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Xarid Savatchasi ({cart.length})
            </span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-[11px] text-slate-400 hover:text-rose-400 font-medium flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Tozalash
            </button>
          )}
        </div>

        {/* Customer Selector */}
        <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-900/60">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            Mijoz
          </label>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-500 shrink-0" />
            <select
              value={selectedCustomer?.id || ''}
              onChange={e => {
                const c = customers.find(x => x.id === e.target.value) || null;
                setSelectedCustomer(c);
              }}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">Umumiy Xaridor (Standart)</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 p-4 overflow-y-auto divide-y divide-slate-800/60 min-h-[220px]">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 text-center py-12">
              <ShoppingBag className="w-10 h-10 text-slate-700 mb-2" />
              <p className="text-xs font-semibold text-slate-400">Savat bo'sh</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
                Katalogdan mahsulot tanlang yoki shtrix-kodni skaner qiling
              </p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-200 truncate">{item.product.name}</p>
                  <p className="text-[11px] text-slate-400 font-mono tabular-nums">
                    {formatUZS(item.product.selling_price)}
                  </p>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                  <button
                    onClick={() => updateQuantity(item.product.id, -1)}
                    className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-bold text-slate-100 font-mono tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product.id, 1)}
                    className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Line Total */}
                <div className="text-right shrink-0 min-w-[70px]">
                  <p className="text-xs font-bold text-slate-100 font-mono tabular-nums">
                    {formatUZS(item.quantity * item.product.selling_price)}
                  </p>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-[10px] text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    O'chirish
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Summary & Checkout Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 space-y-3">
          {/* Discount Field */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-slate-400">Chegirma:</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                value={discount || ''}
                onChange={e => setDiscount(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-24 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-right text-xs text-slate-100 font-mono"
              />
              <button
                onClick={() => setDiscountType(prev => (prev === 'fixed' ? 'percent' : 'fixed'))}
                className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-[10px] font-bold text-emerald-400 font-mono"
              >
                {discountType === 'fixed' ? 'UZS' : '%'}
              </button>
            </div>
          </div>

          <div className="flex justify-between text-xs text-slate-400">
            <span>Oraliq jami:</span>
            <span className="font-mono tabular-nums">{formatUZS(subtotal)}</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between text-xs text-emerald-400">
              <span>Chegirma summasi:</span>
              <span className="font-mono tabular-nums">-{formatUZS(discountAmount)}</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Jami to'lov:</span>
            <span className="text-xl font-extrabold text-emerald-400 font-mono tabular-nums">
              {formatUZS(grandTotal)}
            </span>
          </div>

          {/* Quick Pay / Open Modal */}
          <button
            disabled={cart.length === 0}
            onClick={() => {
              setCashTendered(String(grandTotal));
              setIsPaymentModalOpen(true);
            }}
            className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            <Banknote className="w-4 h-4" />
            To'lovga o'tish ({formatUZS(grandTotal)})
          </button>
        </div>
      </div>

      {/* PAYMENT MODAL */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-slate-100">To'lovni rasmiylashtirish</h3>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Total due notice */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-center space-y-1">
              <span className="text-xs text-slate-400">To'lanishi kerak bo'lgan summa:</span>
              <p className="text-2xl font-extrabold text-emerald-400 font-mono tabular-nums">
                {formatUZS(grandTotal)}
              </p>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">To'lov usulini tanlang:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                    paymentMethod === 'cash'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Banknote className="w-5 h-5" />
                  <span>Naqd pul</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                    paymentMethod === 'card'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span>Plastik karta</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('other')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                    paymentMethod === 'other'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Payme / Click</span>
                </button>
              </div>
            </div>

            {/* If Cash: Calculator for cash tendered and change due */}
            {paymentMethod === 'cash' && (
              <div className="space-y-3 p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Mijoz bergan naqd pul:
                  </label>
                  <input
                    type="number"
                    value={cashTendered}
                    onChange={e => setCashTendered(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 font-mono tabular-nums focus:outline-none focus:border-emerald-500"
                    placeholder="Summani kiriting..."
                  />
                </div>

                {/* Quick Cash Suggestions */}
                <div className="flex flex-wrap gap-1.5">
                  {[grandTotal, Math.ceil(grandTotal / 10000) * 10000, 50000, 100000, 200000].map(
                    (amt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCashTendered(String(amt))}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-mono"
                      >
                        {formatUZS(amt)}
                      </button>
                    )
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline text-xs">
                  <span className="text-slate-400">Qaytim (Сдача):</span>
                  <span
                    className={`font-mono font-bold text-sm tabular-nums ${
                      changeDue > 0 ? 'text-amber-400' : 'text-slate-300'
                    }`}
                  >
                    {formatUZS(changeDue)}
                  </span>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCheckout}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Rasmiylashtirilmoqda...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    To'lovni tasdiqlash & Chek
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        receiptData={completedReceiptData}
      />
    </div>
  );
};
