import React from 'react';
import {
  DollarSign,
  ShoppingCart,
  Boxes,
  AlertTriangle,
  TrendingUp,
  QrCode,
  Printer,
  ChevronRight,
  FileSpreadsheet,
  Download,
  Calendar,
  Award,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  Cloud,
} from 'lucide-react';
import { Product, StoreProfile, Transaction, UserRole } from '../types';
import { formatRupiah, getLocalDateString } from '../services/storage';
import { SyncModalInitialMode } from './SheetsSyncModal';

interface DashboardProps {
  products: Product[];
  transactions: Transaction[];
  storeProfile: StoreProfile;
  userRole: UserRole;
  onNavigateToPOS: () => void;
  onNavigateToInventory?: () => void;
  onNavigateToSheets?: () => void;
  onOpenLowStock: () => void;
  onSelectReceipt: (tx: Transaction) => void;
  onExportPDF: () => void;
  isSheetsConnected: boolean;
  isCloudSynced?: boolean;
  onConnectCloud?: () => void;
  lastSyncedAt?: string;
  pendingSyncCount?: number;
  onSyncPending?: () => void;
  onOpenSyncModal?: (mode?: SyncModalInitialMode) => void;
  isSyncingSheets?: boolean;
  isDark?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  products,
  transactions,
  storeProfile,
  userRole,
  onNavigateToPOS,
  onNavigateToInventory,
  onNavigateToSheets,
  onOpenLowStock,
  onSelectReceipt,
  onExportPDF,
  isSheetsConnected,
  isCloudSynced = false,
  onConnectCloud,
  lastSyncedAt,
  pendingSyncCount = 0,
  onSyncPending,
  onOpenSyncModal,
  isSyncingSheets = false,
  isDark = false,
}) => {
  const isAdmin = userRole === 'admin';

  // Calculate today's stats using local device timezone (WIB/WITA/WIT)
  const todayStr = getLocalDateString();
  const todayTransactions = transactions.filter((t) => getLocalDateString(t.date) === todayStr);
  const todayOmset = todayTransactions.reduce((acc, t) => acc + t.total, 0);
  const todayHPP = todayTransactions.reduce((acc, t) => {
    return acc + t.items.reduce((sum, item) => sum + (item.costPrice || 0) * item.quantity, 0);
  }, 0);
  const todayGrossProfit = todayOmset - todayHPP;
  const marginPct = todayOmset > 0 ? Math.round((todayGrossProfit / todayOmset) * 100) : 0;

  const tunaiTrx = todayTransactions.filter((t) => t.paymentMethod === 'TUNAI');
  const qrisTrx = todayTransactions.filter((t) => t.paymentMethod === 'QRIS');
  const tunaiTotal = tunaiTrx.reduce((acc, t) => acc + t.total, 0);
  const qrisTotal = qrisTrx.reduce((acc, t) => acc + t.total, 0);

  const lowStockItems = products.filter((p) => p.stock <= p.minStock);
  const outOfStockItems = products.filter((p) => p.stock <= 0);

  // Top selling products today
  const itemSalesMap: Record<string, { name: string; qty: number; revenue: number }> = {};
  todayTransactions.forEach((trx) => {
    trx.items.forEach((item) => {
      if (!itemSalesMap[item.productId]) {
        itemSalesMap[item.productId] = { name: item.name, qty: 0, revenue: 0 };
      }
      itemSalesMap[item.productId].qty += item.quantity;
      itemSalesMap[item.productId].revenue += item.subtotal;
    });
  });

  const topProducts = Object.values(itemSalesMap)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const tunaiPct = todayOmset > 0 ? Math.round((tunaiTotal / todayOmset) * 100) : 0;
  const qrisPct = todayOmset > 0 ? Math.round((qrisTotal / todayOmset) * 100) : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Executive Welcome Hero Header */}
      <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white shadow-xl overflow-hidden border border-emerald-900/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] tracking-wide uppercase font-black">
                {isAdmin ? 'Pusat Kontrol Eksekutif' : 'Shift Kasir Aktif'}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] tracking-wide font-bold flex items-center gap-1 border ${
                  isCloudSynced
                    ? 'bg-teal-500/20 text-teal-200 border-teal-400/30'
                    : 'bg-amber-500/20 text-amber-200 border-amber-400/30'
                }`}
              >
                <Cloud className="w-3 h-3" />
                <span>
                  {isCloudSynced
                    ? 'Sinkron Multi-Perangkat Aktif'
                    : 'Mode Lokal Perangkat Ini'}
                </span>
              </span>
              <span className="text-slate-500 hidden sm:inline">•</span>
              <span className="text-slate-300 flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                {new Date().toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {storeProfile.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Pantauan performa penjualan, ketersediaan inventaris otomatis, serta sinkronisasi data real-time lintas perangkat &amp; Google Sheets.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {products.length === 0 && onNavigateToInventory ? (
              <button
                onClick={onNavigateToInventory}
                className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-xs rounded-2xl shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 cursor-pointer transform hover:-translate-y-0.5"
              >
                <Boxes className="w-4 h-4 text-slate-950" />
                <span>Mulai Input Barang (Inventaris)</span>
              </button>
            ) : (
              <button
                onClick={onNavigateToPOS}
                className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 font-black text-xs rounded-2xl shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 cursor-pointer transform hover:-translate-y-0.5"
              >
                <ShoppingCart className="w-4 h-4 text-slate-950" />
                <span>Buka Mesin Kasir (POS)</span>
              </button>
            )}
            {!isCloudSynced && onConnectCloud && (
              <button
                onClick={onConnectCloud}
                className="px-4 py-3 bg-blue-500/25 hover:bg-blue-500/35 text-blue-100 font-bold text-xs rounded-2xl border border-blue-400/40 transition-all flex items-center gap-2 cursor-pointer backdrop-blur-xs active:scale-95"
                title="Hubungkan Akun Google agar data produk & transaksi sama saat login di HP/Laptop lain"
              >
                <Cloud className="w-4 h-4 text-blue-300" />
                <span>Sinkron Perangkat Lain</span>
              </button>
            )}
            {isAdmin && onOpenSyncModal && (
              <button
                onClick={() => onOpenSyncModal('hub')}
                disabled={isSyncingSheets}
                className="px-4 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 font-bold text-xs rounded-2xl border border-emerald-400/30 transition-all flex items-center gap-2 cursor-pointer backdrop-blur-xs active:scale-95"
              >
                <RefreshCw className={`w-4 h-4 text-emerald-300 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                <span>Sinkron Spreadsheets</span>
              </button>
            )}
            {isAdmin && (
              <button
                onClick={onExportPDF}
                className="px-4 py-3 bg-white/10 hover:bg-white/15 text-white font-bold text-xs rounded-2xl border border-white/15 transition-all flex items-center gap-2 cursor-pointer backdrop-blur-xs active:scale-95"
              >
                <Download className="w-4 h-4 text-emerald-300" />
                <span>Ekspor Laporan PDF</span>
              </button>
            )}
          </div>
        </div>
        {/* Subtle background glow */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Omset Hari Ini */}
        <div
          className={`p-5 rounded-3xl border transition-all shadow-sm ${
            isDark
              ? 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/50'
              : 'bg-white border-slate-200/90 hover:border-emerald-500/50 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Omset Hari Ini
            </span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className={`text-2xl font-black font-mono tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {formatRupiah(todayOmset)}
            </h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <span className="font-semibold text-emerald-500">{todayTransactions.length}</span> transaksi sukses hari ini
            </p>
          </div>
        </div>

        {/* Card 2: Estimasi Laba Kotor */}
        <div
          className={`p-5 rounded-3xl border transition-all shadow-sm ${
            isDark
              ? 'bg-slate-900/90 border-slate-800 hover:border-blue-500/50'
              : 'bg-white border-slate-200/90 hover:border-blue-500/50 hover:shadow-md'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Estimasi Laba Kotor
            </span>
            <div className="w-9 h-9 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className={`text-2xl font-black font-mono tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {formatRupiah(todayGrossProfit)}
            </h3>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="bg-blue-500/15 text-blue-400 text-[10px] font-black px-1.5 py-0.2 rounded-md">
                {marginPct}% Margin
              </span>
              <span>setelah HPP Modal</span>
            </p>
          </div>
        </div>

        {/* Card 3: Peringatan Stok Menipis */}
        <div
          onClick={onOpenLowStock}
          className={`p-5 rounded-3xl border transition-all cursor-pointer shadow-sm ${
            lowStockItems.length > 0
              ? 'border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10'
              : isDark
              ? 'bg-slate-900/90 border-slate-800'
              : 'bg-white border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Stok Kritis / Habis
            </span>
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold ${
                lowStockItems.length > 0
                  ? 'bg-amber-500/20 text-amber-500 animate-pulse'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className={`text-2xl font-black tracking-tight ${lowStockItems.length > 0 ? 'text-amber-500' : isDark ? 'text-white' : 'text-slate-900'}`}>
              {lowStockItems.length} <span className="text-sm font-medium text-slate-400">Barang</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {outOfStockItems.length > 0 ? (
                <span className="text-rose-500 font-bold">{outOfStockItems.length} barang habis total</span>
              ) : (
                `Total ${products.length} produk terdaftar`
              )}
            </p>
          </div>
        </div>

        {/* Card 4: Status Database Google Sheets & Sync */}
        <div
          className={`p-5 rounded-3xl border transition-all shadow-sm ${
            pendingSyncCount > 0
              ? 'border-amber-500/40 bg-amber-500/5'
              : isDark
              ? 'bg-slate-900/90 border-slate-800'
              : 'bg-white border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Database Sheets
            </span>
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold ${
                pendingSyncCount > 0
                  ? 'bg-amber-500/20 text-amber-500 animate-pulse'
                  : isSheetsConnected
                  ? 'bg-emerald-500/15 text-emerald-500'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}
            >
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  pendingSyncCount > 0
                    ? 'bg-amber-500 animate-ping'
                    : isSheetsConnected
                    ? 'bg-emerald-500'
                    : 'bg-slate-400'
                }`}
              />
              <h3 className={`text-base font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {pendingSyncCount > 0
                  ? `${pendingSyncCount} Data Tertunda`
                  : isSheetsConnected
                  ? 'Terhubung Sheets'
                  : isCloudSynced
                  ? 'Cloud Aktif'
                  : 'Lokal / Offline'}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {pendingSyncCount > 0
                ? 'Transaksi offline siap dikirim ke Google Sheets'
                : isSheetsConnected
                ? lastSyncedAt
                  ? `Sinkron terakhir: ${new Date(lastSyncedAt).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : 'Siap sinkron 2 arah (Kirim / Tarik Sheet)'
                : 'Hubungkan agar laporan tercatat di Sheets'}
            </p>
            {pendingSyncCount > 0 && onSyncPending ? (
              <div className="mt-2.5 flex items-center gap-1.5">
                <button
                  onClick={onSyncPending}
                  disabled={isSyncingSheets}
                  className="flex-1 py-1.5 px-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-[11px] rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs active:scale-98"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncingSheets ? 'animate-spin' : ''}`} />
                  <span>{isSyncingSheets ? 'Sinkron...' : `Kirim (${pendingSyncCount})`}</span>
                </button>
                {onOpenSyncModal && (
                  <button
                    onClick={() => onOpenSyncModal('hub')}
                    disabled={isSyncingSheets}
                    className="py-1.5 px-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                    title="Opsi Sinkronisasi Penuh 2 Arah"
                  >
                    2 Arah
                  </button>
                )}
              </div>
            ) : isSheetsConnected && onOpenSyncModal ? (
              <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => onOpenSyncModal('confirm-push')}
                  disabled={isSyncingSheets}
                  className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                  title="Kirim kondisi Dashboard & Transaksi saat ini ke Google Sheets"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Ke Sheet</span>
                </button>
                <button
                  onClick={() => onOpenSyncModal('confirm-pull')}
                  disabled={isSyncingSheets}
                  className="py-1.5 px-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                  title="Tarik data Transaksi & Produk dari Google Sheets ke Dashboard"
                >
                  <DownloadCloud className="w-3.5 h-3.5" />
                  <span>Dari Sheet</span>
                </button>
              </div>
            ) : onNavigateToSheets ? (
              <button
                onClick={onNavigateToSheets}
                className="mt-2.5 w-full py-1.5 px-3 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-500 border border-emerald-500/30 font-bold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Hubungkan Sheets</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Analytics & Top Selling Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Payment Split Distribution */}
        <div
          className={`lg:col-span-5 p-6 rounded-3xl border shadow-sm ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
          }`}
        >
          <h3 className={`font-black text-sm uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Metode Penerimaan Hari Ini
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Perbandingan transaksi Tunai (Cash) vs QRIS Digital
          </p>
          <div className="mt-6 space-y-4">
            <div>
              <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                <span className="flex items-center gap-1.5 text-emerald-500">
                  <DollarSign className="w-4 h-4" /> Tunai ({tunaiTrx.length} Trx)
                </span>
                <span className="font-mono">{formatRupiah(tunaiTotal)} ({tunaiPct}%)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${tunaiPct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                <span className="flex items-center gap-1.5 text-blue-500">
                  <QrCode className="w-4 h-4" /> QRIS Digital ({qrisTrx.length} Trx)
                </span>
                <span className="font-mono">{formatRupiah(qrisTotal)} ({qrisPct}%)</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${qrisPct}%` }}
                />
              </div>
            </div>
          </div>
          <div
            className={`mt-6 p-4 rounded-2xl border flex items-center justify-between text-xs ${
              isDark ? 'bg-slate-800/60 border-slate-750' : 'bg-slate-50 border-slate-200/80'
            }`}
          >
            <span className="text-slate-400">Total Omset Kasir Hari Ini</span>
            <span className="text-sm font-black font-mono text-emerald-500">
              {formatRupiah(todayOmset)}
            </span>
          </div>
        </div>

        {/* Top Products Ranking */}
        <div
          className={`lg:col-span-7 p-6 rounded-3xl border shadow-sm ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`font-black text-sm uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Produk Terlaris Hari Ini
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                5 produk dengan volume penjualan tertinggi
              </p>
            </div>
            <Award className="w-5 h-5 text-amber-500" />
          </div>
          <div className="mt-4 space-y-2.5">
            {topProducts.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center italic">
                Belum ada transaksi penjualan hari ini.
              </p>
            ) : (
              topProducts.map((p, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                    isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50/70 border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                        idx === 0
                          ? 'bg-amber-500 text-slate-950'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-900'
                          : idx === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="font-bold text-xs truncate max-w-[220px]">{p.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-emerald-500">{p.qty} terjual</span>
                    <span className="text-[11px] text-slate-400 block font-mono">
                      {formatRupiah(p.revenue)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div
        className={`p-6 rounded-3xl border shadow-sm ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 className={`font-black text-sm uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Riwayat Transaksi Terakhir ({transactions.length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Daftar struk penjualan kasir terbaru
            </p>
          </div>
          <div className="flex items-center gap-3">
            {onNavigateToInventory && products.length === 0 && (
              <button
                onClick={onNavigateToInventory}
                className="text-xs font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1 cursor-pointer"
              >
                <span>Input Barang</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onNavigateToPOS}
              className="text-xs font-bold text-emerald-500 hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
            >
              <span>Buka Kasir</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr
                className={`border-b text-[10px] uppercase font-bold text-slate-400 tracking-wider ${
                  isDark ? 'border-slate-800' : 'border-slate-100'
                }`}
              >
                <th className="pb-3">No. Trx</th>
                <th className="pb-3">Waktu</th>
                <th className="pb-3">Kasir</th>
                <th className="pb-3">Item</th>
                <th className="pb-3">Metode</th>
                <th className="pb-3 text-right">Total</th>
                <th className="pb-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <div className="space-y-1.5 max-w-md mx-auto">
                      <p className="font-bold text-xs">
                        Belum ada transaksi penjualan tercatat.
                      </p>
                      <p className="text-[11px]">
                        {products.length === 0
                          ? 'Silakan tambahkan daftar barang & stok terlebih dahulu di menu Inventaris / Scan Barcode, lalu mulai melayani transaksi di Mesin Kasir.'
                          : 'Toko siap digunakan! Buka Mesin Kasir (POS) atau menu Scan Barcode untuk mencatat penjualan pertama.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.slice(0, 8).map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 font-mono font-bold text-emerald-500">{tx.id}</td>
                    <td className="py-3 text-slate-400">
                      {new Date(tx.date).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 font-medium">{tx.cashierName}</td>
                    <td className="py-3 text-slate-400">
                      {tx.items.length} macam ({tx.items.reduce((s, i) => s + i.quantity, 0)} pcs)
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          tx.paymentMethod === 'TUNAI'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-blue-500/15 text-blue-400'
                        }`}
                      >
                        {tx.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 text-right font-bold font-mono">
                      {formatRupiah(tx.total)}
                    </td>
                    <td className="py-3 text-center">
                      <button
                        onClick={() => onSelectReceipt(tx)}
                        className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="Lihat & Cetak Struk Thermal"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
