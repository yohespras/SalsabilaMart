import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Copy,
  Check,
  Smartphone,
  ExternalLink,
  Cloud,
  Server,
  Share2,
  Users,
  ShieldCheck,
  FileSpreadsheet,
  Zap,
  Wifi,
  WifiOff,
  HardDrive,
  Terminal,
  FolderArchive,
  Printer,
  CheckCircle2,
  Info,
  Sparkles,
  Download,
  FileJson,
  Upload,
  Laptop,
} from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { PWAInstallButton } from './PWAInstallButton';
import {
  downloadLocalDataBackupFile,
  downloadWindowsBatchRunner,
  downloadShellRunner,
  importAllLocalDataBackup,
} from '../services/storage';

interface OnlineGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
  initialTab?: 'tanpa-hosting' | 'hp' | 'sheets' | 'multi' | 'deploy';
}

export const OnlineGuideModal: React.FC<OnlineGuideModalProps> = ({
  isOpen,
  onClose,
  isDark = true,
  initialTab = 'tanpa-hosting',
}) => {
  const isOnline = useOnlineStatus();
  const [activeTab, setActiveTab] = useState<'tanpa-hosting' | 'hp' | 'sheets' | 'multi' | 'deploy'>(initialTab);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedBuildCmd, setCopiedBuildCmd] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [appUrl, setAppUrl] = useState<string>('');
  const [backupNotice, setBackupNotice] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = window.location.href;
      setAppUrl(url);

      QRCode.toDataURL(url, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((dataUrl) => {
          setQrCodeDataUrl(dataUrl);
        })
        .catch((err) => {
          console.error('Error generating QR code:', err);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl || window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyDeployConfig = (codeText: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopyBuildCmd = () => {
    navigator.clipboard.writeText('npm run build');
    setCopiedBuildCmd(true);
    setTimeout(() => setCopiedBuildCmd(false), 2500);
  };

  const handleDownloadBackup = () => {
    const ok = downloadLocalDataBackupFile();
    if (ok) {
      setBackupNotice('Cadangan data berhasil diunduh ke komputer/HP Anda (.json)!');
      setTimeout(() => setBackupNotice(null), 4000);
    }
  };

  const handleDownloadBatch = () => {
    const ok = downloadWindowsBatchRunner();
    if (ok) {
      setBackupNotice('File jalankan-kasir-lokal.bat berhasil diunduh!');
      setTimeout(() => setBackupNotice(null), 4000);
    }
  };

  const handleDownloadShell = () => {
    const ok = downloadShellRunner();
    if (ok) {
      setBackupNotice('File jalankan-kasir-lokal.sh berhasil diunduh!');
      setTimeout(() => setBackupNotice(null), 4000);
    }
  };

  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = importAllLocalDataBackup(content);
        if (result.success) {
          alert(`${result.message} Halaman akan disegarkan untuk memuat data.`);
          window.location.reload();
        } else {
          alert(result.message);
        }
      }
    };
    reader.readAsText(file);
  };

  const vercelConfig = `{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/80 backdrop-blur-md transition-all">
      <div
        className={`relative w-full max-w-4xl rounded-3xl border shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] ${
          isDark
            ? 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-black/80'
            : 'bg-white border-slate-200 text-slate-800 shadow-slate-900/20'
        }`}
      >
        {/* Header Banner */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-lg">
              <HardDrive className="w-6 h-6 text-emerald-200 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight">Solusi Kasir Tanpa Hosting & Mode Offline</h3>
                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1 ${
                    isOnline
                      ? 'bg-emerald-400 text-slate-950'
                      : 'bg-amber-400 text-slate-950'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-slate-950 animate-ping' : 'bg-slate-950'}`} />
                  {isOnline ? 'Online Siap' : 'Mode Offline Aktif'}
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 font-medium">
                Gunakan kasir 100% mandiri di toko tanpa biaya sewa hosting & tanpa server internet!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/25 text-white transition-all cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live URL & Status Bar Strip */}
        <div
          className={`px-6 py-3 border-b flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 ${
            isDark ? 'bg-slate-950/70 border-slate-800/80' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="relative flex h-3 w-3 shrink-0">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isOnline ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${
                  isOnline ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </span>
            <div className="min-w-0">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Status Sistem: {isOnline ? 'Terhubung (Lokal & Cloud Siap)' : '100% Offline (Data Aman di Memori Laptop/HP)'}
              </div>
              <div className="font-mono text-xs font-semibold truncate text-emerald-400">
                {appUrl || 'Sedang memuat link aplikasi...'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                copiedLink
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-2xs'
              }`}
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Tersalin!' : 'Salin Link'}</span>
            </button>
            <a
              href={appUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all cursor-pointer shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka Tab Baru</span>
            </a>
          </div>
        </div>

        {/* Action Toast Alert if triggered */}
        {backupNotice && (
          <div className="bg-emerald-600 text-white px-6 py-2.5 text-xs font-bold flex items-center justify-between shadow-md animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{backupNotice}</span>
            </div>
            <button onClick={() => setBackupNotice(null)} className="text-white hover:text-emerald-200 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div
          className={`flex border-b px-6 gap-2 overflow-x-auto shrink-0 ${
            isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50/50'
          }`}
        >
          <button
            onClick={() => setActiveTab('tanpa-hosting')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'tanpa-hosting'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-4 h-4 text-emerald-400" />
            <span>1. Cara Pakai Tanpa Hosting (Utama)</span>
            <span className="text-[9px] bg-emerald-500 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
              Gratis
            </span>
          </button>
          <button
            onClick={() => setActiveTab('hp')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'hp'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4 text-blue-400" />
            <span>2. Pasang di Layar HP (PWA)</span>
          </button>
          <button
            onClick={() => setActiveTab('sheets')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'sheets'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="w-4 h-4 text-teal-400" />
            <span>3. Cloud Gratis via Google Sheets</span>
          </button>
          <button
            onClick={() => setActiveTab('multi')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'multi'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4 text-purple-400" />
            <span>4. Pengaturan Akun & PIN Kasir</span>
          </button>
          <button
            onClick={() => setActiveTab('deploy')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'deploy'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-4 h-4 text-slate-400" />
            <span>5. Hosting Web Sendiri (Opsional)</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: CARA PAKAI TANPA HOSTING */}
          {activeTab === 'tanpa-hosting' && (
            <div className="space-y-6">
              {/* Highlight Hero */}
              <div
                className={`p-5 rounded-3xl border flex items-start gap-4 ${
                  isDark
                    ? 'bg-gradient-to-r from-emerald-950/40 to-teal-950/30 border-emerald-500/30 text-emerald-200'
                    : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 shadow-lg">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-base text-emerald-400">
                    Anda Tidak Perlu Membayar / Menyiapkan Hosting Sama Sekali!
                  </h4>
                  <p className="text-xs leading-relaxed opacity-95">
                    Aplikasi <strong>Salsabila Mart</strong> dibangun dengan teknologi <em>Offline-First Progressive Web App (PWA)</em>.
                    Seluruh program kasir, mesin scan barcode, kalkulasi harga, cetak struk thermal, dan database produk disimpan <strong>langsung di perangkat komputer / HP toko Anda</strong>.
                    Bebas biaya sewa server hosting, bebas domain bulanan, dan bebas kuota internet!
                  </p>
                </div>
              </div>

              {/* 3 Main Methods to Run Without Hosting */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Method 1: PWA */}
                <div
                  className={`p-5 rounded-3xl border flex flex-col justify-between transition-all ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full">
                        Paling Praktis
                      </span>
                    </div>
                    <h5 className="font-bold text-sm text-emerald-400">
                      Metode 1: Pasang di HP / Laptop (PWA)
                    </h5>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Cukup buka link kasir ini sekali di Chrome atau Edge, lalu klik tombol pasang. Aplikasi langsung menjadi ikon desktop/HP dan <strong>bisa dibuka kapan saja tanpa internet & tanpa hosting aktif</strong>.
                    </p>
                  </div>
                  <div className="pt-4">
                    <PWAInstallButton variant="hero" isDark={isDark} />
                  </div>
                </div>

                {/* Method 2: Local Windows Server */}
                <div
                  className={`p-5 rounded-3xl border flex flex-col justify-between transition-all ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400">
                        <Terminal className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                        Laptop Toko
                      </span>
                    </div>
                    <h5 className="font-bold text-sm text-blue-400">
                      Metode 2: Jalankan Lokal di PC Toko (.BAT)
                    </h5>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Jalankan langsung di laptop toko via file <code>.bat</code> otomatis. Klik ganda file runner, browser otomatis membuka kasir di <code>http://localhost:3000</code> secara offline.
                    </p>
                  </div>
                  <div className="pt-4 space-y-2">
                    <button
                      onClick={handleDownloadBatch}
                      className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh jalankan-kasir.bat</span>
                    </button>
                    <button
                      onClick={handleDownloadShell}
                      className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                    >
                      <Terminal className="w-3 h-3 text-slate-400" />
                      <span>Unduh Script Linux / Mac (.sh)</span>
                    </button>
                  </div>
                </div>

                {/* Method 3: Local Backup & USB Flashdisk */}
                <div
                  className={`p-5 rounded-3xl border flex flex-col justify-between transition-all ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                        <FileJson className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                        Pencadangan
                      </span>
                    </div>
                    <h5 className="font-bold text-sm text-amber-400">
                      Metode 3: Simpan Data ke Flashdisk
                    </h5>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Semua transaksi, harga, dan stok ada di memori internal browser. Anda bisa mengunduh file cadangan (.json) kapan saja untuk disimpan di flashdisk atau dipindah ke laptop kasir lain.
                    </p>
                  </div>
                  <div className="pt-4 space-y-2">
                    <button
                      onClick={handleDownloadBackup}
                      className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh Cadangan (.json)</span>
                    </button>
                    <label className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[11px] font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700">
                      <Upload className="w-3 h-3 text-amber-400" />
                      <span>Pulihkan dari File Backup</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleFileRestore}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Detailed Explanation: Step-by-Step for Store Owner */}
              <div
                className={`p-5 rounded-3xl border space-y-4 ${
                  isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Panduan Langkah Demi Langkah Menggunakan Kasir Tanpa Hosting:</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-1.5">
                    <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[11px]">1</span>
                      Login Cukup Pakai PIN / Akun Kasir
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      Anda tidak perlu login Google atau Firebase yang memicu error unauthorized-domain. Cukup gunakan <strong>Nama Akun & PIN</strong> yang sudah tersedia atau daftarkan akun kasir baru. Berjalan 100% offline!
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-1.5">
                    <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[11px]">2</span>
                      Scan Barcode & Printer Thermal Berfungsi Normal
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      Kamera scanner barcode produk dan cetak struk thermal 58mm/80mm berjalan langsung di peramban browser perangkat kasir tanpa mengirim request ke server hosting.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-1.5">
                    <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[11px]">3</span>
                      Data Stok & Laporan Tersimpan Aman
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      Pengurangan stok otomatis setiap ada transaksi, riwayat penjualan, keuntungan bersih, dan modal modal kasir dicatat langsung di LocalStorage browser perangkat toko.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-1.5">
                    <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[11px]">4</span>
                      Sinkronisasi Google Sheets Kapan Saja (Gratis)
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      Jika suatu saat Anda menyambungkan HP/laptop ke WiFi atau tethering seluler, seluruh transaksi kasir yang tertunda dapat langsung disinkronkan ke Google Sheets pemilik toko secara gratis.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BUKA & PASANG DI HP */}
          {activeTab === 'hp' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* QR Code Section */}
              <div
                className={`md:col-span-5 p-5 rounded-2xl border text-center flex flex-col items-center ${
                  isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                  Scan Cepat dengan Kamera HP
                </div>
                {qrCodeDataUrl ? (
                  <div className="bg-white p-3 rounded-2xl shadow-xl inline-block border-4 border-emerald-500/30">
                    <img
                      src={qrCodeDataUrl}
                      alt="QR Code KasirPintar"
                      className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-xs text-slate-500">
                    Membuat QR Code...
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-3 font-medium">
                  Arahkan kamera HP kasir Anda ke barcode di atas untuk langsung membuka kasir di ponsel.
                </p>
                <button
                  onClick={handleCopyLink}
                  className="mt-3 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Kirim Link via WhatsApp / Catatan</span>
                </button>
              </div>

              {/* Step by step installation */}
              <div className="md:col-span-7 space-y-4">
                <div
                  className={`p-4 rounded-2xl border ${
                    isDark ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm mb-1">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span>Aplikasi ini adalah PWA (Progressive Web App)</span>
                  </div>
                  <p className="text-xs opacity-90 leading-relaxed">
                    Bisa di-install langsung dari browser ke layar depan HP tanpa perlu download dari Google Play Store atau App Store!
                  </p>
                  <div className="mt-3">
                    <PWAInstallButton variant="hero" isDark={isDark} />
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-black">
                      A
                    </span>
                    <span>Untuk HP Android (Google Chrome):</span>
                  </h4>
                  <ol
                    className={`list-decimal list-inside space-y-2 text-xs pl-2 font-medium leading-relaxed ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    <li>Buka link aplikasi di browser <strong>Google Chrome</strong> di HP kasir.</li>
                    <li>Ketuk tombol <strong>titik tiga (⋮)</strong> di sudut kanan atas browser.</li>
                    <li>Pilih menu <strong>&quot;Tambahkan ke Layar Utama&quot;</strong> (atau <em>&quot;Instal Aplikasi&quot;</em>).</li>
                    <li>Beri nama <strong>Salsabila Mart</strong> lalu tekan <strong>Instal</strong>.</li>
                    <li>Ikon kasir akan muncul di menu HP Anda dan langsung berjalan layar penuh!</li>
                  </ol>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-sm flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center font-black">
                      B
                    </span>
                    <span>Untuk iPhone / iPad (Safari):</span>
                  </h4>
                  <ol
                    className={`list-decimal list-inside space-y-2 text-xs pl-2 font-medium leading-relaxed ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    <li>Buka link aplikasi di browser <strong>Safari</strong> di iPhone.</li>
                    <li>Ketuk tombol <strong>Share</strong> (ikon kotak dengan panah ke atas).</li>
                    <li>Pilih menu <strong>&quot;Add to Home Screen&quot;</strong> (Tambah ke Layar Utama).</li>
                    <li>Ketuk <strong>Tambah</strong> di sudut kanan atas. Selesai!</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CLOUD SYNC GOOGLE SHEETS */}
          {activeTab === 'sheets' && (
            <div className="space-y-5">
              <div
                className={`p-5 rounded-2xl border flex items-start gap-4 ${
                  isDark ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-emerald-50 border-emerald-200'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-emerald-400">
                    Otomatisasi Cloud ke Google Sheets Pemilik Toko
                  </h4>
                  <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Dengan mengaktifkan sinkronisasi Google Sheets, setiap kali kasir menyelesaikan transaksi di HP atau komputer mana pun, rincian penjualan, keuntungan bersih, dan stok barang akan langsung tersimpan di file Google Sheets akun Google Drive Anda tanpa butuh hosting database berbayar.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div
                  className={`p-4 rounded-2xl border ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="text-emerald-400 font-bold text-sm mb-2 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs">1</span>
                    Buka Menu Sheets
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Masuk ke menu <strong>&quot;Database Google Sheets&quot;</strong> di sidebar kiri aplikasi.
                  </p>
                </div>
                <div
                  className={`p-4 rounded-2xl border ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="text-emerald-400 font-bold text-sm mb-2 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs">2</span>
                    Hubungkan Akun Google
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Tekan tombol <strong>&quot;Sambungkan Sekarang&quot;</strong> dan masuk dengan akun Google <strong>salsabilamart684@gmail.com</strong>.
                  </p>
                </div>
                <div
                  className={`p-4 rounded-2xl border ${
                    isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="text-emerald-400 font-bold text-sm mb-2 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs">3</span>
                    Sinkron Otomatis
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Sistem akan membuat spreadsheet dan menyinkronkan seluruh transaksi dan inventaris secara real-time.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MULTI-PENGGUNA & KASIR */}
          {activeTab === 'multi' && (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-2xl border ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <h4 className="font-bold text-sm mb-1 text-emerald-400">
                  Cara Kasir & Pemilik Toko Menggunakan dari Perangkat Berbeda
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Setiap staf toko memiliki peran dan PIN login masing-masing untuk menjaga keamanan kasir:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  className={`p-4 rounded-2xl border space-y-2 ${
                    isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                      <ShieldCheck className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="font-bold text-sm">Role Admin (Pemilik Toko)</div>
                      <div className="text-[11px] text-slate-400">Akses Penuh</div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Bisa melihat laporan keuangan, mengatur harga & stok barang, mengelola user kasir, dan menghubungkan Google Sheets.
                  </p>
                </div>

                <div
                  className={`p-4 rounded-2xl border space-y-2 ${
                    isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                      <Users className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="font-bold text-sm">Role Kasir (Staf Penjualan)</div>
                      <div className="text-[11px] text-slate-400">Khusus Transaksi POS</div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Tampilan disederhanakan: Hanya kasir penjualan dan pengecekan sisa stok barang, tanpa menu keuangan sensitif. Tombol ganti shift telah dibatasi sehingga kasir tidak dapat menaikkan hak akses ke admin tanpa otentikasi.
                  </p>
                </div>
              </div>

              <div
                className={`p-4 rounded-2xl border text-xs text-slate-400 leading-relaxed flex items-center gap-3 ${
                  isDark ? 'bg-amber-950/20 border-amber-800/40 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                <Info className="w-5 h-5 shrink-0" />
                <span>
                  Tip: Anda bisa menambah petugas kasir baru dengan nama dan PIN khusus di menu <strong>&quot;Manajemen Pengguna&quot;</strong>.
                </span>
              </div>
            </div>
          )}

          {/* TAB 5: PANDUAN HOSTING SENDIRI (OPSIONAL) */}
          {activeTab === 'deploy' && (
            <div className="space-y-6">
              <div
                className={`p-5 rounded-2xl border ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <h4 className="font-bold text-sm mb-2 flex items-center gap-2 text-emerald-400">
                  <Server className="w-4 h-4" />
                  <span>Hosting ke Domain Sendiri (Opsional)</span>
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Jika Anda tetap ingin memasang kasir ini ke alamat domain website sendiri di internet, Anda bisa mengunggah hasil build ke Vercel atau cPanel hosting toko Anda:
                </p>
              </div>

              {/* Build Command Bar */}
              <div
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
                }`}
              >
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Perintah Build Produksi (Menghasilkan folder dist/):
                  </div>
                  <div className="font-mono text-sm text-emerald-400 font-bold mt-0.5">
                    $ npm run build
                  </div>
                </div>
                <button
                  onClick={handleCopyBuildCmd}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                >
                  {copiedBuildCmd ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedBuildCmd ? 'Perintah Tersalin!' : 'Salin Perintah'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vercel */}
                <div
                  className={`p-4 rounded-2xl border space-y-3 ${
                    isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm flex items-center gap-1.5 text-emerald-400">
                      <span>▲</span> Vercel
                    </span>
                    <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                      Gratis
                    </span>
                  </div>
                  <ol className="list-decimal list-inside text-xs text-slate-400 space-y-1.5 leading-relaxed">
                    <li>Upload kode ke GitHub Anda.</li>
                    <li>Buka <strong>vercel.com</strong> dan impor repositori kasir.</li>
                    <li>
                      <strong>Penting:</strong> Jika menggunakan Google Login di Vercel, daftarkan domain Vercel Anda di Firebase Console &gt; Authentication &gt; Settings &gt; Authorized Domains. Atau gunakan login PIN kasir lokal yang bebas error domain!
                    </li>
                    <li>Klik <strong>Deploy</strong>. Selesai!</li>
                  </ol>
                  <div className="pt-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 font-mono">
                      <span>File vercel.json:</span>
                      <button
                        onClick={() => handleCopyDeployConfig(vercelConfig)}
                        className="text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>Salin</span>
                      </button>
                    </div>
                    <pre
                      className={`p-2.5 rounded-xl text-[10px] font-mono overflow-x-auto ${
                        isDark ? 'bg-slate-900 border border-slate-800 text-slate-300' : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {vercelConfig}
                    </pre>
                  </div>
                </div>

                {/* Netlify */}
                <div
                  className={`p-4 rounded-2xl border space-y-3 ${
                    isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm flex items-center gap-1.5 text-teal-400">
                      <FolderArchive className="w-4 h-4" /> Netlify (Drag & Drop dist/)
                    </span>
                    <span className="text-[10px] bg-teal-500/15 text-teal-400 px-2 py-0.5 rounded-full font-bold">
                      Mudah
                    </span>
                  </div>
                  <ol className="list-decimal list-inside text-xs text-slate-400 space-y-1.5 leading-relaxed">
                    <li>Jalankan <code>npm run build</code> di komputer Anda.</li>
                    <li>Akan tercipta folder <strong>dist/</strong>.</li>
                    <li>Buka <strong>netlify.com/drop</strong> di browser.</li>
                    <li>Tarik (drag & drop) folder <strong>dist/</strong> tersebut ke browser Netlify!</li>
                    <li>Website kasir langsung online dan mendapatkan link publik gratis serta SSL HTTPS.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          className={`px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Kasir POS 100% mandiri • Tidak bergantung pada server hosting mana pun.</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleDownloadBatch}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Unduh Runner .BAT</span>
            </button>
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md"
            >
              Tutup Panduan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
