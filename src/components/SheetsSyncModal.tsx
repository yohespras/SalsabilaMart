import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  UploadCloud,
  DownloadCloud,
  Trash2,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Settings,
} from 'lucide-react';
import { GoogleSheetsConfig } from '../types';
import { formatRupiah } from '../services/storage';

export type SyncModalInitialMode = 'hub' | 'confirm-push' | 'confirm-pull' | 'confirm-zero';

interface SheetsSyncModalProps {
  isOpen: boolean;
  initialMode?: SyncModalInitialMode;
  onClose: () => void;
  config: GoogleSheetsConfig;
  localTransactionCount: number;
  todayOmset: number;
  productCount: number;
  isBusy: boolean;
  onPushFullToSheet: () => Promise<void>;
  onPullFullFromSheet: () => Promise<void>;
  onZeroTransactions: (alsoClearSheet: boolean) => Promise<void>;
  onOpenSheetsMenu: () => void;
  isDark?: boolean;
}

export const SheetsSyncModal: React.FC<SheetsSyncModalProps> = ({
  isOpen,
  initialMode = 'hub',
  onClose,
  config,
  localTransactionCount,
  todayOmset,
  productCount,
  isBusy,
  onPushFullToSheet,
  onPullFullFromSheet,
  onZeroTransactions,
  onOpenSheetsMenu,
  isDark = false,
}) => {
  const [mode, setMode] = useState<SyncModalInitialMode>(initialMode);
  const [alsoClearSheet, setAlsoClearSheet] = useState<boolean>(
    Boolean(config.spreadsheetId || config.webhookUrl)
  );

  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setAlsoClearSheet(Boolean(config.spreadsheetId || config.webhookUrl));
    }
  }, [isOpen, initialMode, config.spreadsheetId, config.webhookUrl]);

  if (!isOpen) return null;

  const isConnected = Boolean(config.spreadsheetId || config.webhookUrl);
  const targetSheetLabel =
    config.spreadsheetName ||
    (config.webhookUrl ? 'Google Sheets (Webhook)' : 'Belum Terhubung');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
      <div
        className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden transition-all ${
          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'border-slate-800 bg-slate-900/95' : 'border-slate-100 bg-slate-50/80'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-500">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base tracking-tight">
                Pusat Sinkronisasi Dashboard &amp; Google Sheets
              </h3>
              <p className="text-[11px] text-slate-400">
                Samakan data transaksi (termasuk kondisi 0 / kosong) dua arah
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isBusy}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Status Summary Box */}
          <div
            className={`p-4 rounded-2xl border space-y-2 text-xs ${
              isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-semibold">Spreadsheet Tujuan:</span>
              <span className="font-bold flex items-center gap-1.5 text-emerald-500 truncate max-w-[240px]">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{targetSheetLabel}</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-semibold">Data Transaksi di Aplikasi:</span>
              <span className="font-mono font-black">
                {localTransactionCount} Transaksi ({formatRupiah(todayOmset)} hari ini)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-semibold">Data Produk / Inventaris:</span>
              <span className="font-mono font-bold">{productCount} Produk</span>
            </div>
            {config.spreadsheetUrl && (
              <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <a
                  href={config.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500 hover:underline"
                >
                  <span>Buka File Google Sheets</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {!isConnected && mode !== 'confirm-zero' && (
            <div className="p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-black text-amber-500">
                    Google Sheets Belum Dihubungkan
                  </p>
                  <p className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                    Hubungkan akun Google atau URL Webhook Apps Script terlebih dahulu di menu{' '}
                    <strong>Database Google Sheets</strong> agar Dashboard otomatis tersinkron ke Spreadsheet.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenSheetsMenu();
                }}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Settings className="w-4 h-4" />
                <span>Buka Pengaturan Database Google Sheets</span>
              </button>
            </div>
          )}

          {/* HUB VIEW */}
          {mode === 'hub' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 leading-relaxed">
                Pilih arah sinkronisasi yang Anda inginkan:
              </p>

              {/* Option 1: Push App -> Sheet */}
              <button
                disabled={!isConnected || isBusy}
                onClick={() => setMode('confirm-push')}
                className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark
                    ? 'bg-slate-800/60 border-slate-700 hover:border-emerald-500/60 hover:bg-slate-800'
                    : 'bg-white border-slate-200 hover:border-emerald-500 hover:shadow-xs'
                }`}
              >
                <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-500 shrink-0">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-xs sm:text-sm">
                    1. Kirim &amp; Samakan Aplikasi &rarr; Google Sheets
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {localTransactionCount === 0
                      ? 'Data transaksi Anda saat ini 0. Pilihan ini akan mengosongkan baris transaksi lama di Google Sheets & memperbarui lembar Dashboard menjadi Rp 0.'
                      : `Perbarui lembar Dashboard, Transaksi (${localTransactionCount} struk), Detail_Transaksi, dan Produk di Google Sheets mengikuti aplikasi ini.`}
                  </p>
                </div>
              </button>

              {/* Option 2: Pull Sheet -> App */}
              <button
                disabled={!isConnected || isBusy}
                onClick={() => setMode('confirm-pull')}
                className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark
                    ? 'bg-slate-800/60 border-slate-700 hover:border-blue-500/60 hover:bg-slate-800'
                    : 'bg-white border-slate-200 hover:border-blue-500 hover:shadow-xs'
                }`}
              >
                <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-500 shrink-0">
                  <DownloadCloud className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-xs sm:text-sm">
                    2. Tarik Data Google Sheets &rarr; Dashboard Aplikasi
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Jika Anda sudah menghapus / meng-0-kan baris transaksi langsung di Google Sheets, klik ini agar Dashboard aplikasi ikut menjadi Rp 0 sesuai isi Spreadsheet.
                  </p>
                </div>
              </button>

              {/* Option 3: Zero Out Both */}
              <button
                disabled={isBusy}
                onClick={() => setMode('confirm-zero')}
                className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 cursor-pointer disabled:opacity-50 ${
                  isDark
                    ? 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/60 hover:bg-rose-950/30'
                    : 'bg-rose-50/60 border-rose-200 hover:border-rose-400'
                }`}
              >
                <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-500 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-xs sm:text-sm text-rose-500">
                    3. Nol-kan (0) Semua Data Transaksi (Aplikasi + Sheets)
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Reset omset &amp; seluruh riwayat transaksi menjadi 0 (Rp 0) tanpa menghapus daftar barang/stok produk toko.
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* CONFIRM PUSH */}
          {mode === 'confirm-push' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 space-y-2 text-xs">
                <p className="font-black text-emerald-500 uppercase tracking-wide">
                  Konfirmasi Pembaruan Google Sheets
                </p>
                <p className={isDark ? 'text-slate-200 leading-relaxed' : 'text-slate-700 leading-relaxed'}>
                  Anda akan menimpa data pada Spreadsheet{' '}
                  <strong>"{targetSheetLabel}"</strong> pada lembar:
                </p>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
                  <li>
                    <strong>Transaksi &amp; Detail_Transaksi:</strong>{' '}
                    {localTransactionCount === 0
                      ? 'Seluruh baris lama akan DIKOSONGKAN (0 transaksi)'
                      : `Diisi dengan ${localTransactionCount} transaksi aktif saat ini`}
                  </li>
                  <li>
                    <strong>Dashboard:</strong> Diperbarui ke Omset Hari Ini{' '}
                    <strong>{formatRupiah(todayOmset)}</strong>
                  </li>
                  <li>
                    <strong>Produk:</strong> Disinkronkan dengan {productCount} produk saat ini
                  </li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  onClick={() => setMode('hub')}
                  disabled={isBusy}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Kembali
                </button>
                <button
                  onClick={async () => {
                    await onPushFullToSheet();
                    onClose();
                  }}
                  disabled={isBusy}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 cursor-pointer shadow-md"
                >
                  {isBusy ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <UploadCloud className="w-4 h-4" />
                  )}
                  <span>{isBusy ? 'Menyinkronkan...' : 'Ya, Sinkronkan ke Sheets'}</span>
                </button>
              </div>
            </div>
          )}

          {/* CONFIRM PULL */}
          {mode === 'confirm-pull' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/10 space-y-2 text-xs">
                <p className="font-black text-blue-500 uppercase tracking-wide">
                  Konfirmasi Tarik Data dari Google Sheets
                </p>
                <p className={isDark ? 'text-slate-200 leading-relaxed' : 'text-slate-700 leading-relaxed'}>
                  Data transaksi dan produk di Dashboard aplikasi akan digantikan mengikuti isi lembar{' '}
                  <strong>Transaksi</strong> &amp; <strong>Produk</strong> pada Spreadsheet{' '}
                  <strong>"{targetSheetLabel}"</strong>. Jika lembar Transaksi di Google Sheets kosong (0 baris), maka Dashboard aplikasi juga akan menjadi <strong>0 (Rp 0)</strong>.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  onClick={() => setMode('hub')}
                  disabled={isBusy}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Kembali
                </button>
                <button
                  onClick={async () => {
                    await onPullFullFromSheet();
                    onClose();
                  }}
                  disabled={isBusy}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-2 cursor-pointer shadow-md"
                >
                  {isBusy ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <DownloadCloud className="w-4 h-4" />
                  )}
                  <span>{isBusy ? 'Menarik Data...' : 'Ya, Tarik & Samakan Dashboard'}</span>
                </button>
              </div>
            </div>
          )}

          {/* CONFIRM ZERO */}
          {mode === 'confirm-zero' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 space-y-2.5 text-xs">
                <div className="flex items-center gap-2 text-rose-500 font-black uppercase tracking-wide">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Konfirmasi Nol-kan (0) Seluruh Transaksi</span>
                </div>
                <p className={isDark ? 'text-slate-200 leading-relaxed' : 'text-slate-700 leading-relaxed'}>
                  Seluruh riwayat struk penjualan (<strong>{localTransactionCount} transaksi</strong>) akan dihapus menjadi <strong>0 (Rp 0)</strong>. Daftar barang dan stok inventaris toko Anda <strong>TIDAK</strong> akan terhapus.
                </p>

                {isConnected && (
                  <label className="flex items-start gap-2.5 pt-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={alsoClearSheet}
                      onChange={(e) => setAlsoClearSheet(e.target.checked)}
                      className="mt-0.5 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className={isDark ? 'text-slate-200 font-semibold' : 'text-slate-800 font-semibold'}>
                      Sekaligus kosongkan (0-kan) lembar <code>Transaksi</code> &amp; <code>Detail_Transaksi</code> serta perbarui lembar <code>Dashboard</code> menjadi Rp 0 di Google Sheets (<strong>{targetSheetLabel}</strong>)
                    </span>
                  </label>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  onClick={() => (initialMode === 'confirm-zero' ? onClose() : setMode('hub'))}
                  disabled={isBusy}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={async () => {
                    await onZeroTransactions(alsoClearSheet && isConnected);
                    onClose();
                  }}
                  disabled={isBusy}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-2 cursor-pointer shadow-md"
                >
                  {isBusy ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>
                    {isBusy
                      ? 'Memproses...'
                      : alsoClearSheet && isConnected
                      ? '0-kan Aplikasi & Google Sheets'
                      : '0-kan Transaksi Aplikasi'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
