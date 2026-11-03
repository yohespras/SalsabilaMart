import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Printer,
  Copy,
  Check,
  Barcode as BarcodeIcon,
  Tag,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Product, StoreProfile } from '../types';
import {
  generateBarcodeDataUrl,
  generateBarcodeStickerDataUrl,
  downloadBarcodeImageFile,
  downloadMultipleBarcodeImages,
  printBarcodeStickers,
} from '../services/barcodeGenerator';
import { formatRupiah } from '../services/storage';

interface BarcodeDownloadModalProps {
  product?: Product | null;
  allProducts?: Product[];
  storeProfile: StoreProfile;
  isDark?: boolean;
  onClose: () => void;
}

export const BarcodeDownloadModal: React.FC<BarcodeDownloadModalProps> = ({
  product,
  allProducts = [],
  storeProfile,
  isDark = false,
  onClose,
}) => {
  const [downloadMode, setDownloadMode] = useState<'pure_barcode' | 'sticker'>('pure_barcode');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [batchProgress, setBatchProgress] = useState<number>(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(
    product || allProducts[0] || null
  );

  // Update preview when mode or selected product changes
  useEffect(() => {
    if (!selectedProduct) return;
    if (downloadMode === 'pure_barcode') {
      const url = generateBarcodeDataUrl(selectedProduct.barcode);
      setPreviewUrl(url);
    } else {
      const url = generateBarcodeStickerDataUrl(selectedProduct, storeProfile.name);
      setPreviewUrl(url);
    }
  }, [selectedProduct, downloadMode, storeProfile.name]);

  const handleCopyCode = () => {
    if (!selectedProduct) return;
    navigator.clipboard.writeText(selectedProduct.barcode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadSingle = () => {
    if (!selectedProduct) return;
    downloadBarcodeImageFile(selectedProduct, downloadMode, storeProfile.name);
  };

  const handleDownloadAll = async () => {
    if (allProducts.length === 0) return;
    setIsBatchDownloading(true);
    setBatchProgress(0);

    for (let i = 0; i < allProducts.length; i++) {
      downloadBarcodeImageFile(allProducts[i], downloadMode, storeProfile.name);
      setBatchProgress(Math.round(((i + 1) / allProducts.length) * 100));
      await new Promise((res) => setTimeout(res, 350));
    }

    setIsBatchDownloading(false);
  };

  const handlePrint = () => {
    const listToPrint = selectedProduct ? [selectedProduct] : allProducts;
    printBarcodeStickers(listToPrint, storeProfile.name);
  };

  const handlePrintAll = () => {
    if (allProducts.length === 0) return;
    printBarcodeStickers(allProducts, storeProfile.name);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div
        className={`rounded-3xl shadow-2xl max-w-xl w-full border overflow-hidden ${
          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`p-5 sm:p-6 border-b flex items-center justify-between ${
            isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-100 bg-slate-50/80'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <BarcodeIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                Download Gambar Barcode
              </h2>
              <p className="text-xs text-slate-400">
                Simpan gambar barcode inventaris untuk stiker rak & scan kasir
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Product selector if accessed from inventory general menu */}
          {allProducts.length > 1 && (
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">
                Pilih Produk
              </label>
              <select
                value={selectedProduct?.id || ''}
                onChange={(e) => {
                  const found = allProducts.find((p) => p.id === e.target.value);
                  if (found) setSelectedProduct(found);
                }}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-hidden ${
                  isDark
                    ? 'bg-slate-850 border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                {allProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — Barcode: {p.barcode} ({formatRupiah(p.price)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Mode Switch: Pure Barcode vs Sticker Label */}
          <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setDownloadMode('pure_barcode')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                downloadMode === 'pure_barcode'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarcodeIcon className="w-4 h-4" />
              <span>Gambar Barcode Saja</span>
            </button>
            <button
              type="button"
              onClick={() => setDownloadMode('sticker')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                downloadMode === 'sticker'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Label Stiker Lengkap</span>
            </button>
          </div>

          {/* Barcode Image Preview Card */}
          <div
            className={`p-6 rounded-3xl border text-center flex flex-col items-center justify-center min-h-[220px] transition-all relative overflow-hidden ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50/70 border-slate-200'
            }`}
          >
            {previewUrl ? (
              <div className="space-y-3 max-w-full">
                <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200 inline-block max-w-full overflow-hidden">
                  <img
                    src={previewUrl}
                    alt={selectedProduct?.barcode || 'barcode'}
                    className="max-h-48 max-w-full object-contain mx-auto"
                  />
                </div>

                <div className="flex items-center justify-center gap-2 pt-1">
                  <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                    {selectedProduct?.barcode}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    title="Salin nomor barcode"
                  >
                    {isCopied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Memuat gambar barcode...</p>
            )}
          </div>

          {/* Details & Specifications */}
          {selectedProduct && (
            <div
              className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
                isDark ? 'bg-slate-850/60 border-slate-800' : 'bg-slate-100/70 border-slate-200'
              }`}
            >
              <div>
                <div className="font-bold">{selectedProduct.name}</div>
                <div className="text-[11px] text-slate-400">
                  Stok: {selectedProduct.stock} {selectedProduct.unit} | Kategori:{' '}
                  {selectedProduct.category}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-black text-emerald-500">
                  {formatRupiah(selectedProduct.price)}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">Format: CODE128</div>
              </div>
            </div>
          )}

          {/* Batch Progress Bar if running */}
          {isBatchDownloading && (
            <div className="space-y-1.5 p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20">
              <div className="flex justify-between text-xs font-bold text-blue-400">
                <span>Mengunduh gambar barcode semua produk...</span>
                <span>{batchProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-200"
                  style={{ width: `${batchProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleDownloadSingle}
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>
                  {downloadMode === 'pure_barcode'
                    ? 'Download Gambar Barcode Saja (.PNG)'
                    : 'Download Label Stiker Toko (.PNG)'}
                </span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 active:scale-98 text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-300" />
                <span>Cetak / Print Langsung</span>
              </button>
            </div>

            {/* Mass / All products actions */}
            {allProducts.length > 1 && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400 font-medium">
                  Ada {allProducts.length} produk di inventaris
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isBatchDownloading}
                    onClick={handleDownloadAll}
                    className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    title="Unduh seluruh gambar barcode produk satu per satu"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Download Semua ({allProducts.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintAll}
                    className="px-3 py-1.5 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 text-blue-500 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    title="Cetak seluruh label produk dalam satu lembar kertas stiker"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak Semua Label</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
