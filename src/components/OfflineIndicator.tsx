import React, { useState } from 'react';
import { WifiOff, ChevronRight, X, Database, RefreshCw, CheckCircle, Cloud, AlertCircle } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface OfflineIndicatorProps {
  pendingSyncCount?: number;
  isSyncing?: boolean;
  onSyncNow?: () => void;
  onOpenOnlineGuide?: () => void;
  syncMessage?: string | null;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  pendingSyncCount = 0,
  isSyncing = false,
  onSyncNow,
  onOpenOnlineGuide,
  syncMessage,
}) => {
  const isOnline = useOnlineStatus();
  const [dismissed, setDismissed] = useState(false);

  // If online and nothing is pending to sync and not syncing, don't show floating banner
  if (isOnline && pendingSyncCount === 0 && !isSyncing) {
    return null;
  }

  // If user minimized the toast, show a compact pill in the bottom right
  if (dismissed) {
    return (
      <button
        onClick={() => setDismissed(false)}
        className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-black shadow-2xl transition-all cursor-pointer ${
          isOnline
            ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
            : 'bg-amber-500 text-slate-950 hover:bg-amber-400 animate-pulse'
        }`}
        title={isOnline ? 'Ada data transaksi menunggu sinkronisasi' : 'Mode Offline Aktif'}
      >
        {isOnline ? (
          isSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Cloud className="w-3.5 h-3.5" />
          )
        ) : (
          <WifiOff className="w-3.5 h-3.5" />
        )}
        <span>
          {isOnline
            ? isSyncing
              ? 'Menyinkronkan ke Sheets...'
              : `${pendingSyncCount} Transaksi Siap Sinkron`
            : `Mode Offline (${pendingSyncCount} Tertunda)`}
        </span>
      </button>
    );
  }

  // CASE 1: BACK ONLINE, TRANSACTIONS PENDING SYNC
  if (isOnline && (pendingSyncCount > 0 || isSyncing)) {
    return (
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md z-50 animate-in slide-in-from-bottom duration-300">
        <div className="bg-slate-950/95 border-2 border-emerald-500/80 text-white p-4 rounded-3xl shadow-2xl backdrop-blur-md flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            {isSyncing ? (
              <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
            ) : (
              <Cloud className="w-5 h-5 text-emerald-400 animate-bounce" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Internet Kembali Online!</span>
              </h4>
              <button
                onClick={() => setDismissed(true)}
                className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                title="Sembunyikan"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
              Terdapat <strong>{pendingSyncCount} transaksi</strong> hasil penjualan offline yang siap dimasukkan ke Google Sheets toko.
            </p>
            {syncMessage && (
              <p className="text-[10px] text-emerald-300 mt-1 font-mono">{syncMessage}</p>
            )}
            <div className="mt-3 flex items-center gap-2">
              {onSyncNow && (
                <button
                  onClick={onSyncNow}
                  disabled={isSyncing}
                  className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Sedang Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // CASE 2: OFFLINE MODE ACTIVE
  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-md z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-slate-950/95 border-2 border-amber-500/80 text-white p-4 rounded-3xl shadow-2xl backdrop-blur-md flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
          <WifiOff className="w-5 h-5 animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider">
              Mode Offline Aktif (Admin & Kasir)
            </h4>
            <button
              onClick={() => setDismissed(true)}
              className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
              title="Sembunyikan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
            Internet terputus, namun <strong>Admin & Kasir tetap dapat bertransaksi, cek stok, dan cetak struk secara normal!</strong>
          </p>
          <div className="mt-2 text-[10px] text-slate-300 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-300">
              <Database className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                {pendingSyncCount > 0
                  ? `${pendingSyncCount} transaksi disimpan lokal`
                  : 'Data tersimpan aman di memori lokal'}
              </span>
            </div>
            <p className="text-slate-400 leading-normal">
              Ketika koneksi internet kembali online, seluruh data akan <strong>otomatis disinkronkan ke Google Sheets</strong>.
            </p>
          </div>
          {onOpenOnlineGuide && (
            <button
              onClick={onOpenOnlineGuide}
              className="mt-2.5 text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              <span>Buka Panduan Offline & Multi-Device</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
