import React, { useState, useEffect, useRef } from 'react';
import {
  Cable,
  ShoppingCart,
  PackagePlus,
  ScanLine,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  QrCode,
  Download,
  Camera,
  Upload,
  Sparkles,
  ArrowRight,
  History,
  Boxes,
  Check,
  Tag,
  Receipt,
} from 'lucide-react';
import { CartItem, Product, StoreProfile, Transaction, UserProfile } from '../types';
import { formatRupiah } from '../services/storage';
import { playBarcodeBeep, downloadBarcodeImageFile } from '../services/barcodeGenerator';
import {
  useHardwareBarcodeScanner,
  matchProductBarcode,
  cleanBarcodeString,
  useWindowFocusStatus,
} from '../services/hardwareScanner';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { QRISModal } from './QRISModal';
import { ThermalReceiptModal } from './ThermalReceiptModal';

interface ScanHistoryEntry {
  id: string;
  time: string;
  barcode: string;
  productName: string;
  action: string;
  isNew: boolean;
}

interface BarcodeScannerMenuProps {
  products: Product[];
  storeProfile: StoreProfile;
  currentUser: UserProfile;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onAddProduct: (product: Omit<Product, 'id' | 'updatedAt'>) => Product;
  onUpdateProduct: (product: Product) => void;
  onCompleteSale: (transaction: Transaction, updatedProducts: Product[]) => void;
  onNavigateToPOS: () => void;
  onNavigateToInventory: () => void;
  isDark: boolean;
}

export const BarcodeScannerMenu: React.FC<BarcodeScannerMenuProps> = ({
  products,
  storeProfile,
  currentUser,
  cart,
  setCart,
  onAddProduct,
  onUpdateProduct,
  onCompleteSale,
  onNavigateToPOS,
  onNavigateToInventory,
  isDark,
}) => {
  // Primary workflow mode: 'pos' (Transaksi Kasir) or 'inventory' (Input Data & Stok Barang)
  const [workflowMode, setWorkflowMode] = useState<'pos' | 'inventory'>('pos');

  // Scanner Box & Signal States
  const scannerBoxRef = useRef<HTMLInputElement | null>(null);
  const [scannerInputText, setScannerInputText] = useState('');
  const [isScannerBoxFocused, setIsScannerBoxFocused] = useState(true);
  const [liveSignal, setLiveSignal] = useState('');
  const [scannerPulse, setScannerPulse] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);
  const { isWindowFocused, activateScannerFocus } = useWindowFocusStatus();

  // Toast / Feedback Messages (Zero window.alert / window.confirm)
  const [feedbackToast, setFeedbackToast] = useState<{
    type: 'success' | 'warning' | 'info';
    text: string;
  } | null>(null);

  // Camera / Image Upload Fallback Modal
  const [auxScannerModal, setAuxScannerModal] = useState<{
    open: boolean;
    mode: 'upload' | 'camera';
  }>({ open: false, mode: 'upload' });

  // --- INVENTORY / INPUT DATA WORKFLOW STATES ---
  const [activeScannedBarcode, setActiveScannedBarcode] = useState<string>('');
  const [matchedExistingProduct, setMatchedExistingProduct] = useState<Product | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Sembako');
  const [formUnit, setFormUnit] = useState('pcs');
  const [formPrice, setFormPrice] = useState('10000');
  const [formCostPrice, setFormCostPrice] = useState('8000');
  const [formStock, setFormStock] = useState('20');
  const [formMinStock, setFormMinStock] = useState('5');
  const [restockAddQty, setRestockAddQty] = useState('10');

  // --- POS / TRANSACTION WORKFLOW STATES ---
  const [posUnregisteredBarcode, setPosUnregisteredBarcode] = useState<string | null>(null);
  const posQuickNameRef = useRef<HTMLInputElement | null>(null);
  const [posQuickName, setPosQuickName] = useState('');
  const [posQuickPrice, setPosQuickPrice] = useState('10000');
  const [posQuickCost, setPosQuickCost] = useState('8000');
  const [posQuickStock, setPosQuickStock] = useState('25');
  const [posQuickCategory, setPosQuickCategory] = useState('Sembako');
  const [posQuickUnit, setPosQuickUnit] = useState('pcs');

  const [discountNominal, setDiscountNominal] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'TUNAI' | 'QRIS'>('TUNAI');
  const [cashGiven, setCashGiven] = useState<string>('');
  const [confirmClearCart, setConfirmClearCart] = useState(false);
  const [isQRISModalOpen, setIsQRISModalOpen] = useState(false);
  const [completedReceiptTx, setCompletedReceiptTx] = useState<Transaction | null>(null);

  const showToast = (type: 'success' | 'warning' | 'info', text: string) => {
    setFeedbackToast({ type, text });
    setTimeout(() => {
      setFeedbackToast((prev) => (prev?.text === text ? null : prev));
    }, 3800);
  };

  const focusCableScannerInput = () => {
    if (scannerBoxRef.current) {
      scannerBoxRef.current.focus({ preventScroll: true });
      setIsScannerBoxFocused(true);
    }
  };

  // Focus scanner box when entering menu or switching mode (unless editing a newly scanned item form)
  useEffect(() => {
    if (!posUnregisteredBarcode && !activeScannedBarcode) {
      const t = setTimeout(focusCableScannerInput, 80);
      return () => clearTimeout(t);
    }
  }, [workflowMode, posUnregisteredBarcode, activeScannedBarcode]);

  const appendHistory = (barcode: string, productName: string, action: string, isNew: boolean) => {
    const timeStr = new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setScanHistory((prev) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        time: timeStr,
        barcode,
        productName,
        action,
        isNew,
      },
      ...prev.slice(0, 14),
    ]);
  };

  // Add item to shared POS Cart
  const addItemToCart = (product: Product, qty = 1): boolean => {
    if (product.stock <= 0) {
      showToast('warning', `Stok "${product.name}" HABIS (0 ${product.unit})! Silakan tambah stok dulu.`);
      return false;
    }

    let exceeded = false;
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.product.id === product.id);
      if (idx > -1) {
        const existing = prev[idx];
        const nextQty = existing.quantity + qty;
        if (nextQty > product.stock) {
          exceeded = true;
          return prev;
        }
        const copy = [...prev];
        copy[idx] = {
          ...existing,
          product,
          quantity: nextQty,
          subtotal: nextQty * product.price - existing.discount,
        };
        return copy;
      }
      if (qty > product.stock) {
        exceeded = true;
        return prev;
      }
      return [
        ...prev,
        {
          product,
          quantity: qty,
          subtotal: qty * product.price,
          discount: 0,
        },
      ];
    });

    if (exceeded) {
      showToast(
        'warning',
        `Maksimal stok tersedia untuk "${product.name}" hanya ${product.stock} ${product.unit}.`
      );
      return false;
    }
    return true;
  };

  // Core handler whenever ANY barcode arrives from wired USB cable scanner, manual box, or camera/image
  const processScannedBarcode = (rawCode: string) => {
    const clean = cleanBarcodeString(rawCode);
    if (!clean) return;

    setScannerPulse(true);
    setTimeout(() => setScannerPulse(false), 550);
    setScannerInputText('');
    setLiveSignal('');
    playBarcodeBeep();

    const found = matchProductBarcode(products, clean);

    if (workflowMode === 'pos') {
      if (found) {
        setPosUnregisteredBarcode(null);
        const added = addItemToCart(found, 1);
        if (added) {
          showToast(
            'success',
            `+1 ${found.name} (${formatRupiah(found.price)}) berhasil masuk keranjang!`
          );
          appendHistory(clean, found.name, '+1 Masuk Keranjang Kasir', false);
        }
        setTimeout(focusCableScannerInput, 40);
      } else {
        // Unregistered barcode during POS checkout -> open instant register card right on screen!
        setPosUnregisteredBarcode(clean);
        setPosQuickName('');
        setPosQuickPrice('10000');
        setPosQuickCost('8000');
        setPosQuickStock('25');
        setPosQuickCategory('Sembako');
        setPosQuickUnit('pcs');
        showToast(
          'info',
          `Barcode baru "${clean}" terdeteksi! Isi nama & harga untuk simpan & masuk keranjang.`
        );
        appendHistory(clean, 'Barang Baru (Belum Terdaftar)', 'Menunggu Input Cepat Kasir', true);
        setTimeout(() => posQuickNameRef.current?.focus(), 80);
      }
    } else {
      // INVENTORY / INPUT DATA MODE
      setActiveScannedBarcode(clean);
      if (found) {
        setMatchedExistingProduct(found);
        setFormName(found.name);
        setFormCategory(found.category);
        setFormUnit(found.unit);
        setFormPrice(String(found.price));
        setFormCostPrice(String(found.costPrice || 0));
        setFormStock(String(found.stock));
        setFormMinStock(String(found.minStock));
        setRestockAddQty('10');
        showToast(
          'info',
          `Barang ditemukan: "${found.name}" (Stok saat ini: ${found.stock} ${found.unit}).`
        );
        appendHistory(clean, found.name, 'Cek / Update Stok & Harga', false);
      } else {
        setMatchedExistingProduct(null);
        setFormName('');
        setFormCategory('Sembako');
        setFormUnit('pcs');
        setFormPrice('10000');
        setFormCostPrice('8000');
        setFormStock('20');
        setFormMinStock('5');
        showToast(
          'success',
          `Barcode baru "${clean}" ditangkap! Silakan ketik Nama Barang & Harga lalu Simpan.`
        );
        appendHistory(clean, 'Input Barang Baru', 'Siap Input Data Baru', true);
        setTimeout(() => nameInputRef.current?.focus(), 80);
      }
    }
  };

  // Global Hardware Wired USB / OTG Scanner Hook
  useHardwareBarcodeScanner({
    enabled: !auxScannerModal.open && !isQRISModalOpen,
    minLength: 3,
    onKeyActivity: (partial) => {
      setLiveSignal(partial);
    },
    onScan: (scannedCode) => {
      processScannedBarcode(scannedCode);
    },
  });

  // Save Quick-Added Product in POS Mode & Add to Cart
  const handleSavePosQuickProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!posUnregisteredBarcode) return;
    if (!posQuickName.trim()) {
      showToast('warning', 'Nama barang wajib diisi terlebih dahulu!');
      posQuickNameRef.current?.focus();
      return;
    }

    const created = onAddProduct({
      barcode: posUnregisteredBarcode,
      name: posQuickName.trim(),
      category: posQuickCategory.trim() || 'Umum',
      price: parseFloat(posQuickPrice) || 0,
      costPrice: parseFloat(posQuickCost) || 0,
      stock: Math.max(1, parseInt(posQuickStock, 10) || 1),
      minStock: 5,
      unit: posQuickUnit.trim() || 'pcs',
    });

    addItemToCart(created, 1);
    showToast(
      'success',
      `Barang "${created.name}" berhasil disimpan ke Inventaris & masuk keranjang!`
    );
    setPosUnregisteredBarcode(null);
    setTimeout(focusCableScannerInput, 60);
  };

  // Save New or Updated Product in Inventory Mode, then immediately re-focus scanner for next item!
  const handleSaveInventoryForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeScannedBarcode.trim()) {
      showToast('warning', 'Scan atau isi kode barcode terlebih dahulu!');
      focusCableScannerInput();
      return;
    }
    if (!formName.trim()) {
      showToast('warning', 'Nama barang wajib diisi!');
      nameInputRef.current?.focus();
      return;
    }

    const priceNum = parseFloat(formPrice) || 0;
    const costNum = parseFloat(formCostPrice) || 0;
    const stockNum = Math.max(0, parseInt(formStock, 10) || 0);
    const minStockNum = Math.max(1, parseInt(formMinStock, 10) || 1);

    if (matchedExistingProduct) {
      onUpdateProduct({
        ...matchedExistingProduct,
        barcode: activeScannedBarcode.trim(),
        name: formName.trim(),
        category: formCategory.trim() || 'Umum',
        unit: formUnit.trim() || 'pcs',
        price: priceNum,
        costPrice: costNum,
        stock: stockNum,
        minStock: minStockNum,
        updatedAt: new Date().toISOString(),
      });
      showToast(
        'success',
        `Data & stok "${formName.trim()}" (${stockNum} ${formUnit}) berhasil diperbarui! Siap scan barang berikutnya.`
      );
    } else {
      onAddProduct({
        barcode: activeScannedBarcode.trim(),
        name: formName.trim(),
        category: formCategory.trim() || 'Umum',
        unit: formUnit.trim() || 'pcs',
        price: priceNum,
        costPrice: costNum,
        stock: stockNum,
        minStock: minStockNum,
      });
      showToast(
        'success',
        `Barang baru "${formName.trim()}" berhasil disimpan! Tembak scanner untuk barang berikutnya.`
      );
    }

    setActiveScannedBarcode('');
    setMatchedExistingProduct(null);
    setFormName('');
    setTimeout(focusCableScannerInput, 60);
  };

  const handleInstantRestock = (delta: number) => {
    if (!matchedExistingProduct) return;
    const nextStock = Math.max(0, matchedExistingProduct.stock + delta);
    const updated: Product = {
      ...matchedExistingProduct,
      stock: nextStock,
      updatedAt: new Date().toISOString(),
    };
    onUpdateProduct(updated);
    setMatchedExistingProduct(updated);
    setFormStock(String(nextStock));
    playBarcodeBeep();
    showToast(
      'success',
      `Stok "${updated.name}" bertambah +${delta} menjadi ${nextStock} ${updated.unit}!`
    );
  };

  // Cart manipulation helpers
  const updateCartQty = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      setCart((prev) => prev.filter((item) => item.product.id !== productId));
      return;
    }
    const prod = products.find((p) => p.id === productId);
    if (prod && newQty > prod.stock) {
      showToast('warning', `Stok "${prod.name}" hanya tersedia ${prod.stock} ${prod.unit}.`);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              quantity: newQty,
              subtotal: newQty * item.product.price - item.discount,
            }
          : item
      )
    );
  };

  const subtotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
  const total = Math.max(0, subtotal - discountNominal);
  const totalUnits = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cashAmount = parseFloat(cashGiven) || 0;
  const change = Math.max(0, cashAmount - total);

  const executeCheckout = (method: 'TUNAI' | 'QRIS', qrisRef?: string, overrideCash?: number) => {
    const finalPaid = overrideCash !== undefined ? overrideCash : cashAmount;
    const finalChange = Math.max(0, finalPaid - total);
    const txId = `TRX-${Date.now().toString().slice(-8)}`;

    const newTx: Transaction = {
      id: txId,
      date: new Date().toISOString(),
      cashierName: currentUser.name,
      cashierRole: currentUser.role,
      items: cart.map((c) => ({
        productId: c.product.id,
        barcode: c.product.barcode,
        name: c.product.name,
        price: c.product.price,
        costPrice: c.product.costPrice,
        quantity: c.quantity,
        subtotal: c.subtotal,
      })),
      subtotal,
      discount: discountNominal,
      total,
      paymentMethod: method,
      amountPaid: method === 'TUNAI' ? finalPaid : total,
      change: method === 'TUNAI' ? finalChange : 0,
      qrisRef: method === 'QRIS' ? qrisRef : undefined,
      syncedToSheet: false,
    };

    const updatedProducts = products.map((prod) => {
      const inCart = cart.find((c) => c.product.id === prod.id);
      if (inCart) {
        return {
          ...prod,
          stock: Math.max(0, prod.stock - inCart.quantity),
          updatedAt: new Date().toISOString(),
        };
      }
      return prod;
    });

    onCompleteSale(newTx, updatedProducts);
    setCompletedReceiptTx(newTx);
    setCart([]);
    setDiscountNominal(0);
    setCashGiven('');
    setIsQRISModalOpen(false);
    showToast('success', `Transaksi ${txId} sebesar ${formatRupiah(total)} berhasil diselesaikan!`);
  };

  const handleCheckoutClick = () => {
    if (cart.length === 0) {
      showToast('warning', 'Keranjang masih kosong! Scan barcode barang terlebih dahulu.');
      focusCableScannerInput();
      return;
    }
    if (paymentMethod === 'QRIS') {
      setIsQRISModalOpen(true);
      return;
    }
    if (!cashGiven.trim() || cashAmount === 0) {
      setCashGiven(String(total));
      executeCheckout('TUNAI', undefined, total);
      return;
    }
    if (cashAmount < total) {
      showToast(
        'warning',
        `Uang tunai (${formatRupiah(cashAmount)}) kurang dari total tagihan (${formatRupiah(total)})!`
      );
      return;
    }
    executeCheckout('TUNAI');
  };

  return (
    <div className="space-y-5 pb-12">
      {/* TOP HEADER & WORKFLOW MODE SWITCHER */}
      <div
        className={`p-5 sm:p-6 rounded-3xl border shadow-sm space-y-4 ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-500">
                <Cable className="w-5 h-5" />
              </div>
              <h1
                className={`text-lg sm:text-xl font-black tracking-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                Menu Scan Barcode (Mesin Kabel USB / OTG)
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black border ${
                  isWindowFocused
                    ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-500'
                    : 'bg-amber-500/20 border-amber-500/40 text-amber-500 animate-pulse'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    scannerPulse
                      ? 'bg-amber-400 scale-150 animate-ping'
                      : isWindowFocused
                      ? 'bg-emerald-400 animate-pulse'
                      : 'bg-amber-400'
                  }`}
                />
                {isWindowFocused ? 'SCANNER KABEL AKTIF' : 'KLIK LAYAR UNTUK FOKUS'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Pusat kendali mesin barcode kabel untuk <strong>Transaksi Kasir Cepat</strong> maupun{' '}
              <strong>Input Data & Stok Barang</strong> tanpa ribet.
            </p>
          </div>

          {/* 2 Big Workflow Mode Buttons */}
          <div
            className={`grid grid-cols-2 p-1.5 rounded-2xl border gap-1.5 shrink-0 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setWorkflowMode('pos');
                setTimeout(focusCableScannerInput, 40);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                workflowMode === 'pos'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <ShoppingCart className="w-4 h-4 shrink-0" />
              <span>1. Transaksi Kasir ({totalUnits})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setWorkflowMode('inventory');
                setTimeout(focusCableScannerInput, 40);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                workflowMode === 'inventory'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <PackagePlus className="w-4 h-4 shrink-0" />
              <span>2. Input Data & Stok</span>
            </button>
          </div>
        </div>

        {/* Window Focus Helper Banner if Iframe is Unfocused */}
        {!isWindowFocused && (
          <button
            type="button"
            onClick={() => activateScannerFocus(scannerBoxRef.current)}
            className="w-full p-3.5 rounded-2xl bg-amber-500/15 border-2 border-amber-500/50 text-amber-600 dark:text-amber-300 text-xs font-bold flex items-center justify-between gap-3 cursor-pointer"
          >
            <div className="flex items-center gap-2.5 text-left">
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
              <span>
                Fokus keyboard sedang berada di luar jendela aplikasi.{' '}
                <strong>Klik di sini sekali</strong> agar tembakan Mesin Barcode Kabel langsung terbaca!
              </span>
            </div>
            <span className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-[11px] shrink-0">
              Aktifkan Scanner
            </span>
          </button>
        )}

        {/* Live Feedback Toast Banner */}
        {feedbackToast && (
          <div
            className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in ${
              feedbackToast.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-600 dark:text-emerald-400'
                : feedbackToast.type === 'warning'
                ? 'bg-rose-500/15 border-rose-500/35 text-rose-600 dark:text-rose-400'
                : 'bg-blue-500/15 border-blue-500/35 text-blue-600 dark:text-blue-400'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackToast.type === 'warning' ? (
                <AlertCircle className="w-4 h-4 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              )}
              <span>{feedbackToast.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackToast(null)}
              className="text-xs opacity-70 hover:opacity-100 px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* MAIN 2-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (5 cols): WIRED BARCODE GUN RECEIVER & LIVE SIGNAL LOG */}
        <div className="lg:col-span-5 space-y-4">
          <div
            className={`p-5 rounded-3xl border shadow-sm space-y-4 ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
            }`}
          >
            <div
              onClick={focusCableScannerInput}
              className={`p-5 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer ${
                workflowMode === 'pos'
                  ? 'border-emerald-500/60 bg-emerald-500/5'
                  : 'border-blue-500/60 bg-blue-500/5'
              }`}
            >
              <div
                className={`w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center relative ${
                  workflowMode === 'pos'
                    ? 'bg-emerald-500/15 text-emerald-500'
                    : 'bg-blue-500/15 text-blue-500'
                }`}
              >
                <ScanLine className="w-7 h-7" />
                <span
                  className={`absolute -top-1 -right-1 w-3 h-3 rounded-full animate-ping ${
                    workflowMode === 'pos' ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}
                />
              </div>

              <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {workflowMode === 'pos'
                  ? 'Siap Scan Transaksi Kasir (Kabel USB)'
                  : 'Siap Scan Input Data / Cek Stok Barang'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                {workflowMode === 'pos'
                  ? 'Tembak mesin scanner kabel ke produk secara beruntun — otomatis masuk keranjang di sebelah kanan.'
                  : 'Tembak mesin scanner kabel ke kemasan barang — otomatis membuka form tambah barang baru atau tambah stok.'}
              </p>

              {/* Dedicated Wired Scanner Receiver Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (scannerInputText.trim()) {
                    processScannedBarcode(scannerInputText.trim());
                  }
                }}
                className="mt-4 space-y-2"
              >
                <div className="relative">
                  <input
                    ref={scannerBoxRef}
                    type="text"
                    name="barcode"
                    data-barcode-input="true"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="Tembak scanner kabel atau ketik kode lalu Enter..."
                    value={scannerInputText}
                    onFocus={() => setIsScannerBoxFocused(true)}
                    onBlur={() => setIsScannerBoxFocused(false)}
                    onChange={(e) => setScannerInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        (e.key === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) &&
                        scannerInputText.trim()
                      ) {
                        e.preventDefault();
                        e.stopPropagation();
                        processScannedBarcode(scannerInputText.trim());
                      }
                    }}
                    className={`barcode-input-field w-full px-4 py-3 text-center font-mono font-bold text-sm rounded-xl border-2 focus:outline-hidden transition-all ${
                      workflowMode === 'pos'
                        ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500/40'
                        : 'border-blue-500 focus:ring-2 focus:ring-blue-500/40'
                    } ${
                      isDark
                        ? 'bg-slate-950 text-white placeholder-slate-500'
                        : 'bg-white text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] font-bold text-emerald-500 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {isScannerBoxFocused && isWindowFocused
                      ? 'Kotak Scanner Terkunci Aktif'
                      : 'Scanner Global Aktif di Seluruh Layar'}
                  </span>
                  <button
                    type="submit"
                    disabled={!scannerInputText.trim()}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                      scannerInputText.trim()
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Proses Kode
                  </button>
                </div>
              </form>

              {liveSignal && (
                <div className="mt-2.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-500 font-mono text-xs font-bold">
                  Membaca sinyal kabel: {liveSignal}
                </div>
              )}
            </div>

            {/* Secondary Alternative Scan Methods (Upload Photo / Camera) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAuxScannerModal({ open: true, mode: 'upload' })}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  isDark
                    ? 'bg-slate-850 border-slate-700 text-slate-200 hover:bg-slate-800'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Upload className="w-3.5 h-3.5 text-blue-500" />
                <span>Scan Foto Barcode</span>
              </button>
              <button
                type="button"
                onClick={() => setAuxScannerModal({ open: true, mode: 'camera' })}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                  isDark
                    ? 'bg-slate-850 border-slate-700 text-slate-200 hover:bg-slate-800'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Camera className="w-3.5 h-3.5 text-emerald-500" />
                <span>Buka Kamera HP</span>
              </button>
            </div>

            {/* Quick Catalog Test Buttons */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="text-[11px] font-bold text-slate-400 mb-2 flex items-center justify-between">
                <span>Simulasi Cepat Barcode Toko:</span>
                <span className="text-[10px] font-normal">Klik untuk tes alur</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {products.slice(0, 6).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => processScannedBarcode(p.barcode)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono border transition-all cursor-pointer ${
                      isDark
                        ? 'bg-slate-850 border-slate-700 text-slate-300 hover:border-emerald-500'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-500'
                    }`}
                  >
                    <span className="text-emerald-500 font-bold">{p.barcode}</span>{' '}
                    <span className="font-sans text-slate-400">({p.name.split(' ')[0]})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Scan Activity Log */}
          <div
            className={`p-4 rounded-3xl border shadow-sm ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-black">
                <History className="w-4 h-4 text-emerald-500" />
                <span>Riwayat Tembakan Scanner ({scanHistory.length})</span>
              </div>
              {scanHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => setScanHistory([])}
                  className="text-[10px] text-slate-400 hover:text-rose-400 font-bold cursor-pointer"
                >
                  Bersihkan
                </button>
              )}
            </div>

            {scanHistory.length === 0 ? (
              <p className="text-[11px] text-slate-400 py-4 text-center">
                Belum ada barcode yang di-scan pada sesi ini. Arahkan mesin scanner kabel ke produk untuk mulai.
              </p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {scanHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                      isDark
                        ? 'bg-slate-950/60 border-slate-800'
                        : 'bg-slate-50 border-slate-200/70'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-emerald-500 text-[11px]">
                          {entry.barcode}
                        </span>
                        <span className="text-[10px] text-slate-400">• {entry.time}</span>
                      </div>
                      <div className="font-bold truncate text-[11px] mt-0.5">
                        {entry.productName}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 ${
                        entry.isNew
                          ? 'bg-amber-500/15 text-amber-500'
                          : 'bg-emerald-500/15 text-emerald-500'
                      }`}
                    >
                      {entry.action}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (7 cols): DYNAMIC ACTION AREA (POS CART OR INVENTORY INPUT FORM) */}
        <div className="lg:col-span-7 space-y-4">
          {workflowMode === 'pos' ? (
            <>
              {/* Instant Unregistered Barcode Registration Card in POS Mode */}
              {posUnregisteredBarcode && (
                <div
                  className={`p-5 rounded-3xl border-2 border-amber-500/50 shadow-lg space-y-4 animate-in fade-in ${
                    isDark ? 'bg-slate-900 text-white' : 'bg-amber-50/40 text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-500/20 text-amber-500">
                        <PackagePlus className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-black text-sm">
                          Barang Belum Terdaftar — Input Cepat & Masuk Keranjang
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Barcode:{' '}
                          <strong className="font-mono text-emerald-500">
                            {posUnregisteredBarcode}
                          </strong>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPosUnregisteredBarcode(null);
                        setTimeout(focusCableScannerInput, 40);
                      }}
                      className="text-xs text-slate-400 hover:text-rose-500 font-bold px-2 py-1 cursor-pointer"
                    >
                      Batal ✕
                    </button>
                  </div>

                  <form onSubmit={handleSavePosQuickProduct} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-bold block mb-1">Nama Barang *</label>
                        <input
                          ref={posQuickNameRef}
                          type="text"
                          required
                          placeholder="Ketik nama barang lalu isi harga..."
                          value={posQuickName}
                          onChange={(e) => setPosQuickName(e.target.value)}
                          className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                            isDark
                              ? 'bg-slate-950 border-slate-700 text-white'
                              : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold block mb-1">Harga Jual (Rp) *</label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={posQuickPrice}
                          onChange={(e) => setPosQuickPrice(e.target.value)}
                          className={`w-full px-3.5 py-2 text-xs font-mono font-bold rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                            isDark
                              ? 'bg-slate-950 border-slate-700 text-white'
                              : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold block mb-1">HPP Modal (Rp)</label>
                        <input
                          type="number"
                          min="0"
                          value={posQuickCost}
                          onChange={(e) => setPosQuickCost(e.target.value)}
                          className={`w-full px-3.5 py-2 text-xs font-mono rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                            isDark
                              ? 'bg-slate-950 border-slate-700 text-white'
                              : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold block mb-1">Stok Awal</label>
                        <input
                          type="number"
                          min="1"
                          value={posQuickStock}
                          onChange={(e) => setPosQuickStock(e.target.value)}
                          className={`w-full px-3.5 py-2 text-xs font-mono rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                            isDark
                              ? 'bg-slate-950 border-slate-700 text-white'
                              : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold block mb-1">Kategori</label>
                        <input
                          type="text"
                          value={posQuickCategory}
                          onChange={(e) => setPosQuickCategory(e.target.value)}
                          className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                            isDark
                              ? 'bg-slate-950 border-slate-700 text-white'
                              : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Check className="w-4 h-4" />
                        <span>Simpan Barang & Masuk Keranjang</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* LIVE POS TRANSACTION CART */}
              <div
                className={`rounded-3xl border shadow-sm overflow-hidden ${
                  isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
                }`}
              >
                <div className="p-4 bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 text-white flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/15 rounded-xl">
                      <ShoppingCart className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-black text-sm">
                        KERANJANG TRANSAKSI BARCODE ({cart.length} Produk / {totalUnits} Unit)
                      </h3>
                      <p className="text-[11px] text-emerald-100">
                        Terhubung langsung dengan Mesin Kasir (POS)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onNavigateToPOS}
                      className="px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>Layar Kasir Penuh</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    {cart.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!confirmClearCart) {
                            setConfirmClearCart(true);
                            setTimeout(() => setConfirmClearCart(false), 3000);
                          } else {
                            setCart([]);
                            setDiscountNominal(0);
                            setCashGiven('');
                            setConfirmClearCart(false);
                            focusCableScannerInput();
                          }
                        }}
                        className="px-2.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[11px] font-bold cursor-pointer"
                      >
                        {confirmClearCart ? 'Yakin Reset?' : 'Reset'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Cart Items */}
                <div className="p-4 space-y-2.5 max-h-[38vh] overflow-y-auto">
                  {cart.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-300">
                        Keranjang Belanja Kosong
                      </p>
                      <p className="text-[11px] mt-1 max-w-xs mx-auto">
                        Arahkan mesin scanner barcode kabel ke barang belanjaan pelanggan untuk langsung mengisi keranjang.
                      </p>
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div
                        key={item.product.id}
                        className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                          isDark
                            ? 'bg-slate-950/60 border-slate-800 text-white'
                            : 'bg-slate-50/80 border-slate-200 text-slate-900'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-emerald-500 font-bold">
                              {item.product.barcode}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              (Sisa stok: {item.product.stock})
                            </span>
                          </div>
                          <h4 className="font-bold text-xs truncate mt-0.5">{item.product.name}</h4>
                          <div className="text-xs font-mono mt-0.5">
                            <span className="text-slate-400">{formatRupiah(item.product.price)}</span>{' '}
                            × <strong className="text-emerald-500">{item.quantity}</strong> ={' '}
                            <strong>{formatRupiah(item.subtotal)}</strong>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.product.id, item.quantity - 1)}
                            className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center font-mono font-black text-xs">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.product.id, item.quantity + 1)}
                            className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.product.id, 0)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer ml-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Checkout Footer */}
                <div
                  className={`p-4 border-t space-y-3 ${
                    isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Tag className="w-3.5 h-3.5 text-amber-500" />
                      <span>Diskon Potongan (Rp):</span>
                    </span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={discountNominal || ''}
                      onChange={(e) =>
                        setDiscountNominal(Math.max(0, parseFloat(e.target.value) || 0))
                      }
                      className={`w-32 px-2.5 py-1 text-right font-mono font-bold text-xs rounded-xl border focus:outline-hidden ${
                        isDark
                          ? 'bg-slate-900 border-slate-700 text-white'
                          : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100 block">
                        TOTAL PEMBAYARAN
                      </span>
                      <span className="text-2xl font-black font-mono">{formatRupiah(total)}</span>
                    </div>
                    <Receipt className="w-7 h-7 text-emerald-200" />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('TUNAI')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border cursor-pointer ${
                        paymentMethod === 'TUNAI'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : isDark
                          ? 'bg-slate-900 border-slate-700 text-slate-300'
                          : 'bg-white border-slate-300 text-slate-700'
                      }`}
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Tunai (Cash)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('QRIS')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border cursor-pointer ${
                        paymentMethod === 'QRIS'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : isDark
                          ? 'bg-slate-900 border-slate-700 text-slate-300'
                          : 'bg-white border-slate-300 text-slate-700'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>QRIS Digital</span>
                    </button>
                  </div>

                  {paymentMethod === 'TUNAI' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Nominal uang diterima (kosongkan = Uang Pas)..."
                          value={cashGiven}
                          onChange={(e) => setCashGiven(e.target.value)}
                          className={`flex-1 px-3 py-2 text-xs font-mono font-bold rounded-xl border focus:outline-hidden ${
                            isDark
                              ? 'bg-slate-900 border-slate-700 text-white'
                              : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setCashGiven(String(total))}
                          className="px-3 py-2 rounded-xl bg-emerald-500/15 text-emerald-500 text-xs font-bold cursor-pointer shrink-0 flex items-center gap-1"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Uang Pas</span>
                        </button>
                      </div>
                      {cashAmount > 0 && (
                        <div className="flex justify-between text-xs px-1">
                          <span className="text-slate-400">Kembalian:</span>
                          <span
                            className={`font-mono font-black ${
                              cashAmount >= total ? 'text-emerald-500' : 'text-rose-500'
                            }`}
                          >
                            {formatRupiah(change)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={cart.length === 0}
                    onClick={handleCheckoutClick}
                    className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      cart.length === 0
                        ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                        : paymentMethod === 'TUNAI'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {paymentMethod === 'TUNAI'
                        ? `Bayar Tunai & Cetak Struk (${formatRupiah(total)})`
                        : `Bayar QRIS (${formatRupiah(total)})`}
                    </span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* MODE 2: INPUT DATA & CEK STOK BARANG DENGAN BARCODE */
            <div
              className={`p-5 sm:p-6 rounded-3xl border shadow-sm space-y-5 ${
                isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
              }`}
            >
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/15 text-blue-500">
                    <Boxes className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm">
                      {matchedExistingProduct
                        ? 'Barang Terdaftar — Tambah Stok / Update Data'
                        : activeScannedBarcode
                        ? 'Input Data Barang Baru (Hasil Scan Barcode)'
                        : 'Input Data & Stok Menggunakan Mesin Barcode Kabel'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Tembak barcode produk untuk menambah barang baru atau menambah stok gudang
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onNavigateToInventory}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <span>Tabel Inventaris</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {!activeScannedBarcode ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <ScanLine className="w-8 h-8" />
                  </div>
                  <h4 className="font-black text-sm">
                    Silakan Tembak Mesin Barcode Kabel ke Produk
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                    Jika barcode belum ada di database, formulir <strong>Input Barang Baru</strong>{' '}
                    akan langsung terbuka otomatis. Jika barang sudah ada, Anda bisa langsung{' '}
                    <strong>Tambah Stok Cepat</strong> atau ubah harga.
                  </p>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const generated = `${Math.floor(899000000000 + Math.random() * 99999999)}`;
                        setActiveScannedBarcode(generated);
                        setMatchedExistingProduct(null);
                        setFormName('');
                        setTimeout(() => nameInputRef.current?.focus(), 60);
                      }}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                    >
                      + Buat Barang Tanpa Kemasan Barcode (Kode Otomatis)
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSaveInventoryForm} className="space-y-4">
                  {/* Quick Restock Bar if Existing Product */}
                  {matchedExistingProduct && (
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                          Stok Saat Ini: {matchedExistingProduct.stock}{' '}
                          {matchedExistingProduct.unit}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            downloadBarcodeImageFile(
                              matchedExistingProduct,
                              'pure_barcode',
                              storeProfile.name
                            )
                          }
                          className="text-[11px] font-bold text-emerald-500 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Gambar Barcode</span>
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-500">
                          Tambah Stok Cepat:
                        </span>
                        {[1, 5, 10, 24].map((qty) => (
                          <button
                            key={qty}
                            type="button"
                            onClick={() => handleInstantRestock(qty)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer"
                          >
                            +{qty}
                          </button>
                        ))}
                        <div className="flex items-center gap-1 ml-auto">
                          <input
                            type="number"
                            min="1"
                            value={restockAddQty}
                            onChange={(e) => setRestockAddQty(e.target.value)}
                            className={`w-16 px-2 py-1.5 text-xs font-mono font-bold rounded-xl border text-center ${
                              isDark
                                ? 'bg-slate-900 border-slate-700 text-white'
                                : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleInstantRestock(Math.max(1, parseInt(restockAddQty, 10) || 1))
                            }
                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
                          >
                            + Tambah
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Scanned Barcode Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold">Kode Barcode (Hasil Scan Kabel) *</label>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                          matchedExistingProduct
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : 'bg-amber-500/15 text-amber-500'
                        }`}
                      >
                        {matchedExistingProduct ? 'SUDAH TERDAFTAR' : 'BARCODE BARU'}
                      </span>
                    </div>
                    <input
                      type="text"
                      data-barcode-form-field="true"
                      required
                      value={activeScannedBarcode}
                      onChange={(e) => setActiveScannedBarcode(e.target.value)}
                      className={`w-full px-3.5 py-2.5 text-sm font-mono font-black rounded-xl border ${
                        isDark
                          ? 'bg-slate-950 border-emerald-500/50 text-emerald-400'
                          : 'bg-emerald-50/50 border-emerald-500/50 text-emerald-700'
                      }`}
                    />
                  </div>

                  {/* Product Name */}
                  <div>
                    <label className="text-xs font-bold block mb-1">Nama Barang *</label>
                    <input
                      ref={nameInputRef}
                      type="text"
                      required
                      placeholder="Contoh: Minyak Goreng Sunco 2 Liter"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-blue-500 ${
                        isDark
                          ? 'bg-slate-950 border-slate-700 text-white'
                          : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold block mb-1">Kategori</label>
                      <input
                        type="text"
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-hidden ${
                          isDark
                            ? 'bg-slate-950 border-slate-700 text-white'
                            : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">Satuan</label>
                      <input
                        type="text"
                        value={formUnit}
                        onChange={(e) => setFormUnit(e.target.value)}
                        placeholder="pcs / btl / pack"
                        className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-hidden ${
                          isDark
                            ? 'bg-slate-950 border-slate-700 text-white'
                            : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold block mb-1">Harga Jual (Rp) *</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={formPrice}
                        onChange={(e) => setFormPrice(e.target.value)}
                        className={`w-full px-3.5 py-2 text-xs font-mono font-bold rounded-xl border focus:outline-hidden ${
                          isDark
                            ? 'bg-slate-950 border-slate-700 text-white'
                            : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">HPP Modal (Rp)</label>
                      <input
                        type="number"
                        min="0"
                        value={formCostPrice}
                        onChange={(e) => setFormCostPrice(e.target.value)}
                        className={`w-full px-3.5 py-2 text-xs font-mono rounded-xl border focus:outline-hidden ${
                          isDark
                            ? 'bg-slate-950 border-slate-700 text-white'
                            : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold block mb-1">Total Stok Fisik *</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={formStock}
                        onChange={(e) => setFormStock(e.target.value)}
                        className={`w-full px-3.5 py-2 text-xs font-mono font-bold rounded-xl border focus:outline-hidden ${
                          isDark
                            ? 'bg-slate-950 border-slate-700 text-white'
                            : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold block mb-1">Batas Minimum Stok</label>
                      <input
                        type="number"
                        min="1"
                        value={formMinStock}
                        onChange={(e) => setFormMinStock(e.target.value)}
                        className={`w-full px-3.5 py-2 text-xs font-mono rounded-xl border focus:outline-hidden ${
                          isDark
                            ? 'bg-slate-950 border-slate-700 text-white'
                            : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveScannedBarcode('');
                        setMatchedExistingProduct(null);
                        setTimeout(focusCableScannerInput, 40);
                      }}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      Reset / Scan Lain
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-600/25 cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {matchedExistingProduct
                          ? 'Simpan Perubahan & Siap Scan Lagi'
                          : 'Simpan Barang Baru & Siap Scan Lagi'}
                      </span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Auxiliary Upload / Camera Modal */}
      {auxScannerModal.open && (
        <BarcodeScannerModal
          products={products}
          initialMode={auxScannerModal.mode}
          allowContinuous={workflowMode === 'pos'}
          onDetected={(code) => processScannedBarcode(code)}
          onClose={() => {
            setAuxScannerModal({ open: false, mode: 'upload' });
            setTimeout(focusCableScannerInput, 60);
          }}
        />
      )}

      {/* QRIS Payment Modal */}
      {isQRISModalOpen && (
        <QRISModal
          total={total}
          transactionId={`TRX-${Date.now().toString().slice(-6)}`}
          storeProfile={storeProfile}
          onSuccess={(ref) => executeCheckout('QRIS', ref)}
          onCancel={() => setIsQRISModalOpen(false)}
        />
      )}

      {/* Thermal Receipt Modal */}
      {completedReceiptTx && (
        <ThermalReceiptModal
          transaction={completedReceiptTx}
          storeProfile={storeProfile}
          onClose={() => {
            setCompletedReceiptTx(null);
            setTimeout(focusCableScannerInput, 60);
          }}
        />
      )}
    </div>
  );
};
