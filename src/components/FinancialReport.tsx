import React, { useState } from 'react';
import {
  Download,
  Calendar,
  DollarSign,
  Printer,
  Search,
  QrCode,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { StoreProfile, Transaction, UserRole } from '../types';
import { formatRupiah, getLocalDateString } from '../services/storage';
import { exportDailyReportPDF } from '../services/pdfExport';
import { ThermalReceiptModal } from './ThermalReceiptModal';
import { SyncModalInitialMode } from './SheetsSyncModal';

interface FinancialReportProps {
  transactions: Transaction[];
  storeProfile: StoreProfile;
  userRole: UserRole;
  onOpenSyncModal?: (mode?: SyncModalInitialMode) => void;
  isDark?: boolean;
}

export const FinancialReport: React.FC<FinancialReportProps> = ({
  transactions,
  storeProfile,
  userRole,
  onOpenSyncModal,
  isDark = false,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateString());
  const [searchTrx, setSearchTrx] = useState('');
  const [methodFilter, setMethodFilter] = useState<'ALL' | 'TUNAI' | 'QRIS'>('ALL');
  const [viewReceiptTx, setViewReceiptTx] = useState<Transaction | null>(null);

  // Filter transactions by selected local date
  const dateTransactions = transactions.filter((t) => getLocalDateString(t.date) === selectedDate);
  const filteredTransactions = dateTransactions.filter((t) => {
    const matchesSearch =
      t.id.toLowerCase().includes(searchTrx.toLowerCase()) ||
      t.cashierName.toLowerCase().includes(searchTrx.toLowerCase()) ||
      t.items.some((i) => i.name.toLowerCase().includes(searchTrx.toLowerCase()));
    const matchesMethod = methodFilter === 'ALL' || t.paymentMethod === methodFilter;
    return matchesSearch && matchesMethod;
  });

  // Financial calculations
  const totalOmset = dateTransactions.reduce((acc, t) => acc + t.total, 0);
  const totalHPP = dateTransactions.reduce((acc, t) => {
    return acc + t.items.reduce((sum, item) => sum + (item.costPrice || 0) * item.quantity, 0);
  }, 0);
  const labaKotor = totalOmset - totalHPP;
  const marginPct = totalOmset > 0 ? Math.round((labaKotor / totalOmset) * 100) : 0;
  const aov = dateTransactions.length > 0 ? Math.round(totalOmset / dateTransactions.length) : 0;

  const tunaiTrx = dateTransactions.filter((t) => t.paymentMethod === 'TUNAI');
  const qrisTrx = dateTransactions.filter((t) => t.paymentMethod === 'QRIS');
  const totalTunai = tunaiTrx.reduce((acc, t) => acc + t.total, 0);
  const totalQRIS = qrisTrx.reduce((acc, t) => acc + t.total, 0);
  const tunaiPct = totalOmset > 0 ? Math.round((totalTunai / totalOmset) * 100) : 0;
  const qrisPct = totalOmset > 0 ? Math.round((totalQRIS / totalOmset) * 100) : 0;

  const handleExportPDF = () => {
    exportDailyReportPDF(selectedDate, dateTransactions, storeProfile);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-7 rounded-3xl border shadow-sm transition-all ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
        }`}
      >
        <div>
          <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Laporan Keuangan & Penjualan Harian
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Analisis omset penjualan, HPP modal, laba kotor, rincian QRIS/Tunai, dan ekspor resmi ke format PDF.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs border ${
              isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4 text-emerald-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent font-bold focus:outline-hidden cursor-pointer"
            />
          </div>
          {userRole === 'admin' && onOpenSyncModal && (
            <>
              <button
                onClick={() => onOpenSyncModal('hub')}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 transition-all cursor-pointer"
                title="Sinkronkan Laporan & Transaksi dengan Google Sheets"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sinkron Sheets</span>
              </button>
              <button
                onClick={() => onOpenSyncModal('confirm-zero')}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-all cursor-pointer"
                title="Kosongkan / 0-kan seluruh transaksi"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>0-kan Transaksi</span>
              </button>
            </>
          )}
          {/* Export PDF Button */}
          <button
            onClick={handleExportPDF}
            disabled={dateTransactions.length === 0}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider shadow-sm transition-all cursor-pointer active:scale-98 ${
              dateTransactions.length === 0
                ? 'bg-slate-300 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Ekspor Format PDF</span>
          </button>
        </div>
      </div>

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className={`p-5 rounded-3xl border shadow-sm ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
          }`}
        >
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Omset Penjualan
          </span>
          <div className={`text-2xl font-black font-mono tracking-tight mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {formatRupiah(totalOmset)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Dari <strong>{dateTransactions.length}</strong> transaksi pada tanggal ini
          </div>
        </div>

        <div
          className={`p-5 rounded-3xl border shadow-sm ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
          }`}
        >
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Harga Pokok Modal (HPP)
          </span>
          <div className={`text-2xl font-black font-mono tracking-tight mt-1 text-slate-400`}>
            {formatRupiah(totalHPP)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Total biaya modal barang yang terjual
          </div>
        </div>

        <div
          className={`p-5 rounded-3xl border shadow-sm ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
          }`}
        >
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Estimasi Laba Kotor
          </span>
          <div className="text-2xl font-black font-mono tracking-tight text-emerald-500 mt-1">
            {formatRupiah(labaKotor)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Margin keuntungan bersih: <strong>{marginPct}%</strong>
          </div>
        </div>

        <div
          className={`p-5 rounded-3xl border shadow-sm ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
          }`}
        >
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Rata-rata Transaksi (AOV)
          </span>
          <div className="text-2xl font-black font-mono tracking-tight text-blue-500 mt-1">
            {formatRupiah(aov)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Rata-rata belanja per struk kasir
          </div>
        </div>
      </div>

      {/* Payment Method Distribution */}
      <div
        className={`p-6 rounded-3xl border shadow-sm ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
        }`}
      >
        <h3 className={`font-black text-sm uppercase tracking-wider mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Rincian Arus Kas Berdasarkan Metode Bayar
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between ${
              isDark ? 'bg-slate-850/60 border-slate-750' : 'bg-slate-50 border-slate-200/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-500">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400">Pembayaran Tunai (Cash)</span>
                <div className={`text-base font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {formatRupiah(totalTunai)}
                </div>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-500 font-mono">
              {tunaiTrx.length} Trx ({tunaiPct}%)
            </span>
          </div>

          <div
            className={`p-4 rounded-2xl border flex items-center justify-between ${
              isDark ? 'bg-slate-850/60 border-slate-750' : 'bg-slate-50 border-slate-200/80'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-500">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400">Pembayaran QRIS Digital</span>
                <div className={`text-base font-black font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {formatRupiah(totalQRIS)}
                </div>
              </div>
            </div>
            <span className="text-xs font-bold text-blue-500 font-mono">
              {qrisTrx.length} Trx ({qrisPct}%)
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Transactions List */}
      <div
        className={`p-6 rounded-3xl border shadow-sm ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className={`font-black text-sm uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Daftar Struk Penjualan ({filteredTransactions.length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Rincian struk transaksi kasir pada {new Date(selectedDate).toLocaleDateString('id-ID', { dateStyle: 'full' })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari ID Trx / Kasir..."
                value={searchTrx}
                onChange={(e) => setSearchTrx(e.target.value)}
                className={`pl-8 pr-3 py-1.5 text-xs rounded-xl border focus:outline-hidden ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
            <div className="flex gap-1">
              {(['ALL', 'TUNAI', 'QRIS'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMethodFilter(m)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    methodFilter === m
                      ? 'bg-emerald-600 text-white'
                      : isDark
                      ? 'bg-slate-800 text-slate-400 hover:text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
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
                <th className="pb-3 px-3">No. Trx</th>
                <th className="pb-3 px-3">Waktu</th>
                <th className="pb-3 px-3">Kasir</th>
                <th className="pb-3 px-3">Daftar Barang</th>
                <th className="pb-3 px-3">Metode</th>
                <th className="pb-3 px-3 text-right">Subtotal</th>
                <th className="pb-3 px-3 text-right">Diskon</th>
                <th className="pb-3 px-3 text-right">Total Akhir</th>
                <th className="pb-3 px-3 text-center">Status Sheet</th>
                <th className="pb-3 px-3 text-center">Struk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400">
                    Tidak ada transaksi pada filter tanggal atau metode ini.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-colors"
                  >
                    <td className="py-3 px-3 font-mono font-bold text-emerald-500">{tx.id}</td>
                    <td className="py-3 px-3 text-slate-400 font-mono">
                      {new Date(tx.date).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-3 font-medium">{tx.cashierName}</td>
                    <td className="py-3 px-3 max-w-[220px]">
                      <div className="truncate text-slate-400" title={tx.items.map((i) => `${i.name} (${i.quantity})`).join(', ')}>
                        {tx.items.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
                      </div>
                    </td>
                    <td className="py-3 px-3">
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
                    <td className="py-3 px-3 text-right font-mono text-slate-400">
                      {formatRupiah(tx.subtotal)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-rose-500">
                      {tx.discount > 0 ? `-${formatRupiah(tx.discount)}` : '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold">
                      {formatRupiah(tx.total)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          tx.syncedToSheet
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}
                        title={
                          tx.syncedToSheet
                            ? 'Data telah tersinkron di Google Sheets'
                            : 'Menunggu sinkronisasi (Tersimpan aman di perangkat lokal)'
                        }
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            tx.syncedToSheet ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                          }`}
                        />
                        <span>{tx.syncedToSheet ? 'Tersinkron' : 'Pending Offline'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => setViewReceiptTx(tx)}
                        className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="Cetak Ulang Struk Thermal"
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

      {/* Receipt Modal Trigger */}
      {viewReceiptTx && (
        <ThermalReceiptModal
          transaction={viewReceiptTx}
          storeProfile={storeProfile}
          onClose={() => setViewReceiptTx(null)}
        />
      )}
    </div>
  );
};
