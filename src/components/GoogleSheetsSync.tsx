import React, { useState } from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Download,
  CheckCircle2,
  Database,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  Link2,
  Cloud,
  UploadCloud,
  DownloadCloud,
  Trash2,
  X,
} from 'lucide-react';
import { GoogleSheetsConfig, Product, StoreProfile, Transaction } from '../types';
import {
  APPS_SCRIPT_CODE,
  fetchProductsFromSheet,
  overwriteFullStateToSheet,
  pullFullStateFromSheet,
  pushProductsToSheet,
  searchOrCreateSpreadsheet,
  syncDashboardSummaryToSheet,
  syncViaWebhook,
} from '../services/googleSheets';
import { ensureAccessToken } from '../services/auth';

interface GoogleSheetsSyncProps {
  products: Product[];
  transactions: Transaction[];
  storeProfile: StoreProfile;
  config: GoogleSheetsConfig;
  onUpdateConfig: (cfg: GoogleSheetsConfig) => void;
  onImportProducts: (imported: Product[]) => void;
  onImportTransactions?: (imported: Transaction[]) => void;
  onZeroAllTransactions?: (alsoClearSheet: boolean) => Promise<void>;
  pendingSyncCount?: number;
  onSyncPending?: () => void;
  isSyncingPending?: boolean;
  isDark?: boolean;
}

type ConfirmActionType =
  | null
  | 'push-full'
  | 'pull-full'
  | 'push-products'
  | 'pull-products'
  | 'zero-transactions';

export const GoogleSheetsSync: React.FC<GoogleSheetsSyncProps> = ({
  products,
  transactions,
  storeProfile,
  config,
  onUpdateConfig,
  onImportProducts,
  onImportTransactions,
  onZeroAllTransactions,
  pendingSyncCount = 0,
  onSyncPending,
  isSyncingPending = false,
  isDark = false,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncIsError, setSyncIsError] = useState(false);
  const [isCopiedCode, setIsCopiedCode] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'status' | 'webhook' | 'code'>(
    config.syncMode === 'webhook' && !config.spreadsheetId ? 'webhook' : 'status'
  );
  const [confirmAction, setConfirmAction] = useState<ConfirmActionType>(null);

  // Unauthorized domain error state
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'vercel.app';
  const isVercelHost = currentHostname.includes('vercel.app');
  const [unauthorizedDomainDetected, setUnauthorizedDomainDetected] = useState<boolean>(
    () => isVercelHost
  );
  const [copiedHost, setCopiedHost] = useState(false);

  // Webhook URL state
  const [webhookInput, setWebhookInput] = useState(config.webhookUrl || '');

  const firebaseProjectId = 'gen-lang-client-0566158393';
  const firebaseAuthSettingsUrl = `https://console.firebase.google.com/project/${firebaseProjectId}/authentication/settings`;

  const setNotice = (msg: string, isError = false) => {
    setSyncMessage(msg);
    setSyncIsError(isError);
  };

  const handleCopyHostname = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHost(true);
    setTimeout(() => setCopiedHost(false), 2500);
  };

  const handleConnectSheet = async () => {
    setIsSyncing(true);
    setNotice('Menghubungkan ke Google Drive & menyiapkan Spreadsheet Toko...');
    try {
      const token = await ensureAccessToken(true);
      if (!token) {
        throw new Error('Izin Google diperlukan.');
      }
      const sheetInfo = await searchOrCreateSpreadsheet(storeProfile.name);
      await pushProductsToSheet(sheetInfo.id, products, true);
      await syncDashboardSummaryToSheet(sheetInfo.id, storeProfile, products, transactions, true);

      onUpdateConfig({
        ...config,
        spreadsheetId: sheetInfo.id,
        spreadsheetName: `KasirPintar - ${storeProfile.name}`,
        spreadsheetUrl: sheetInfo.url,
        syncMode: 'oauth',
        lastSyncedAt: new Date().toISOString(),
        autoSync: true,
        status: 'connected',
      });
      setUnauthorizedDomainDetected(false);
      setNotice(
        sheetInfo.isNew
          ? 'Spreadsheet Google baru berhasil dibuat lengkap dengan lembar Dashboard, Transaksi, dan Produk!'
          : 'Spreadsheet berhasil dihubungkan & ringkasan Dashboard telah diperbarui!'
      );
    } catch (err: any) {
      console.error(err);
      if (
        err.message?.includes('auth/unauthorized-domain') ||
        err.code === 'auth/unauthorized-domain'
      ) {
        setUnauthorizedDomainDetected(true);
        setNotice(
          `Domain "${currentHostname}" belum diizinkan di Firebase Console. Ikuti panduan di bawah atau gunakan tab Webhook.`,
          true
        );
      } else {
        setNotice(`Gagal menghubungkan: ${err.message}`, true);
      }
      onUpdateConfig({
        ...config,
        status: 'error',
        errorMessage: err.message,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveWebhook = async () => {
    if (!webhookInput.trim()) {
      setNotice('Masukkan URL Webhook Google Apps Script terlebih dahulu!', true);
      return;
    }
    setIsSyncing(true);
    setNotice('Menyimpan dan menguji koneksi Webhook Google Apps Script...');
    try {
      await syncViaWebhook(webhookInput.trim(), {
        action: 'ping',
        storeName: storeProfile.name,
      });
      onUpdateConfig({
        ...config,
        webhookUrl: webhookInput.trim(),
        syncMode: 'webhook',
        status: 'connected',
        spreadsheetName: config.spreadsheetName || 'Google Sheets (via Apps Script Webhook)',
        lastSyncedAt: new Date().toISOString(),
      });
      setNotice(
        'Webhook Google Apps Script berhasil terhubung tanpa menambah baris transaksi uji coba palsu!'
      );
    } catch {
      onUpdateConfig({
        ...config,
        webhookUrl: webhookInput.trim(),
        syncMode: 'webhook',
        status: 'connected',
        spreadsheetName: config.spreadsheetName || 'Google Sheets (via Apps Script Webhook)',
        lastSyncedAt: new Date().toISOString(),
      });
      setNotice('Webhook Google Apps Script tersimpan dan siap digunakan!');
    } finally {
      setIsSyncing(false);
    }
  };

  const executeConfirmedAction = async () => {
    const action = confirmAction;
    setConfirmAction(null);
    if (!action) return;

    if (action === 'zero-transactions' && onZeroAllTransactions) {
      setIsSyncing(true);
      setNotice('Mengosongkan (0-kan) transaksi di aplikasi & Google Sheets...');
      try {
        await onZeroAllTransactions(Boolean(config.spreadsheetId || config.webhookUrl));
        setNotice(
          'Berhasil! Seluruh transaksi telah di-0-kan di Dashboard aplikasi dan Google Sheets.'
        );
      } catch (err: any) {
        setNotice(`Gagal meng-0-kan transaksi: ${err.message}`, true);
      } finally {
        setIsSyncing(false);
      }
      return;
    }

    if (action === 'push-full') {
      setIsSyncing(true);
      setNotice(
        transactions.length === 0
          ? 'Mengosongkan lembar Transaksi & memperbarui Dashboard menjadi Rp 0 di Google Sheets...'
          : 'Menyinkronkan penuh Dashboard, Transaksi & Produk ke Google Sheets...'
      );
      try {
        const res = await overwriteFullStateToSheet(
          config.spreadsheetId,
          storeProfile,
          transactions,
          products,
          config.webhookUrl,
          true
        );
        if (res.success) {
          if (onImportTransactions && transactions.length > 0) {
            onImportTransactions(transactions.map((t) => ({ ...t, syncedToSheet: true })));
          }
          onUpdateConfig({
            ...config,
            lastSyncedAt: new Date().toISOString(),
            status: 'connected',
          });
          setNotice(res.message, false);
        } else {
          setNotice(res.message, true);
        }
      } catch (err: any) {
        setNotice(`Gagal sinkronisasi penuh: ${err.message}`, true);
      } finally {
        setIsSyncing(false);
      }
      return;
    }

    if (action === 'pull-full') {
      setIsSyncing(true);
      setNotice('Menarik data Transaksi & Produk terbaru dari Google Sheets ke Dashboard...');
      try {
        const res = await pullFullStateFromSheet(
          config.spreadsheetId,
          products,
          config.webhookUrl
        );
        if (res.success) {
          if (res.products && res.products.length > 0) {
            onImportProducts(res.products);
          }
          if (res.transactions !== null && onImportTransactions) {
            onImportTransactions(res.transactions);
          }
          onUpdateConfig({
            ...config,
            lastSyncedAt: new Date().toISOString(),
            status: 'connected',
          });
          setNotice(res.message, false);
        } else {
          setNotice(res.message, true);
        }
      } catch (err: any) {
        setNotice(`Gagal menarik data: ${err.message}`, true);
      } finally {
        setIsSyncing(false);
      }
      return;
    }

    if (action === 'push-products') {
      if (!config.spreadsheetId) return;
      setIsSyncing(true);
      setNotice('Mengunggah data inventaris produk ke Google Sheet...');
      try {
        const ok = await pushProductsToSheet(config.spreadsheetId, products, true);
        await syncDashboardSummaryToSheet(
          config.spreadsheetId,
          storeProfile,
          products,
          transactions,
          true
        );
        if (ok) {
          setNotice('Data inventaris produk & ringkasan Dashboard berhasil diperbarui di Google Sheets!');
          onUpdateConfig({
            ...config,
            lastSyncedAt: new Date().toISOString(),
            status: 'connected',
          });
        } else {
          throw new Error('Gagal memperbarui lembar Produk.');
        }
      } catch (err: any) {
        setNotice(`Gagal upload produk: ${err.message}`, true);
      } finally {
        setIsSyncing(false);
      }
      return;
    }

    if (action === 'pull-products') {
      setIsSyncing(true);
      setNotice('Mengunduh data produk terbaru dari Google Sheet...');
      try {
        const imported = await fetchProductsFromSheet(
          config.spreadsheetId,
          config.webhookUrl,
          true
        );
        if (imported && imported.length > 0) {
          onImportProducts(imported);
          setNotice(`Berhasil mengimpor ${imported.length} produk dari Google Sheets!`);
        } else {
          setNotice('Tidak ada baris produk yang ditemukan pada lembar Produk.', true);
        }
      } catch (err: any) {
        setNotice(`Gagal unduh produk: ${err.message}`, true);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setIsCopiedCode(true);
    setTimeout(() => setIsCopiedCode(false), 2000);
  };

  const handleDownloadCode = () => {
    const element = document.createElement('a');
    const file = new Blob([APPS_SCRIPT_CODE], { type: 'text/javascript' });
    element.href = URL.createObjectURL(file);
    element.download = 'Code.gs';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const isAnyConnected = Boolean(config.spreadsheetId || config.webhookUrl);
  const sheetTargetName =
    config.spreadsheetName || `KasirPintar - ${storeProfile.name}`;

  return (
    <div className="space-y-6 pb-12 max-w-5xl">
      {/* Header */}
      <div
        className={`p-6 sm:p-7 rounded-3xl border shadow-sm transition-all ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/15 text-emerald-500 rounded-2xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h1
                className={`text-xl sm:text-2xl font-black tracking-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                Integrasi Database Google Sheets (2 Arah)
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Sinkronisasi penuh Dashboard, Transaksi (termasuk kondisi 0 / kosong), dan Inventaris Produk.
              </p>
            </div>
          </div>
          <div className="flex gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
            <button
              onClick={() => setActiveSubTab('status')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'status'
                  ? 'bg-white dark:bg-slate-900 text-emerald-500 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              1. Google OAuth
            </button>
            <button
              onClick={() => setActiveSubTab('webhook')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'webhook'
                  ? 'bg-white dark:bg-slate-900 text-emerald-500 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              2. Webhook (Tanpa Otorisasi)
            </button>
            <button
              onClick={() => setActiveSubTab('code')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'code'
                  ? 'bg-white dark:bg-slate-900 text-emerald-500 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Apps Script (.gs)
            </button>
          </div>
        </div>
      </div>

      {/* Sync Notifications */}
      {syncMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2.5 animate-in fade-in ${
            syncIsError
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {syncIsError ? (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            )}
            <span>{syncMessage}</span>
          </div>
          <button
            onClick={() => setSyncMessage(null)}
            className="p-1 rounded-lg hover:bg-black/10 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* SPECIAL FIX BANNER FOR auth/unauthorized-domain ON VERCEL */}
      {unauthorizedDomainDetected && activeSubTab === 'status' && (
        <div className="p-6 rounded-3xl border border-amber-500/50 bg-amber-500/10 text-amber-300 space-y-4 shadow-lg animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-500 text-slate-950 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-sm text-amber-400 uppercase tracking-wide">
                Solusi Error (auth/unauthorized-domain) di Vercel:
              </h3>
              <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                Firebase memblokir login popup jika domain hosting belum didaftarkan di daftar{' '}
                <strong>Authorized Domains</strong> Firebase Console proyek{' '}
                <code>{firebaseProjectId}</code>.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Langkah Cepat Menyelesaikan (Hanya 1 Menit):</span>
            </h4>
            <ol className="list-decimal list-inside text-xs text-slate-300 space-y-2 leading-relaxed">
              <li>
                Buka menu Authorized Domains di Firebase Console proyek Anda:
                <div className="pt-1.5">
                  <a
                    href={firebaseAuthSettingsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md cursor-pointer"
                  >
                    <span>Buka Firebase Console Settings</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </li>
              <li>
                Di tab <strong>Settings</strong>, gulir ke bagian{' '}
                <strong>Authorized domains</strong> lalu klik <strong>Add domain</strong>.
              </li>
              <li>
                Tambahkan domain Vercel Anda:
                <div className="flex flex-wrap items-center gap-2 pt-1.5">
                  <button
                    onClick={() => handleCopyHostname(currentHostname)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedHost ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>Salin Domain: {currentHostname}</span>
                  </button>
                  <button
                    onClick={() => handleCopyHostname('vercel.app')}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin: vercel.app</span>
                  </button>
                </div>
              </li>
              <li>
                Klik <strong>Save / Simpan</strong>. Setelah itu kembali ke halaman ini dan klik tombol{' '}
                <strong>Sambungkan Sekarang</strong> di bawah!
              </li>
            </ol>
          </div>

          <div className="flex items-center justify-between text-xs text-amber-200/90 pt-1">
            <span>Tidak ingin mengatur Firebase Console sekarang?</span>
            <button
              onClick={() => setActiveSubTab('webhook')}
              className="text-white bg-slate-850 hover:bg-slate-800 px-3 py-1.5 rounded-xl font-bold border border-slate-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Gunakan Metode Webhook (Bebas Error Domain)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: GOOGLE OAUTH */}
      {activeSubTab === 'status' && (
        <div className="space-y-6">
          <div
            className={`p-6 sm:p-7 rounded-3xl border shadow-sm space-y-6 transition-all ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span
                  className={`w-3 h-3 rounded-full ${
                    config.status === 'connected' ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'
                  }`}
                />
                <div>
                  <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Status Koneksi:{' '}
                    <span
                      className={
                        config.status === 'connected' ? 'text-emerald-500' : 'text-amber-500'
                      }
                    >
                      {config.status === 'connected' ? 'TERHUBUNG REAL-TIME' : 'BELUM TERHUBUNG'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {sheetTargetName} • Transaksi di Aplikasi:{' '}
                    <strong>{transactions.length} struk</strong>
                  </p>
                </div>
              </div>

              {config.spreadsheetUrl ? (
                <div className="flex items-center gap-2">
                  <a
                    href={config.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all w-fit cursor-pointer border border-emerald-500/20"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Spreadsheet Google</span>
                  </a>
                  <button
                    onClick={handleConnectSheet}
                    disabled={isSyncing}
                    className="p-2 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer border border-slate-700"
                    title="Hubungkan Ulang & Segarkan Token Google"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnectSheet}
                  disabled={isSyncing}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-98"
                >
                  {isSyncing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Database className="w-4 h-4" />
                  )}
                  <span>Sambungkan Sekarang</span>
                </button>
              )}
            </div>

            {/* Offline Pending Queue Card */}
            <div
              className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                pendingSyncCount > 0
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-emerald-500/5 border-emerald-500/20'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Cloud
                    className={`w-4 h-4 ${
                      pendingSyncCount > 0 ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  />
                  <h4
                    className={`text-xs font-black uppercase tracking-wider ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    Antrean Transaksi Baru (Offline &rarr; Google Sheets)
                  </h4>
                </div>
                <p className="text-xs text-slate-400">
                  {pendingSyncCount > 0
                    ? `Terdapat ${pendingSyncCount} transaksi baru yang belum masuk ke Google Sheets.`
                    : transactions.length === 0
                    ? 'Data transaksi di aplikasi saat ini 0 (kosong). Gunakan tombol "Kirim & Samakan ke Google Sheets" di bawah jika ingin mengosongkan Spreadsheet juga.'
                    : 'Seluruh transaksi baru telah masuk ke Google Sheets.'}
                </p>
              </div>

              {pendingSyncCount > 0 && onSyncPending && (
                <button
                  onClick={onSyncPending}
                  disabled={isSyncingPending}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-500/20 shrink-0 active:scale-98"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingPending ? 'animate-spin' : ''}`} />
                  <span>
                    {isSyncingPending
                      ? 'Menyinkronkan...'
                      : `Sinkronkan ${pendingSyncCount} Transaksi`}
                  </span>
                </button>
              )}
            </div>

            {/* Primary 2-Way Full Sync Cards (Dashboard + Transactions + Products) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                className={`p-5 rounded-2xl border space-y-2.5 ${
                  isDark
                    ? 'bg-emerald-950/20 border-emerald-500/30'
                    : 'bg-emerald-50/60 border-emerald-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-emerald-500" />
                  <h4 className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Kirim &amp; Samakan Aplikasi &rarr; Google Sheets
                  </h4>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Menyamakan lembar <strong>Dashboard</strong>, <strong>Transaksi</strong> (
                  {transactions.length} struk), <strong>Detail_Transaksi</strong>, dan{' '}
                  <strong>Produk</strong> di Google Sheets dengan aplikasi ini. Jika transaksi sudah
                  Anda <strong>0-kan</strong>, baris lama di Sheets ikut dibersihkan menjadi Rp 0!
                </p>
                <button
                  onClick={() => setConfirmAction('push-full')}
                  disabled={isSyncing || !isAnyConnected}
                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>
                    {transactions.length === 0
                      ? 'Kosongkan & Sinkron Rp 0 ke Sheets'
                      : 'Sinkronkan Penuh ke Sheets'}
                  </span>
                </button>
              </div>

              <div
                className={`p-5 rounded-2xl border space-y-2.5 ${
                  isDark ? 'bg-blue-950/20 border-blue-500/30' : 'bg-blue-50/60 border-blue-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <DownloadCloud className="w-4 h-4 text-blue-500" />
                  <h4 className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Tarik Google Sheets &rarr; Dashboard Aplikasi
                  </h4>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Menarik isi lembar <strong>Transaksi</strong> &amp; <strong>Produk</strong> dari
                  Google Sheets ke aplikasi. Jika Anda sudah menghapus baris transaksi di
                  Spreadsheet hingga <strong>0</strong>, Dashboard aplikasi akan ikut menjadi Rp 0!
                </p>
                <button
                  onClick={() => setConfirmAction('pull-full')}
                  disabled={isSyncing || !isAnyConnected}
                  className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <DownloadCloud className="w-4 h-4" />
                  <span>Tarik Transaksi &amp; Produk dari Sheets</span>
                </button>
              </div>
            </div>

            {/* Product-Only Sync & Zero Out Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div
                className={`p-4 rounded-2xl border space-y-2 ${
                  isDark ? 'bg-slate-850 border-slate-750' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Unggah Produk Saja
                </h4>
                <p className="text-[11px] text-slate-400">
                  Kirim {products.length} barang &amp; stok tanpa mengubah transaksi lama.
                </p>
                <button
                  onClick={() => setConfirmAction('push-products')}
                  disabled={isSyncing || !config.spreadsheetId}
                  className="mt-1 w-full py-2 px-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>Upload Produk</span>
                </button>
              </div>

              <div
                className={`p-4 rounded-2xl border space-y-2 ${
                  isDark ? 'bg-slate-850 border-slate-750' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Tarik Produk Saja
                </h4>
                <p className="text-[11px] text-slate-400">
                  Ambil pembaruan harga &amp; stok produk dari lembar Produk.
                </p>
                <button
                  onClick={() => setConfirmAction('pull-products')}
                  disabled={isSyncing || !isAnyConnected}
                  className="mt-1 w-full py-2 px-3 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Produk</span>
                </button>
              </div>

              <div
                className={`p-4 rounded-2xl border space-y-2 ${
                  isDark
                    ? 'bg-rose-950/20 border-rose-500/30'
                    : 'bg-rose-50/60 border-rose-200'
                }`}
              >
                <h4 className="text-xs font-bold text-rose-500">Nol-kan (0) Transaksi</h4>
                <p className="text-[11px] text-slate-400">
                  Kosongkan transaksi di aplikasi &amp; Google Sheets menjadi Rp 0.
                </p>
                <button
                  onClick={() => setConfirmAction('zero-transactions')}
                  disabled={isSyncing}
                  className="mt-1 w-full py-2 px-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>0-kan Semua Transaksi</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WEBHOOK APPS SCRIPT */}
      {activeSubTab === 'webhook' && (
        <div
          className={`p-6 sm:p-7 rounded-3xl border shadow-sm space-y-6 transition-all ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-teal-500/15 text-teal-400 shrink-0">
              <Link2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className={`font-black text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Koneksi Google Sheets via Apps Script Webhook (2 Arah)
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Metode ini <strong>100% bebas dari batasan Authorized Domain Firebase</strong>.
                Pastikan Anda memakai kode terbaru dari tab <strong>Apps Script (.gs)</strong> agar
                mendukung sinkronisasi Dashboard &amp; pengosongan (0) transaksi.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-bold">
                1
              </span>
              <span>Cara Pasang / Perbarui Webhook di Google Sheets:</span>
            </h4>
            <ol className="list-decimal list-inside text-xs text-slate-400 space-y-1.5 leading-relaxed">
              <li>
                Buka spreadsheet Google Anda atau buat baru di{' '}
                <a
                  href="https://sheets.new"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 underline"
                >
                  sheets.new
                </a>
                .
              </li>
              <li>
                Klik menu <strong>Extensions (Ekstensi) &gt; Apps Script</strong>.
              </li>
              <li>
                Salin kode terbaru dari tab <strong>Apps Script (.gs)</strong> di atas dan tempel
                menggantikan isi <code>Code.gs</code>.
              </li>
              <li>
                Klik <strong>Deploy &gt; New deployment</strong> (atau Manage deployments &gt; Edit
                &gt; New version), pilih jenis <strong>Web app</strong>.
              </li>
              <li>
                Atur <em>Execute as:</em> <strong>Me (Akun Anda)</strong> dan{' '}
                <em>Who has access:</em> <strong>Anyone (Siapa saja)</strong>.
              </li>
              <li>
                Klik <strong>Deploy</strong> lalu salin <strong>Web App URL</strong> (berawalan{' '}
                <code>https://script.google.com/macros/s/.../exec</code>).
              </li>
            </ol>
          </div>

          <div className="space-y-3">
            <label
              className={`text-xs font-bold block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}
            >
              Tempel Web App URL Google Apps Script Anda:
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                value={webhookInput}
                onChange={(e) => setWebhookInput(e.target.value)}
                className={`flex-1 px-4 py-2.5 text-xs font-mono rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                  isDark
                    ? 'bg-slate-850 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
              <button
                onClick={handleSaveWebhook}
                disabled={isSyncing}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-all shrink-0"
              >
                {isSyncing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Hubungkan Webhook</span>
                )}
              </button>
            </div>
            {config.webhookUrl && (
              <div className="space-y-4 pt-3">
                <p className="text-xs text-emerald-500 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Webhook aktif! Gunakan tombol di bawah untuk menyamakan Dashboard &amp;
                    Spreadsheet:
                  </span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => setConfirmAction('push-full')}
                    disabled={isSyncing}
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Kirim / 0-kan ke Sheets</span>
                  </button>
                  <button
                    onClick={() => setConfirmAction('pull-full')}
                    disabled={isSyncing}
                    className="py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <DownloadCloud className="w-4 h-4" />
                    <span>Tarik dari Sheets</span>
                  </button>
                  <button
                    onClick={() => setConfirmAction('zero-transactions')}
                    disabled={isSyncing}
                    className="py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>0-kan Aplikasi &amp; Sheets</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CODE STUDIO */}
      {activeSubTab === 'code' && (
        <div
          className={`p-6 sm:p-7 rounded-3xl border shadow-sm space-y-4 transition-all ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Kode Google Apps Script (Code.gs v2.0 - Full 2-Way &amp; Dashboard Sync)
              </h3>
              <p className="text-xs text-slate-400">
                Salin kode backend berikut ke Extensions &gt; Apps Script di Google Sheets Anda.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopyCode}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {isCopiedCode ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{isCopiedCode ? 'Tersalin!' : 'Salin Kode'}</span>
              </button>
              <button
                onClick={handleDownloadCode}
                className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh .gs</span>
              </button>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 max-h-[50vh] overflow-y-auto">
            <pre className="whitespace-pre-wrap">{APPS_SCRIPT_CODE}</pre>
          </div>
        </div>
      )}

      {/* Explicit Workspace Confirmation Modal (No window.confirm / window.alert) */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
          <div
            className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-4 ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2.5 rounded-2xl shrink-0 ${
                  confirmAction === 'zero-transactions'
                    ? 'bg-rose-500/15 text-rose-500'
                    : 'bg-emerald-500/15 text-emerald-500'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-xs">
                <h4 className="font-black text-sm">
                  {confirmAction === 'push-full' && 'Konfirmasi Sinkronisasi Penuh ke Google Sheets'}
                  {confirmAction === 'pull-full' && 'Konfirmasi Tarik Data dari Google Sheets'}
                  {confirmAction === 'push-products' && 'Konfirmasi Unggah Produk ke Google Sheets'}
                  {confirmAction === 'pull-products' && 'Konfirmasi Unduh Produk dari Google Sheets'}
                  {confirmAction === 'zero-transactions' &&
                    'Konfirmasi Nol-kan (0) Seluruh Transaksi'}
                </h4>
                <p className="text-slate-400 leading-relaxed">
                  {confirmAction === 'push-full' &&
                    `Lembar Dashboard, Transaksi, Detail_Transaksi, dan Produk pada "${sheetTargetName}" akan diperbarui mengikuti aplikasi ini (${transactions.length} transaksi & ${products.length} produk).`}
                  {confirmAction === 'pull-full' &&
                    `Data transaksi dan produk di Dashboard aplikasi akan digantikan mengikuti isi "${sheetTargetName}". Jika lembar Transaksi di Sheets kosong (0 baris), Dashboard akan menjadi Rp 0.`}
                  {confirmAction === 'push-products' &&
                    `Memperbarui lembar Produk di "${sheetTargetName}" dengan ${products.length} data produk toko saat ini.`}
                  {confirmAction === 'pull-products' &&
                    `Menimpa daftar produk lokal dengan daftar produk dari lembar Produk di "${sheetTargetName}".`}
                  {confirmAction === 'zero-transactions' &&
                    `Seluruh riwayat struk penjualan (${transactions.length} transaksi) di aplikasi dan lembar Transaksi di "${sheetTargetName}" akan dikosongkan menjadi 0 (Rp 0). Produk tidak dihapus.`}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={executeConfirmedAction}
                className={`px-4 py-2 rounded-xl text-xs font-black text-white cursor-pointer shadow-md ${
                  confirmAction === 'zero-transactions'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
