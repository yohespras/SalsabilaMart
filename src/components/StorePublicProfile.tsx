import React, { useState } from 'react';
import {
  Store,
  MapPin,
  Phone,
  Clock,
  LogIn,
  Search,
  ShieldCheck,
  CreditCard,
  Printer,
  Sparkles,
  Sun,
  Moon,
  Barcode,
  FileSpreadsheet,
  Globe,
  HardDrive,
} from 'lucide-react';
import { Product, StoreProfile } from '../types';
import { formatRupiah } from '../services/storage';
import { PWAInstallButton } from './PWAInstallButton';

interface StorePublicProfileProps {
  storeProfile: StoreProfile;
  products: Product[];
  onOpenLogin: () => void;
  isDark: boolean;
  onToggleDark: () => void;
  onOpenOnlineGuide?: () => void;
}

export const StorePublicProfile: React.FC<StorePublicProfileProps> = ({
  storeProfile,
  products,
  onOpenLogin,
  isDark,
  onToggleDark,
  onOpenOnlineGuide,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');

  const categories = ['Semua', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors ${
        isDark ? 'bg-[#090d16] text-slate-100' : 'bg-slate-50/80 text-slate-800'
      }`}
    >
      {/* Top Banner Announcement */}
      <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white py-2 px-4 text-xs font-semibold text-center flex items-center justify-between shadow-xs">
        <div className="flex items-center justify-center gap-2 mx-auto">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          <span>Portal Resmi {storeProfile.name} • Sistem Kasir & Inventaris Toko Siap Melayani Pelanggan</span>
        </div>
        {/* Dark/Light mode toggle */}
        <button
          onClick={onToggleDark}
          className="p-1 px-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all cursor-pointer text-xs flex items-center gap-1.5 shrink-0"
          title="Ganti Tema Gelap / Terang"
        >
          {isDark ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline font-bold">{isDark ? 'Terang' : 'Gelap'}</span>
        </button>
      </div>

      {/* Main Header / Hero Section */}
      <header
        className={`border-b transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800/80 shadow-md' : 'bg-white border-slate-200/90 shadow-xs'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            {/* Store Identity */}
            <div className="flex items-start gap-5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-emerald-600/25 shrink-0 border border-white/20">
                <Store className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1
                    className={`text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {storeProfile.name}
                  </h1>
                  <span className="bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 text-xs px-3 py-0.5 rounded-full font-black uppercase tracking-wider">
                    BUKA
                  </span>
                </div>
                <p
                  className={`text-sm font-medium ${
                    isDark ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  {storeProfile.tagline}
                </p>
                {/* Location & Contact Meta */}
                <div
                  className={`flex flex-wrap items-center gap-y-2 gap-x-5 text-xs pt-1 ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{storeProfile.address}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>{storeProfile.operatingHours}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>{storeProfile.phone}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Login Entry Card */}
            <div
              className={`p-6 rounded-3xl border shadow-xl max-w-sm w-full flex flex-col justify-between transition-all ${
                isDark
                  ? 'bg-slate-850/90 border-slate-750 shadow-black/40'
                  : 'bg-white border-slate-200/90 shadow-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Portal Karyawan & Kasir</span>
                </div>
                <h3 className={`text-base font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Masuk ke Sistem Kasir
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Buka mesin kasir POS, cek stok inventaris toko, dan cetak struk penjualan.
                </p>
              </div>
              <div className="mt-5 space-y-2">
                <button
                  onClick={onOpenLogin}
                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Masuk Sistem (Login)</span>
                </button>
                {/* In-app install button */}
                <PWAInstallButton variant="hero" isDark={isDark} />
                {onOpenOnlineGuide && (
                  <button
                    onClick={onOpenOnlineGuide}
                    className={`w-full py-2.5 px-4 font-bold text-xs rounded-2xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isDark
                        ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 shadow-2xs'
                    }`}
                  >
                    <HardDrive className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span>Gunakan Tanpa Hosting (Lokal & PWA)</span>
                  </button>
                )}
                <p className="text-[10px] text-center text-slate-400">
                  Didukung login PIN Kasir offline & Akun Toko mandiri
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Feature Highlights Pills */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div
            className={`p-4 rounded-2xl border flex items-center gap-3.5 transition-all ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/80 shadow-2xs'
            }`}
          >
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Struk Thermal ESC/POS
              </h4>
              <p className="text-[11px] text-slate-400">Cetak 58mm & 80mm</p>
            </div>
          </div>
          <div
            className={`p-4 rounded-2xl border flex items-center gap-3.5 transition-all ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/80 shadow-2xs'
            }`}
          >
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                QRIS & Tunai
              </h4>
              <p className="text-[11px] text-slate-400">Pembayaran Cepat</p>
            </div>
          </div>
          <div
            className={`p-4 rounded-2xl border flex items-center gap-3.5 transition-all ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/80 shadow-2xs'
            }`}
          >
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Scan Barcode Kamera
              </h4>
              <p className="text-[11px] text-slate-400">Pindai Laser Cepat</p>
            </div>
          </div>
          <div
            className={`p-4 rounded-2xl border flex items-center gap-3.5 transition-all ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/80 shadow-2xs'
            }`}
          >
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Cloud Google Sheets
              </h4>
              <p className="text-[11px] text-slate-400">Database Real-Time</p>
            </div>
          </div>
        </div>
      </section>

      {/* Public Catalog Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 flex-1 w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Katalog Produk & Cek Stok Toko
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Daftar harga dan ketersediaan barang di {storeProfile.name}
            </p>
          </div>
          {/* Search bar */}
          <div className="relative min-w-[240px] sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari barang atau barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-3 py-2 text-xs rounded-xl border focus:outline-hidden focus:ring-1 focus:ring-emerald-500 ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500'
                  : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
              }`}
            />
          </div>
        </div>

        {/* Categories Pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : isDark
                  ? 'bg-slate-850 text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div
            className={`p-10 rounded-3xl border text-center space-y-3 ${
              isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200/80 shadow-2xs'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center mx-auto">
              <Barcode className="w-6 h-6" />
            </div>
            <h3 className={`font-black text-sm sm:text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Katalog Produk Belum Diinput
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Aplikasi siap digunakan dari awal (0 data). Silakan masuk ke sistem kasir untuk mulai menginput barang menggunakan mesin scanner barcode atau form inventaris.
            </p>
            <div className="pt-1">
              <button
                onClick={onOpenLogin}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl inline-flex items-center gap-2 cursor-pointer shadow-md"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk &amp; Mulai Input Barang</span>
              </button>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div
            className={`p-8 rounded-3xl border text-center text-xs text-slate-400 ${
              isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200/80'
            }`}
          >
            Tidak ada produk yang cocok dengan pencarian &quot;{searchQuery}&quot;.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredProducts.map((p) => {
              const isOutOfStock = p.stock <= 0;
              return (
                <div
                  key={p.id}
                  className={`p-4 rounded-2xl border flex flex-col justify-between text-left transition-all ${
                    isDark
                      ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700 shadow-sm'
                      : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-2xs hover:shadow-md'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-mono text-emerald-500 font-semibold">{p.barcode}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-medium uppercase ${
                          isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {p.category}
                      </span>
                    </div>
                    <h3
                      className={`font-bold text-xs mt-2 line-clamp-2 leading-snug ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {p.name}
                    </h3>
                  </div>
                  <div
                    className={`mt-4 pt-2.5 border-t flex items-center justify-between ${
                      isDark ? 'border-slate-800' : 'border-slate-100'
                    }`}
                  >
                    <div>
                      <div
                        className={`text-sm font-black font-mono tracking-tight ${
                          isDark ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {formatRupiah(p.price)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Stok:{' '}
                        <span className={isOutOfStock ? 'text-rose-500 font-bold' : 'font-semibold'}>
                          {isOutOfStock ? 'Habis' : `${p.stock} ${p.unit}`}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isOutOfStock ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        className={`border-t py-6 text-center text-xs text-slate-400 ${
          isDark ? 'bg-slate-950 border-slate-800/80' : 'bg-white border-slate-200'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            © {new Date().getFullYear()} {storeProfile.name}. Semua hak dilindungi.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={onOpenLogin}
              className="text-emerald-500 hover:text-emerald-400 font-bold cursor-pointer"
            >
              Masuk Kasir Toko →
            </button>
          </div>
        </div>
      </footer>
      {/* Mobile Floating PWA Install Bar */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 z-40">
        <PWAInstallButton variant="hero" isDark={isDark} />
      </div>
    </div>
  );
};
