import React, { useState } from 'react';
import { Key, CheckCircle, AlertCircle, Eye, EyeOff, ShieldCheck, X } from 'lucide-react';
import { UserProfile } from '../types';

interface ChangePinModalProps {
  isOpen: boolean;
  user: UserProfile;
  onClose: () => void;
  onSaveNewPin: (userId: string, newPin: string) => void;
  isDark: boolean;
}

export const ChangePinModal: React.FC<ChangePinModalProps> = ({
  isOpen,
  user,
  onClose,
  onSaveNewPin,
  isDark,
}) => {
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPins, setShowPins] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // If user has existing pin, verify currentPinInput
    if (user.pin && user.pin !== currentPinInput) {
      setErrorMessage('PIN / Password saat ini salah!');
      return;
    }

    if (newPin.trim().length < 4) {
      setErrorMessage('PIN / Password baru minimal 4 karakter / digit!');
      return;
    }

    if (newPin !== confirmPin) {
      setErrorMessage('Konfirmasi PIN / Password baru tidak cocok!');
      return;
    }

    onSaveNewPin(user.id, newPin.trim());
    setSuccessMessage('PIN / Password berhasil diubah! Akun Anda kini aman dengan kredensial real.');
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div
        className={`rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-7 border animate-in zoom-in-95 duration-150 ${
          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-500/15 text-emerald-500 rounded-2xl">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base leading-tight">Ubah PIN / Password Akun</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Pengguna: <strong>{user.name}</strong> ({user.role})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {user.pin && (
            <div>
              <label className="text-xs font-bold block mb-1.5 text-slate-400">
                PIN / Password Saat Ini *
              </label>
              <div className="relative">
                <input
                  type={showPins ? 'text' : 'password'}
                  required
                  value={currentPinInput}
                  onChange={(e) => setCurrentPinInput(e.target.value)}
                  placeholder="Masukkan PIN saat ini"
                  className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold block mb-1.5 text-slate-400">
              PIN / Password Baru (Minimal 4 Digit / Huruf) *
            </label>
            <div className="relative">
              <input
                type={showPins ? 'text' : 'password'}
                required
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                placeholder="Contoh: 829103 atau SandiRahasia88"
                className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                  isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold block mb-1.5 text-slate-400">
              Konfirmasi PIN / Password Baru *
            </label>
            <div className="relative">
              <input
                type={showPins ? 'text' : 'password'}
                required
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="Ulangi PIN baru"
                className={`w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                  isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setShowPins(!showPins)}
              className="text-xs font-bold text-slate-400 hover:text-emerald-400 flex items-center gap-1.5 cursor-pointer"
            >
              {showPins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showPins ? 'Sembunyikan Sandi' : 'Tampilkan Sandi'}</span>
            </button>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Tersimpan aman & lokal
            </span>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/30 cursor-pointer transition-all"
            >
              Simpan PIN Baru
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
