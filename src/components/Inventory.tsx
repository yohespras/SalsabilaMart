import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Barcode,
  PackagePlus,
  Camera,
  CheckCircle,
  Download,
  Tag,
  Zap,
  ScanLine,
  Upload,
  RefreshCw,
  Shuffle,
  ImageIcon,
  Sparkles,
  Cable,
  AlertCircle,
} from 'lucide-react';
import { Product, StoreProfile, UserRole } from '../types';
import { formatRupiah } from '../services/storage';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { BarcodeDownloadModal } from './BarcodeDownloadModal';
import {
  downloadBarcodeImageFile,
  playBarcodeBeep,
} from '../services/barcodeGenerator';
import { decodeBarcodeFromImageFile } from '../services/barcodeDecoder';
import {
  useHardwareBarcodeScanner,
  matchProductBarcode,
  cleanBarcodeString,
  useWindowFocusStatus,
} from '../services/hardwareScanner';

interface InventoryProps {
  products: Product[];
  userRole: UserRole;
  storeProfile?: StoreProfile;
  onAddProduct: (product: Omit<Product, 'id' | 'updatedAt'>) => Product | void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onQuickRestock: (productId: string, addQty: number) => void;
  isDark?: boolean;
}

export const Inventory: React.FC<InventoryProps> = ({
  products,
  userRole,
  storeProfile = {
    name: 'Salsabila Mart',
    tagline: 'Kasir Pintar & Toko Kelontong Modern',
    address: 'Indonesia',
    phone: '',
    email: 'salsabilamart684@gmail.com',
    operatingHours: '07:00 - 22:00',
    qrisNmid: '',
    receiptHeader: 'SALSABILA MART',
    receiptFooter: 'Terima kasih atas kunjungan Anda',
    paperSize: '58mm',
  },
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onQuickRestock,
  isDark = false,
}) => {
  const isAdmin = userRole === 'admin';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  // Modal form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Dedicated Barcode Scanning States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanPurpose, setScanPurpose] = useState<'quick_add' | 'form_barcode'>('quick_add');
  const [scannerInitialMode, setScannerInitialMode] = useState<'hardware' | 'upload' | 'camera'>('hardware');
  const [scannerNotification, setScannerNotification] = useState<string | null>(null);
  const [scannerPulse, setScannerPulse] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { isWindowFocused, activateScannerFocus } = useWindowFocusStatus();

  // Download Barcode Modal State
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [selectedProductForDownload, setSelectedProductForDownload] = useState<Product | null>(null);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  // Direct Image Decode in Form
  const formFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDecodingFormImage, setIsDecodingFormImage] = useState(false);

  // Form Fields (using string for numeric inputs to allow clean typing and backspacing)
  const [formBarcode, setFormBarcode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Sembako');
  const [formPrice, setFormPrice] = useState('10000');
  const [formCostPrice, setFormCostPrice] = useState('8000');
  const [formStock, setFormStock] = useState('20');
  const [formMinStock, setFormMinStock] = useState('5');
  const [formUnit, setFormUnit] = useState('pcs');

  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  const triggerPulse = () => {
    setScannerPulse(true);
    setTimeout(() => setScannerPulse(false), 600);
  };

  // Hardware Scanner Hook for Inventory Screen
  useHardwareBarcodeScanner({
    enabled: !isScannerOpen && !isDownloadModalOpen,
    minLength: 3,
    onScan: (scannedCode) => {
      triggerPulse();
      const clean = cleanBarcodeString(scannedCode);
      if (!clean) return;

      playBarcodeBeep();

      if (isFormOpen) {
        // Form is currently open: fill the barcode field and focus the Name input!
        setFormBarcode(clean);
        setScannerNotification(`⚡ Barcode "${clean}" berhasil ditangkap mesin scanner!`);
        setTimeout(() => setScannerNotification(null), 3000);

        // Check if barcode already exists on another product
        const other = products.find(
          (p) =>
            p.barcode.toLowerCase() === clean.toLowerCase() &&
            (!editingProduct || p.id !== editingProduct.id)
        );
        if (other) {
          setScannerNotification(
            `⚠️ Perhatian: Barcode "${clean}" sudah digunakan oleh barang "${other.name}".`
          );
        }

        setTimeout(() => {
          nameInputRef.current?.focus();
        }, 100);
      } else {
        // Table view: look up or auto open add modal
        handleGlobalBarcodeScanned(clean);
      }
    },
  });

  const categories = ['Semua', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
    let matchesStock = true;
    if (stockFilter === 'low') matchesStock = p.stock <= p.minStock && p.stock > 0;
    if (stockFilter === 'out') matchesStock = p.stock <= 0;
    return matchesSearch && matchesCategory && matchesStock;
  });

  // Financial summary of inventory
  const totalStockUnits = products.reduce((sum, p) => sum + p.stock, 0);
  const totalAssetCost = products.reduce((sum, p) => sum + (p.costPrice || 0) * p.stock, 0);
  const totalAssetValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);
  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;

  const handleOpenAddModal = (initialBarcode = '') => {
    setEditingProduct(null);
    setFormError(null);
    // Keep empty when opened manually so wired USB barcode scanner fills ONLY the scanned code cleanly!
    setFormBarcode(initialBarcode);
    setFormName('');
    setFormCategory('Sembako');
    setFormPrice('10000');
    setFormCostPrice('8000');
    setFormStock('20');
    setFormMinStock('5');
    setFormUnit('pcs');
    setIsFormOpen(true);

    setTimeout(() => {
      if (initialBarcode) {
        nameInputRef.current?.focus();
      } else {
        barcodeInputRef.current?.focus();
      }
    }, 120);
  };

  const handleOpenEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setFormError(null);
    setFormBarcode(prod.barcode);
    setFormName(prod.name);
    setFormCategory(prod.category);
    setFormPrice(String(prod.price));
    setFormCostPrice(String(prod.costPrice || 0));
    setFormStock(String(prod.stock));
    setFormMinStock(String(prod.minStock));
    setFormUnit(prod.unit);
    setIsFormOpen(true);
  };

  const handleGlobalBarcodeScanned = (scannedCode: string) => {
    const clean = cleanBarcodeString(scannedCode);
    if (!clean) return;

    const existing = matchProductBarcode(products, clean);

    if (existing) {
      setScannerNotification(
        `✅ Barcode "${clean}" cocok dengan "${existing.name}" (Stok: ${existing.stock} ${existing.unit})! Membuka data barang...`
      );
      setTimeout(() => setScannerNotification(null), 3500);
      handleOpenEditModal(existing);
    } else {
      setScannerNotification(
        `✨ Barcode baru "${clean}" dideteksi! Membuka form tambah barang...`
      );
      setTimeout(() => setScannerNotification(null), 3500);
      handleOpenAddModal(clean);
    }
  };

  const handleBarcodeDetected = (scannedCode: string) => {
    const clean = cleanBarcodeString(scannedCode);
    if (!clean) return;

    playBarcodeBeep();

    if (scanPurpose === 'form_barcode') {
      setFormBarcode(clean);
      setIsScannerOpen(false);
      setScannerNotification(`Kode barcode "${clean}" berhasil diinput ke form!`);
      setTimeout(() => setScannerNotification(null), 3000);
      setTimeout(() => nameInputRef.current?.focus(), 150);
      return;
    }

    // Quick Add Mode from header button
    setIsScannerOpen(false);
    handleGlobalBarcodeScanned(clean);
  };

  // Decode barcode from image file inside the form modal
  const handleFormImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsDecodingFormImage(true);
    setFormError(null);
    try {
      const code = await decodeBarcodeFromImageFile(file);
      if (code) {
        playBarcodeBeep();
        setFormBarcode(code);
        setScannerNotification(`⚡ Barcode "${code}" berhasil dibaca dari foto!`);
        setTimeout(() => setScannerNotification(null), 3000);
        setTimeout(() => nameInputRef.current?.focus(), 150);
      }
    } catch (err: any) {
      setFormError(
        err.message ||
          'Barcode tidak terbaca pada gambar. Pastikan gambar jelas dan garis barcode terlihat utuh.'
      );
    } finally {
      setIsDecodingFormImage(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formBarcode.trim()) {
      setFormError('Kode barcode wajib diisi! Silakan tembak mesin scanner kabel atau klik Kode Acak.');
      barcodeInputRef.current?.focus();
      return;
    }
    if (!formName.trim()) {
      setFormError('Nama barang wajib diisi!');
      nameInputRef.current?.focus();
      return;
    }

    const priceNum = parseFloat(formPrice) || 0;
    const costPriceNum = parseFloat(formCostPrice) || 0;
    const stockNum = parseInt(formStock, 10) || 0;
    const minStockNum = parseInt(formMinStock, 10) || 1;

    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        barcode: formBarcode.trim(),
        name: formName.trim(),
        category: formCategory.trim() || 'Umum',
        price: priceNum,
        costPrice: costPriceNum,
        stock: stockNum,
        minStock: minStockNum,
        unit: formUnit.trim() || 'pcs',
        updatedAt: new Date().toISOString(),
      });
      setScannerNotification(`✅ Perubahan barang "${formName.trim()}" berhasil disimpan!`);
    } else {
      onAddProduct({
        barcode: formBarcode.trim(),
        name: formName.trim(),
        category: formCategory.trim() || 'Umum',
        price: priceNum,
        costPrice: costPriceNum,
        stock: stockNum,
        minStock: minStockNum,
        unit: formUnit.trim() || 'pcs',
      });
      setScannerNotification(`🎉 Barang baru "${formName.trim()}" berhasil ditambahkan ke inventaris!`);
    }

    setTimeout(() => setScannerNotification(null), 3500);
    setIsFormOpen(false);
  };

  // Quick 1-click download of pure barcode image
  const handleQuickDownloadPureBarcode = (p: Product) => {
    downloadBarcodeImageFile(p, 'pure_barcode', storeProfile.name);
    setDownloadSuccessToast(`Gambar barcode "${p.name}" (${p.barcode}.png) berhasil diunduh!`);
    setTimeout(() => setDownloadSuccessToast(null), 3000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <div
        className={`p-6 sm:p-7 rounded-3xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
        }`}
      >
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Inventaris & Stok Toko
            </h1>
            <span
              className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                isAdmin
                  ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {isAdmin ? 'Akses Admin (Full)' : 'Akses Kasir (Bisa Input & Cek Stok)'}
            </span>
            {isWindowFocused ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 text-[10px] font-bold">
                <Cable className="w-3 h-3" />
                <span
                  className={`w-2 h-2 rounded-full transition-all ${
                    scannerPulse ? 'bg-amber-400 scale-150 animate-ping' : 'bg-emerald-400 animate-pulse'
                  }`}
                />
                Scanner Kabel USB Siap
              </span>
            ) : (
              <button
                type="button"
                onClick={() => activateScannerFocus()}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black cursor-pointer animate-pulse"
              >
                <Cable className="w-3 h-3" />
                <span>Klik Aktifkan Fokus Scanner Kabel</span>
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Input data barang otomatis: tembak mesin scanner barcode kabel (USB/OTG) kapan saja untuk tambah barang baru atau update stok.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Download Barcode Button */}
          <button
            onClick={() => {
              setSelectedProductForDownload(null);
              setIsDownloadModalOpen(true);
            }}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white rounded-2xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-all cursor-pointer shadow-xs"
            title="Download gambar barcode produk untuk dicetak atau disimpan"
          >
            <Barcode className="w-4 h-4 text-emerald-400" />
            <span>Download Gambar Barcode</span>
          </button>

          {/* Scan & Tambah Barang Button */}
          <button
            onClick={() => {
              setScanPurpose('quick_add');
              setScannerInitialMode('hardware');
              setIsScannerOpen(true);
            }}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm shadow-blue-600/30 transition-all cursor-pointer"
            title="Pindai barcode lewat mesin scanner USB/BT, unggah file foto, atau kamera HP"
          >
            <ScanLine className="w-4 h-4 text-blue-200" />
            <span>Scan & Tambah Barang</span>
          </button>

          {/* Tambah Manual Button */}
          <button
            onClick={() => handleOpenAddModal()}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-sm shadow-emerald-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Barang</span>
          </button>
        </div>
      </div>

      {/* Hardware Scanner Notification Banner */}
      {scannerNotification && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{scannerNotification}</span>
        </div>
      )}

      {/* Download Success Toast */}
      {downloadSuccessToast && (
        <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Download className="w-4 h-4 shrink-0 text-blue-400" />
          <span>{downloadSuccessToast}</span>
        </div>
      )}

      {/* Hardware Barcode Scanner Guide Tip Banner */}
      <div
        className={`p-3.5 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-emerald-50/50 border-emerald-200/60'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-500 shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-800 dark:text-slate-200">
              Input Data Barcode Otomatis: Tembak Scanner Kapan Saja
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Tembak scanner gun ke kemasan produk kapan saja. Jika belum terdaftar, form tambah barang langsung terbuka dengan barcode terisi otomatis dan kursor siap ketik nama barang!
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setScanPurpose('quick_add');
              setScannerInitialMode('upload');
              setIsScannerOpen(true);
            }}
            className="text-[11px] font-bold text-blue-500 hover:text-blue-400 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 cursor-pointer flex items-center gap-1"
          >
            <Upload className="w-3 h-3" />
            <span>Pindai Foto</span>
          </button>
          <span className="text-[10px] font-mono px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30">
            Scanner Gun Siap
          </span>
        </div>
      </div>

      {/* Summary Stat Pills */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className={`p-5 rounded-3xl border shadow-sm ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
          }`}
        >
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Jenis Produk
          </span>
          <div className={`text-2xl font-black mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {products.length} <span className="text-xs font-medium text-slate-400">SKU</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {totalStockUnits.toLocaleString('id-ID')} Total Unit Fisik
          </span>
        </div>
        <div
          className={`p-5 rounded-3xl border shadow-sm ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
          }`}
        >
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Modal Aset (HPP)
          </span>
          <div className={`text-2xl font-black font-mono tracking-tight mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {formatRupiah(totalAssetCost)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Total biaya pokok persediaan</span>
        </div>
        <div
          className={`p-5 rounded-3xl border shadow-sm ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
          }`}
        >
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Nilai Jual Inventaris
          </span>
          <div className="text-2xl font-black font-mono tracking-tight text-emerald-500 mt-1">
            {formatRupiah(totalAssetValue)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Estimasi potensi omset total
          </span>
        </div>
        <div
          className={`p-5 rounded-3xl border shadow-sm ${
            lowStockCount > 0
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-500'
              : isDark
              ? 'bg-slate-900/90 border-slate-800'
              : 'bg-white border-slate-200/90'
          }`}
        >
          <span className="text-xs font-bold uppercase tracking-wider">
            Stok Menipis / Kritis
          </span>
          <div className="text-2xl font-black mt-1">
            {lowStockCount} <span className="text-xs font-medium">Barang</span>
          </div>
          <span className="text-[11px] mt-1 block font-medium">
            {lowStockCount > 0 ? 'Perlu tindakan restock segera' : 'Semua stok dalam batas aman'}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className={`p-4 rounded-3xl border shadow-sm space-y-3 ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
        }`}
      >
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama barang, atau tembak / ketik barcode lalu tekan Enter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim().length >= 3) {
                  const raw = searchQuery.trim();
                  const exactMatch = matchProductBarcode(products, raw);
                  // If matches an existing barcode OR looks like a numeric/SKU barcode, open Edit/Add modal!
                  if (exactMatch || /^[0-9A-Za-z-_]{5,}$/.test(raw)) {
                    e.preventDefault();
                    setSearchQuery('');
                    handleGlobalBarcodeScanned(raw);
                  }
                }
              }}
              className={`w-full pl-10 pr-3 py-2.5 text-xs rounded-2xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                isDark
                  ? 'bg-slate-855 border-slate-700 text-white placeholder-slate-500'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>
          {/* Quick Stock Filters */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                stockFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 shadow-xs'
                  : isDark
                  ? 'bg-slate-800 text-slate-400 hover:text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({products.length})
            </button>
            <button
              onClick={() => setStockFilter('low')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                stockFilter === 'low'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : isDark
                  ? 'bg-slate-800 text-slate-400 hover:text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Stok Kritis ({products.filter((p) => p.stock <= p.minStock && p.stock > 0).length})
            </button>
            <button
              onClick={() => setStockFilter('out')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                stockFilter === 'out'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : isDark
                  ? 'bg-slate-800 text-slate-400 hover:text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Habis ({products.filter((p) => p.stock <= 0).length})
            </button>
          </div>
        </div>
        {/* Category Pills */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pt-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : isDark
                  ? 'bg-slate-855 text-slate-400 hover:text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Products Table */}
      <div
        className={`rounded-3xl border shadow-sm overflow-hidden ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr
                className={`border-b text-[10px] uppercase font-bold text-slate-400 tracking-wider ${
                  isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50/70'
                }`}
              >
                <th className="py-3.5 px-4">Barcode & Nama Produk</th>
                <th className="py-3.5 px-3">Kategori</th>
                <th className="py-3.5 px-3">Harga Jual</th>
                <th className="py-3.5 px-3">HPP Modal</th>
                <th className="py-3.5 px-3">Margin</th>
                <th className="py-3.5 px-3">Stok</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-3 text-center">Unduh Barcode</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Tidak ada produk yang cocok dengan pencarian atau filter yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isOutOfStock = p.stock <= 0;
                  const isLowStock = p.stock <= p.minStock && !isOutOfStock;
                  const marginRp = p.price - (p.costPrice || 0);
                  const marginPercent = p.price > 0 ? Math.round((marginRp / p.price) * 100) : 0;
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProductForDownload(p);
                              setIsDownloadModalOpen(true);
                            }}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-500/10 dark:bg-slate-800 dark:hover:bg-emerald-500/20 text-emerald-500 shrink-0 cursor-pointer transition-colors"
                            title="Klik untuk melihat dan download barcode barang ini"
                          >
                            <Barcode className="w-4 h-4" />
                          </button>
                          <div>
                            <div className="font-bold text-xs leading-snug">{p.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[10px] text-emerald-500 font-semibold">
                                {p.barcode}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-medium uppercase ${
                            isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 font-bold font-mono">
                        {formatRupiah(p.price)}
                      </td>
                      <td className="py-3.5 px-3 text-slate-400 font-mono">
                        {formatRupiah(p.costPrice || 0)}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="text-[11px] font-bold text-blue-500 font-mono">
                          +{marginPercent}%
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-black font-mono text-sm ${
                              isOutOfStock
                                ? 'text-rose-500'
                                : isLowStock
                                ? 'text-amber-500'
                                : isDark
                                ? 'text-white'
                                : 'text-slate-900'
                            }`}
                          >
                            {p.stock}
                          </span>
                          <span className="text-slate-400 text-[10px]">{p.unit}</span>
                          <span className="text-slate-400 text-[10px]">
                            (min: {p.minStock})
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        {isOutOfStock ? (
                          <span className="bg-rose-500/15 text-rose-500 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                            Habis
                          </span>
                        ) : isLowStock ? (
                          <span className="bg-amber-500/15 text-amber-500 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                            Kritis
                          </span>
                        ) : (
                          <span className="bg-emerald-500/15 text-emerald-500 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                            Aman
                          </span>
                        )}
                      </td>
                      {/* Unduh Barcode Column */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleQuickDownloadPureBarcode(p)}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                            title="Download Gambar Barcode Saja (.PNG)"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Gambar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProductForDownload(p);
                              setIsDownloadModalOpen(true);
                            }}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
                            title="Lihat Pilihan Download & Cetak Stiker"
                          >
                            <Tag className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onQuickRestock(p.id, 10)}
                            className="px-2 py-1 bg-slate-100 hover:bg-emerald-600 hover:text-white dark:bg-slate-800 dark:hover:bg-emerald-600 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                            title="Tambah +10 stok barang ini"
                          >
                            +10
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                            title="Edit data barang"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            confirmDeleteId === p.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteProduct(p.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                                >
                                  Hapus
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-1.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-[10px] cursor-pointer"
                                >
                                  Batal
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(p.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Hapus produk"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div
            className={`rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 border animate-in zoom-in-95 duration-150 my-6 ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <PackagePlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">
                    {editingProduct ? 'Edit Data Barang' : 'Tambah Barang Baru'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Bisa scan pakai mesin scanner USB/BT, upload foto, atau kamera
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 pt-4">
              {/* Scanner Ready Badge inside Modal */}
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[11px] font-semibold flex items-center gap-2">
                <Cable className="w-4 h-4 shrink-0" />
                <span>
                  Mesin Scanner Kabel Siap: Tembak barcode kemasan kapan saja, kode otomatis terisi bersih & kursor pindah ke Nama Barang!
                </span>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-500 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Barcode Input & Scanner Methods */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold block">
                    Barcode Produk *
                  </label>
                  {formBarcode && (
                    <button
                      type="button"
                      onClick={() => {
                        const tempProduct: Product = {
                          id: editingProduct?.id || 'temp',
                          barcode: formBarcode,
                          name: formName || 'Produk_Baru',
                          category: formCategory,
                          price: parseFloat(formPrice) || 0,
                          costPrice: parseFloat(formCostPrice) || 0,
                          stock: parseInt(formStock, 10) || 0,
                          minStock: parseInt(formMinStock, 10) || 1,
                          unit: formUnit,
                          updatedAt: new Date().toISOString(),
                        };
                        downloadBarcodeImageFile(tempProduct, 'pure_barcode', storeProfile.name);
                      }}
                      className="text-[11px] font-bold text-emerald-500 hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
                      title="Download gambar barcode untuk kode ini"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download Gambar Barcode</span>
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Barcode className="w-4 h-4 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    data-barcode-form-field="true"
                    autoComplete="off"
                    required
                    placeholder="Tembak mesin scanner kabel di sini, ketik manual, atau klik Kode Acak..."
                    value={formBarcode}
                    onChange={(e) => {
                      setFormBarcode(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) {
                        // Prevent form submit when scanner gun hits enter on the barcode input
                        e.preventDefault();
                        e.stopPropagation();
                        playBarcodeBeep();
                        nameInputRef.current?.focus();
                      }
                    }}
                    className={`w-full pl-9 pr-3 py-2 text-xs font-mono font-bold rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                </div>

                {/* Multiple Barcode Input Options Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-slate-400 font-semibold mr-0.5">Scan lewat:</span>

                  {/* 1. Mesin Scanner Gun Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setScanPurpose('form_barcode');
                      setScannerInitialMode('hardware');
                      setIsScannerOpen(true);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-500 text-[11px] font-bold cursor-pointer transition-colors"
                    title="Buka panduan & tes mesin scanner tembak USB/BT"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Mesin Scanner USB/BT</span>
                  </button>

                  {/* 2. Upload Image File Button */}
                  <button
                    type="button"
                    onClick={() => formFileInputRef.current?.click()}
                    disabled={isDecodingFormImage}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-500 text-[11px] font-bold cursor-pointer transition-colors"
                    title="Pilih gambar barcode dari galeri HP atau file laptop"
                  >
                    {isDecodingFormImage ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>{isDecodingFormImage ? 'Membaca Foto...' : 'Upload Foto Barcode'}</span>
                  </button>

                  {/* 3. Camera Scanner Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setScanPurpose('form_barcode');
                      setScannerInitialMode('camera');
                      setIsScannerOpen(true);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold cursor-pointer transition-colors"
                    title="Pindai barcode langsung via kamera HP"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Kamera HP</span>
                  </button>

                  {/* 4. Random Auto-generate Code */}
                  <button
                    type="button"
                    onClick={() => {
                      const randomCode = `${Math.floor(899000000000 + Math.random() * 99999999)}`;
                      setFormBarcode(randomCode);
                      setTimeout(() => nameInputRef.current?.focus(), 50);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 text-[11px] font-medium cursor-pointer transition-colors"
                    title="Buat kode barcode acak otomatis"
                  >
                    <Shuffle className="w-3 h-3" />
                    <span>Kode Acak</span>
                  </button>
                </div>

                {/* Hidden File Input for Direct Form Upload */}
                <input
                  ref={formFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFormImageUpload}
                  className="hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">
                  Nama Barang *
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  required
                  placeholder="Contoh: Minyak Goreng Bimoli 2L"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">Kategori</label>
                  <input
                    type="text"
                    required
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">Satuan (Unit)</label>
                  <input
                    type="text"
                    required
                    placeholder="pcs / pack / btl"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">
                    Harga Jual (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">
                    HPP Modal (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formCostPrice}
                    onChange={(e) => setFormCostPrice(e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-mono rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">
                    Stok Tersedia *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">
                    Batas Minimum Stok *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-mono rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/30 cursor-pointer"
                >
                  {editingProduct ? 'Simpan Perubahan' : 'Simpan Barang Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Multi-Mode Scanner Modal */}
      {isScannerOpen && (
        <BarcodeScannerModal
          products={products}
          onDetected={handleBarcodeDetected}
          onClose={() => setIsScannerOpen(false)}
          title={
            scanPurpose === 'quick_add'
              ? 'Pindai Barcode Tambah / Cari Barang'
              : 'Pindai Kode Barcode'
          }
          subtitle={
            scanPurpose === 'quick_add'
              ? 'Tembak mesin scanner USB/BT, unggah file foto dari galeri, atau pakai kamera HP'
              : 'Isi kode barcode ke formulir barang'
          }
          initialMode={scannerInitialMode}
        />
      )}

      {/* Barcode Download Modal */}
      {isDownloadModalOpen && (
        <BarcodeDownloadModal
          product={selectedProductForDownload}
          allProducts={products}
          storeProfile={storeProfile}
          isDark={isDark}
          onClose={() => {
            setIsDownloadModalOpen(false);
            setSelectedProductForDownload(null);
          }}
        />
      )}
    </div>
  );
};
