import React, { useState } from 'react';
import {
  Store,
  Save,
  Printer,
  QrCode,
  CheckCircle2,
  HardDrive,
  Download,
  Upload,
  Terminal,
  Cloud,
} from 'lucide-react';
import { StoreProfile } from '../types';
import {
  downloadLocalDataBackupFile,
  downloadWindowsBatchRunner,
  importAllLocalDataBackup,
} from '../services/storage';

interface StoreSettingsProps {
  storeProfile: StoreProfile;
  onSaveProfile: (profile: StoreProfile) => void;
  isCloudSynced?: boolean;
  onConnectCloud?: () => void;
  isDark?: boolean;
}

export const StoreSettings: React.FC<StoreSettingsProps> = ({
  storeProfile,
  onSaveProfile,
  isCloudSynced = false,
  onConnectCloud,
  isDark = false,
}) => {
  const [formData, setFormData] = useState<StoreProfile>({ ...storeProfile });
  const [isSaved, setIsSaved] = useState(false);
  const [restoreFeedback, setRestoreFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  React.useEffect(() => {
    setFormData({ ...storeProfile });
  }, [storeProfile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(formData);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Header */}
      <div
        className={`p-6 sm:p-7 rounded-3xl border shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/15 text-emerald-500 rounded-2xl">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Pengaturan Toko & Format Struk Thermal
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Sesuaikan identitas profil toko, konfigurasi QRIS digital, serta format cetak thermal printer 58mm/80mm.
            </p>
          </div>
        </div>
        <div className="shrink-0">
          {isCloudSynced ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Cloud className="w-3.5 h-3.5" />
              <span>Sinkron Lintas Perangkat Aktif</span>
            </span>
          ) : onConnectCloud ? (
            <button
              type="button"
              onClick={onConnectCloud}
              className="px-3.5 py-2 rounded-2xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Hubungkan Sinkron Multi-Perangkat</span>
            </button>
          ) : null}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identitas Toko */}
        <div
          className={`p-6 sm:p-7 rounded-3xl border shadow-sm space-y-4 transition-all ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
          }`}
        >
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Store className="w-4 h-4 text-emerald-500" />
            <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Identitas & Informasi Toko
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold block mb-1">Nama Toko *</label>
              <input
                type="text"
                required
                maxLength={120}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-hidden ${
                  isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                }`}
              />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">Slogan / Tagline</label>
              <input
                type="text"
                maxLength={200}
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-hidden ${
                  isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                }`}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold block mb-1">Alamat Lengkap Toko *</label>
              <input
                type="text"
                required
                maxLength={300}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-hidden ${
                  isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                }`}
              />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">Nomor Telepon / WhatsApp</label>
              <input
                type="text"
                maxLength={40}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-hidden ${
                  isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                }`}
              />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">Jam Operasional</label>
              <input
                type="text"
                maxLength={100}
                value={formData.operatingHours}
                onChange={(e) => setFormData({ ...formData, operatingHours: e.target.value })}
                className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-hidden ${
                  isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Konfigurasi QRIS & Pembayaran */}
        <div
          className={`p-6 sm:p-7 rounded-3xl border shadow-sm space-y-4 transition-all ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
          }`}
        >
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <QrCode className="w-4 h-4 text-blue-500" />
            <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Konfigurasi QRIS Digital
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold block mb-1">
                NMID QRIS (National Merchant ID)
              </label>
              <input
                type="text"
                maxLength={100}
                value={formData.qrisNmid || ''}
                onChange={(e) => setFormData({ ...formData, qrisNmid: e.target.value })}
                placeholder="Masukkan NMID QRIS Toko Anda"
                className={`w-full px-3.5 py-2 text-xs font-mono rounded-xl border focus:outline-hidden ${
                  isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                }`}
              />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">Nama Merchant QRIS</label>
              <input
                type="text"
                value={formData.name}
                disabled
                className={`w-full px-3.5 py-2 text-xs rounded-xl border opacity-70 ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Format Cetak Struk Thermal */}
        <div
          className={`p-6 sm:p-7 rounded-3xl border shadow-sm space-y-4 transition-all ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
          }`}
        >
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Printer className="w-4 h-4 text-emerald-500" />
            <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Format Cetak Thermal Printer
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold block mb-1">
                Ukuran Lebar Kertas Default
              </label>
              <select
                value={formData.paperSize}
                onChange={(e) =>
                  setFormData({ ...formData, paperSize: e.target.value as '58mm' | '80mm' })
                }
                className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-hidden ${
                  isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                }`}
              >
                <option value="58mm">58mm (Printer Thermal Kasir Kecil / Bluetooth Portabel)</option>
                <option value="80mm">80mm (Printer Thermal Kasir Standar / USB Epson)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold block mb-1">Pesan Header Struk</label>
              <input
                type="text"
                maxLength={300}
                value={formData.receiptHeader}
                onChange={(e) => setFormData({ ...formData, receiptHeader: e.target.value })}
                className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-hidden ${
                  isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                }`}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-bold block mb-1">Pesan Footer Struk</label>
              <input
                type="text"
                maxLength={500}
                value={formData.receiptFooter}
                onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value })}
                className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-hidden ${
                  isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Cadangan & Pulihkan Data Lokal */}
        <div
          className={`p-6 sm:p-7 rounded-3xl border shadow-sm space-y-4 transition-all ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-500" />
              <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Cadangan Data Lokal & Runner Offline
              </h3>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              Offline + Cloud Ready
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Saat terhubung dengan Akun Google, seluruh data produk, stok, transaksi, dan profil toko otomatis tersinkron ke semua perangkat (HP/Tablet/Laptop). Anda juga dapat mengunduh cadangan file <code>.json</code> untuk arsip offline.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                downloadLocalDataBackupFile();
              }}
              className="p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer shadow-md"
            >
              <Download className="w-5 h-5" />
              <span>Unduh Cadangan (.json)</span>
              <span className="text-[10px] font-normal opacity-85">Simpan ke Flashdisk/PC</span>
            </button>

            <label className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer shadow-xs">
              <Upload className="w-5 h-5 text-amber-400" />
              <span>Pulihkan Data (Restore)</span>
              <span className="text-[10px] font-normal text-slate-400">Unggah file backup .json</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const text = event.target?.result as string;
                    if (text) {
                      const res = importAllLocalDataBackup(text);
                      if (res.success) {
                        setRestoreFeedback({
                          msg: `${res.message} Halaman akan dimuat ulang...`,
                          ok: true,
                        });
                        setTimeout(() => window.location.reload(), 1200);
                      } else {
                        setRestoreFeedback({ msg: res.message, ok: false });
                      }
                    }
                  };
                  reader.readAsText(file);
                }}
              />
            </label>

            <button
              type="button"
              onClick={() => {
                downloadWindowsBatchRunner();
              }}
              className="p-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer shadow-md"
            >
              <Terminal className="w-5 h-5" />
              <span>Unduh Runner (.bat)</span>
              <span className="text-[10px] font-normal opacity-85">Jalankan di Windows Offline</span>
            </button>
          </div>

          {restoreFeedback && (
            <div
              className={`p-3 rounded-xl text-xs font-bold border ${
                restoreFeedback.ok
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
              }`}
            >
              {restoreFeedback.msg}
            </div>
          )}
        </div>

        {/* Action Save Bar */}
        <div className="flex items-center justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
          >
            {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{isSaved ? 'Berhasil Disimpan!' : 'Simpan Pengaturan'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
