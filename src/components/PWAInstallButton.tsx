import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Download,
  Smartphone,
  X,
  Share2,
  Check,
  Sparkles,
  Zap,
  Copy,
  ExternalLink,
  Info,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'hero' | 'sidebar' | 'banner';
  isDark?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  isDark = true,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      QRCode.toDataURL(window.location.href, {
        width: 260,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      })
        .then((url) => setQrCodeUrl(url))
        .catch(() => {});
    }
  }, []);

  // If already running in standalone PWA window, suppress button
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      try {
        const success = await install();
        if (!success) {
          setShowModal(true);
        }
      } catch {
        setShowModal(true);
      } finally {
        setIsInstalling(false);
      }
    } else {
      setShowModal(true);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  return (
    <>
      {/* 1. Sidebar Variant */}
      {variant === 'sidebar' && (
        <button
          onClick={handleClick}
          disabled={isInstalling}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all cursor-pointer shadow-xs active:scale-98"
          title="Pasang aplikasi di layar utama HP (PWA)"
        >
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-400 shrink-0 animate-bounce" />
            <span>Pasang di HP (PWA)</span>
          </div>
          <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-500/30">
            {isInstallable ? 'Instal' : 'Panduan'}
          </span>
        </button>
      )}

      {/* 2. Hero Variant */}
      {variant === 'hero' && (
        <button
          onClick={handleClick}
          disabled={isInstalling}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-950/40 flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-98 border border-emerald-400/30"
        >
          <Download className="w-4 h-4 animate-bounce" />
          <span>
            {isInstalling ? 'Memasang Aplikasi...' : 'Pasang Aplikasi di HP (PWA)'}
          </span>
          <span className="bg-white/20 text-white text-[10px] font-mono px-2 py-0.5 rounded-md">
            Instal
          </span>
        </button>
      )}

      {/* 3. Banner Variant */}
      {variant === 'banner' && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900/90 to-teal-900/90 border border-emerald-500/40 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/30 shrink-0">
              <Smartphone className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-xs">Jadikan Aplikasi Kasir di Layar HP</h4>
              <p className="text-[11px] text-emerald-100/80">
                Bisa dibuka cepat seperti aplikasi Play Store tanpa membuka browser terus-menerus.
              </p>
            </div>
          </div>
          <button
            onClick={handleClick}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer shadow-md shrink-0 active:scale-95"
          >
            Pasang Sekarang
          </button>
        </div>
      )}

      {/* 4. Default Header Variant */}
      {variant === 'header' && (
        <button
          onClick={handleClick}
          disabled={isInstalling}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            isDark
              ? 'bg-emerald-600/90 hover:bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-950'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-2xs'
          }`}
          title="Pasang aplikasi kasir di HP atau Komputer Anda (PWA)"
        >
          <Download className="w-3.5 h-3.5 animate-bounce" />
          <span className="hidden sm:inline">Pasang di HP (PWA)</span>
          <span className="sm:hidden">Instal</span>
        </button>
      )}

      {/* Comprehensive Guided Mobile Install Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
          <div
            className={`w-full max-w-lg rounded-3xl p-6 shadow-2xl border my-auto transition-all ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-base">Pasang Aplikasi di HP (PWA)</h3>
                  <p className="text-xs text-slate-400">
                    Salsabila Mart Kasir Pintar • Siap Berjalan Layar Penuh
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="py-4 space-y-4 text-xs leading-relaxed max-h-[70vh] overflow-y-auto pr-1">
              {/* Direct native trigger button if browser supports it */}
              {isInstallable && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
                      <Zap className="w-4 h-4" />
                      Browser Mendukung Instalasi Langsung
                    </span>
                    <button
                      onClick={async () => {
                        await install();
                        setShowModal(false);
                      }}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs transition-all shadow-md cursor-pointer"
                    >
                      Klik Pasang Sekarang
                    </button>
                  </div>
                </div>
              )}

              {/* QR Code Section to Open on Phone */}
              <div
                className={`p-4 rounded-2xl border text-center flex flex-col sm:flex-row items-center gap-4 ${
                  isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                {qrCodeUrl ? (
                  <div className="bg-white p-2 rounded-xl shadow-md border-2 border-emerald-500/40 shrink-0">
                    <img
                      src={qrCodeUrl}
                      alt="Scan QR Pasang di HP"
                      className="w-28 h-28 object-contain"
                    />
                  </div>
                ) : null}
                <div className="text-left space-y-1.5 flex-1 min-w-0">
                  <h4 className="font-bold text-xs text-emerald-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Buka Cepat di Ponsel Kasir:</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Arahkan kamera HP ke kode QR di samping untuk langsung membuka link kasir di ponsel Anda.
                  </p>
                  <button
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-[11px] font-bold cursor-pointer transition-all"
                  >
                    {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedLink ? 'Link Tersalin!' : 'Salin Link Web'}</span>
                  </button>
                </div>
              </div>

              {/* Android Guide */}
              <div
                className={`p-4 rounded-2xl border space-y-2.5 ${
                  isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-[11px]">
                    1
                  </span>
                  <span>Petunjuk untuk HP Android (Google Chrome):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-xs pl-1">
                  <li>Buka link website kasir di browser <strong>Google Chrome</strong> di HP.</li>
                  <li>
                    Ketuk tombol <strong>titik tiga (⋮)</strong> di sudut kanan atas Chrome.
                  </li>
                  <li>
                    Pilih menu <strong>&quot;Instal Aplikasi&quot;</strong> (atau <em>&quot;Tambahkan ke Layar Utama&quot;</em>).
                  </li>
                  <li>
                    Tekan <strong>Instal</strong>. Ikon <strong>Salsabila Mart</strong> akan muncul di beranda HP Anda!
                  </li>
                </ol>
              </div>

              {/* iOS Guide */}
              <div
                className={`p-4 rounded-2xl border space-y-2.5 ${
                  isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-[11px]">
                    2
                  </span>
                  <span>Petunjuk untuk iPhone / iPad (Safari):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-xs pl-1">
                  <li>Buka link website kasir di browser <strong>Safari</strong> di iPhone.</li>
                  <li>
                    Tekan tombol <strong>Bagikan / Share</strong> (ikon kotak dengan panah ke atas <Share2 className="w-3 h-3 inline text-blue-400" />).
                  </li>
                  <li>
                    Gulir ke bawah dan ketuk <strong>&quot;Tambah ke Layar Utama&quot;</strong> (<em>Add to Home Screen</em>).
                  </li>
                  <li>Ketuk <strong>Tambah</strong> di sudut kanan atas. Selesai!</li>
                </ol>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-800/60 text-slate-400 text-[11px]">
                <Info className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Setelah dipasang, aplikasi kasir dapat dibuka <strong>layar penuh (fullscreen)</strong> dan berjalan <strong>offline</strong> tanpa kuota internet!
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-md"
              >
                Mengerti & Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
