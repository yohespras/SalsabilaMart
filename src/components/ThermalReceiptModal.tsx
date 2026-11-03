import React, { useState } from 'react';
import { Printer, Copy, Check, X, Download } from 'lucide-react';
import { StoreProfile, Transaction } from '../types';
import { formatRupiah } from '../services/storage';

interface ThermalReceiptModalProps {
  transaction: Transaction;
  storeProfile: StoreProfile;
  onClose: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({
  transaction,
  storeProfile,
  onClose,
}) => {
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm'>(
    storeProfile.paperSize || '58mm'
  );
  const [copied, setCopied] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const generateRawText = () => {
    const divider =
      paperSize === '58mm'
        ? '--------------------------------'
        : '------------------------------------------------';
    const lines = [
      storeProfile.name.toUpperCase(),
      storeProfile.address,
      `Telp: ${storeProfile.phone}`,
      divider,
      `No. Trx : ${transaction.id}`,
      `Waktu   : ${new Date(transaction.date).toLocaleString('id-ID')}`,
      `Kasir   : ${transaction.cashierName}`,
      divider,
      ...transaction.items.map(
        (it) =>
          `${it.name}\n  ${it.quantity} x ${formatRupiah(it.price).replace('Rp', '').trim()} = ${formatRupiah(it.subtotal).replace('Rp', '').trim()}`
      ),
      divider,
      `Subtotal : ${formatRupiah(transaction.subtotal)}`,
      transaction.discount > 0 ? `Diskon   : -${formatRupiah(transaction.discount)}` : null,
      `TOTAL    : ${formatRupiah(transaction.total)}`,
      `Bayar    : ${transaction.paymentMethod}`,
      transaction.paymentMethod === 'TUNAI'
        ? `Tunai    : ${formatRupiah(transaction.amountPaid)}\nKembali  : ${formatRupiah(transaction.change)}`
        : `Ref QRIS : ${transaction.qrisRef || '-'}`,
      divider,
      storeProfile.receiptHeader || 'Terima Kasih Atas Kunjungan Anda',
      storeProfile.receiptFooter,
      '\n\n',
    ].filter(Boolean);
    return lines.join('\n');
  };

  const handleCopyRaw = () => {
    const text = generateRawText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    const text = generateRawText();
    const element = document.createElement('a');
    const file = new Blob([text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `Struk_${transaction.id}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/15 text-emerald-500 rounded-xl">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm">Cetak Struk Thermal</h3>
              <p className="text-[11px] text-slate-400">ESC/POS & Direct Thermal Print</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Paper Size selector */}
            <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 text-xs font-bold">
              <button
                onClick={() => setPaperSize('58mm')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  paperSize === '58mm'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                58mm
              </button>
              <button
                onClick={() => setPaperSize('80mm')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  paperSize === '80mm'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                80mm
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Thermal Receipt Paper Container */}
        <div className="p-6 bg-slate-100 dark:bg-slate-950 max-h-[58vh] overflow-y-auto flex justify-center">
          <div
            id="thermal-receipt"
            className={`bg-white text-slate-950 p-5 shadow-lg border border-slate-200 text-xs leading-tight transition-all rounded-sm ${
              paperSize === '58mm' ? 'w-[280px]' : 'w-[360px]'
            }`}
            style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}
          >
            {/* Shop Header */}
            <div className="text-center mb-3">
              <div className="font-black text-sm tracking-wide">{storeProfile.name.toUpperCase()}</div>
              <div className="text-[11px] text-slate-600 mt-0.5">{storeProfile.address}</div>
              <div className="text-[11px] text-slate-600">Telp: {storeProfile.phone}</div>
            </div>

            <div className="border-t border-dashed border-slate-400 my-2" />

            {/* Trx Meta */}
            <div className="text-[11px] space-y-0.5">
              <div className="flex justify-between">
                <span>No:</span>
                <span className="font-bold">{transaction.id}</span>
              </div>
              <div className="flex justify-between">
                <span>Tgl:</span>
                <span>
                  {new Date(transaction.date).toLocaleDateString('id-ID')}{' '}
                  {new Date(transaction.date).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Kasir:</span>
                <span>{transaction.cashierName.split(' ')[0]}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-400 my-2" />

            {/* Item List */}
            <div className="space-y-2 py-1">
              {transaction.items.map((item, idx) => (
                <div key={idx} className="text-[11px]">
                  <div className="font-medium truncate">{item.name}</div>
                  <div className="flex justify-between text-slate-600">
                    <span>
                      {item.quantity} x {formatRupiah(item.price).replace('Rp', '').trim()}
                    </span>
                    <span className="font-bold text-slate-900">
                      {formatRupiah(item.subtotal).replace('Rp', '').trim()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-slate-400 my-2" />

            {/* Totals */}
            <div className="text-[11px] space-y-1">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatRupiah(transaction.subtotal)}</span>
              </div>
              {transaction.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Diskon</span>
                  <span>-{formatRupiah(transaction.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-300">
                <span>TOTAL</span>
                <span className="text-sm font-black">{formatRupiah(transaction.total)}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span>Metode</span>
                <span className="font-semibold">{transaction.paymentMethod}</span>
              </div>
              {transaction.paymentMethod === 'TUNAI' ? (
                <>
                  <div className="flex justify-between">
                    <span>Tunai</span>
                    <span>{formatRupiah(transaction.amountPaid)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-800">
                    <span>Kembali</span>
                    <span>{formatRupiah(transaction.change)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>Ref QRIS:</span>
                  <span className="font-mono">{transaction.qrisRef || '-'}</span>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-slate-400 my-2.5" />

            {/* Footer Messages */}
            <div className="text-center text-[10px] text-slate-600 space-y-1">
              <p className="font-semibold">
                {storeProfile.receiptHeader || 'Terima Kasih Atas Kunjungan Anda'}
              </p>
              <p>{storeProfile.receiptFooter || 'Barang yang dibeli tidak dapat ditukar'}</p>
              <p className="text-[9px] text-slate-400 pt-1">KasirPintar POS System</p>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyRaw}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Salin teks struk"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{copied ? 'Tersalin' : 'Salin'}</span>
            </button>
            <button
              onClick={handleDownloadTxt}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Unduh file .txt struk"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Unduh</span>
            </button>
          </div>
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Struk Sekarang</span>
          </button>
        </div>
      </div>
    </div>
  );
};
