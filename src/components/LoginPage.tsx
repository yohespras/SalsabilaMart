import React, { useState } from 'react';
import {
  Store,
  LogIn,
  ArrowLeft,
  Lock,
  ChevronRight,
  AlertCircle,
  Eye,
  EyeOff,
  UserPlus,
  CheckCircle,
  Key,
  User,
  Sparkles,
  Cloud,
} from 'lucide-react';
import { StoreProfile, UserProfile, UserRole } from '../types';

interface LoginPageProps {
  storeProfile: StoreProfile;
  users: UserProfile[];
  onLoginSuccess: (user: UserProfile) => void;
  onRegisterUser: (newUser: Omit<UserProfile, 'id'>) => void;
  onUpdateUserPin: (userId: string, newPin: string) => void;
  onGoogleLogin: () => void;
  onBackToProfile: () => void;
  isLoggingInGoogle: boolean;
  isDark: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  storeProfile,
  users,
  onLoginSuccess,
  onRegisterUser,
  onUpdateUserPin,
  onGoogleLogin,
  onBackToProfile,
  isLoggingInGoogle,
  isDark,
}) => {
  const [activeMode, setActiveMode] = useState<'login' | 'register' | 'resetPin'>('login');
  const [loginIdentifier, setLoginIdentifier] = useState<string>('');
  const [inputPin, setInputPin] = useState<string>('');
  const [showPin, setShowPin] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('admin');
  const [regPin, setRegPin] = useState('');
  const [regConfirmPin, setRegConfirmPin] = useState('');

  // Reset PIN form state
  const [resetSelectedUserId, setResetSelectedUserId] = useState<string>(users[0]?.id || '');
  const [resetNewPin, setResetNewPin] = useState('');
  const [resetConfirmPin, setResetConfirmPin] = useState('');

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    const cleanId = loginIdentifier.trim().toLowerCase();
    if (!cleanId) {
      setErrorMessage('Harap masukkan Email, Username, atau Nama Akun Anda!');
      return;
    }
    if (!inputPin) {
      setErrorMessage('Harap masukkan PIN / Password Anda!');
      return;
    }

    const found = users.find(
      (u) =>
        u.email.toLowerCase() === cleanId ||
        u.name.toLowerCase() === cleanId ||
        (u.phone && u.phone.replace(/\D/g, '') === cleanId.replace(/\D/g, ''))
    );

    if (!found) {
      setErrorMessage('Akun pengguna tidak ditemukan! Silakan masuk dengan Akun Google atau buat Akun Baru.');
      return;
    }

    if (!found.isActive) {
      setErrorMessage('Akun ini sedang dinonaktifkan oleh administrator.');
      return;
    }

    const correctPin = found.pin || found.password;
    if (correctPin && correctPin !== inputPin) {
      setErrorMessage('PIN / Password yang Anda masukkan salah! Silakan coba lagi.');
      return;
    }

    onLoginSuccess(found);
  };

  const handleSelectAccount = (user: UserProfile) => {
    setLoginIdentifier(user.email);
    setInputPin('');
    setErrorMessage(null);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);

    if (!regName.trim()) {
      setErrorMessage('Nama lengkap wajib diisi!');
      return;
    }
    if (!regEmail.trim()) {
      setErrorMessage('Email atau username wajib diisi!');
      return;
    }
    if (regPin.length < 4) {
      setErrorMessage('PIN / Password baru minimal 4 karakter / digit!');
      return;
    }
    if (regPin !== regConfirmPin) {
      setErrorMessage('Konfirmasi PIN / Password tidak cocok!');
      return;
    }

    const exists = users.some((u) => u.email.toLowerCase() === regEmail.trim().toLowerCase());
    if (exists) {
      setErrorMessage('Email / Username tersebut sudah terdaftar! Silakan gunakan yang lain.');
      return;
    }

    const newUserData: Omit<UserProfile, 'id'> = {
      name: regName.trim(),
      email: regEmail.trim(),
      phone: regPhone.trim() || undefined,
      role: regRole,
      pin: regPin.trim(),
      password: regPin.trim(),
      isActive: true,
      transactionsServed: 0,
      isDemo: false,
    };

    onRegisterUser(newUserData);
  };

  const handleResetPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (resetNewPin.length < 4) {
      setErrorMessage('PIN baru minimal 4 digit / karakter!');
      return;
    }
    if (resetNewPin !== resetConfirmPin) {
      setErrorMessage('Konfirmasi PIN tidak cocok!');
      return;
    }

    onUpdateUserPin(resetSelectedUserId, resetNewPin.trim());
    setSuccessNotice('PIN berhasil diubah! Silakan login menggunakan PIN baru Anda.');
    setActiveMode('login');
    setInputPin(resetNewPin.trim());
  };

  return (
    <div
      className={`min-h-screen flex flex-col justify-center items-center p-4 transition-colors ${
        isDark ? 'bg-[#090d16] text-white' : 'bg-slate-100 text-slate-800'
      }`}
    >
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={onBackToProfile}
          className={`inline-flex items-center gap-2 text-xs font-bold mb-4 transition-colors cursor-pointer ${
            isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Profil &amp; Katalog Toko</span>
        </button>

        {/* Main Card */}
        <div
          className={`rounded-3xl border shadow-2xl p-7 sm:p-8 backdrop-blur-md transition-all ${
            isDark
              ? 'bg-slate-900/95 border-slate-800 shadow-black/60'
              : 'bg-white border-slate-200/90 shadow-slate-300'
          }`}
        >
          {/* Logo & Brand Header */}
          <div className="text-center mb-5">
            <div className="w-16 h-16 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-3xl flex items-center justify-center text-white mx-auto mb-3 shadow-xl shadow-emerald-600/30 border border-white/20">
              <Store className="w-8 h-8" />
            </div>
            <h1 className={`text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {storeProfile.name}
            </h1>
            <p className={`text-xs mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Sistem Kasir POS &amp; Sinkronisasi Multi-Perangkat
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex p-1 bg-slate-100 dark:bg-slate-850 rounded-2xl mb-5 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setActiveMode('login');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeMode === 'login'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Masuk Akun</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMode('register');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeMode === 'register'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Daftar Akun Baru</span>
            </button>
          </div>

          {/* Multi-Device Cloud Sync Notice Banner */}
          <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium flex items-start gap-2.5">
            <Cloud className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong>Sinkron Semua Perangkat (HP, Tablet &amp; Laptop):</strong> Masuk dengan <strong>Akun Google</strong> agar data barang, stok, dan transaksi otomatis sama &amp; real-time di semua perangkat.
            </span>
          </div>

          {successNotice && (
            <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}
          {errorMessage && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium space-y-2 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-rose-500">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              {errorMessage.includes('unauthorized-domain') && (
                <div className="p-3 bg-slate-950/80 rounded-xl border border-rose-500/30 text-[11px] text-slate-300 space-y-2">
                  <p>
                    <strong>Solusi:</strong> Daftarkan domain hosting Anda di Firebase Console:
                  </p>
                  <a
                    href="https://console.firebase.google.com/project/gen-lang-client-0566158393/authentication/settings"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-amber-400 hover:underline font-bold"
                  >
                    Buka Firebase Console Settings &rarr;
                  </a>
                </div>
              )}
            </div>
          )}

          {/* MODE 1: LOGIN */}
          {activeMode === 'login' && (
            <>
              {/* Google Sign In Option (Primary Multi-Device Sync) */}
              <button
                onClick={onGoogleLogin}
                disabled={isLoggingInGoogle}
                className={`w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl text-xs font-black border-2 shadow-sm transition-all mb-4 cursor-pointer active:scale-98 ${
                  isDark
                    ? 'bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-500/50 text-white'
                    : 'bg-emerald-50/70 hover:bg-emerald-100/70 border-emerald-500/60 text-slate-900'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.88c2.27-2.09 3.665-5.17 3.665-9.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.09C3.25 21.36 7.31 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.32c-.25-.72-.38-1.49-.38-2.32s.13-1.6.38-2.32V6.59H1.27C.46 8.2 0 10.04 0 12s.46 3.8 1.27 5.41l4.01-3.09z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.64 1.27 6.59l4.01 3.09c.95-2.83 3.6-4.93 6.72-4.93z"
                  />
                </svg>
                <span>
                  {isLoggingInGoogle
                    ? 'Menghubungkan & Menyinkronkan Cloud...'
                    : 'Masuk dengan Akun Google (Sinkron Lintas Perangkat)'}
                </span>
              </button>

              <div className="relative flex py-2 items-center mb-4">
                <div className={`flex-grow border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`} />
                <span
                  className={`flex-shrink mx-3 text-[10px] uppercase font-bold tracking-wider ${
                    isDark ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  atau masuk offline dengan PIN
                </span>
                <div className={`flex-grow border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`} />
              </div>

              {/* Quick User Picker Cards */}
              {users.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label
                      className={`text-[11px] font-bold uppercase tracking-wider block ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      Pilih Akun Terdaftar:
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                    {users.map((u) => {
                      const isSelected =
                        loginIdentifier.toLowerCase() === u.email.toLowerCase() ||
                        loginIdentifier.toLowerCase() === u.name.toLowerCase();
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => handleSelectAccount(u)}
                          className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                              : isDark
                              ? 'border-slate-800 bg-slate-850/60 hover:bg-slate-800 text-slate-300'
                              : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center text-[11px] font-bold text-white shrink-0 ${
                              u.role === 'admin' ? 'bg-purple-600' : 'bg-emerald-600'
                            }`}
                          >
                            {u.name.slice(0, 1)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold truncate leading-tight">{u.name}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span
                                className={`text-[9px] font-black uppercase tracking-wider ${
                                  u.role === 'admin' ? 'text-purple-400' : 'text-emerald-400'
                                }`}
                              >
                                {u.role}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleCredentialsSubmit} className="space-y-4">
                <div>
                  <label
                    className={`text-xs font-bold block mb-1.5 ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    Email / Username / No. HP
                  </label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="Masukkan email atau nama akun Anda"
                      className={`w-full pl-10 pr-4 py-2.5 text-xs font-medium rounded-2xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                        isDark
                          ? 'bg-slate-850 border-slate-700 text-white'
                          : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      className={`text-xs font-bold block ${
                        isDark ? 'text-slate-300' : 'text-slate-700'
                      }`}
                    >
                      PIN / Password Akses
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveMode('resetPin')}
                      className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 cursor-pointer"
                    >
                      Lupa / Ganti PIN?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPin ? 'text' : 'password'}
                      required
                      value={inputPin}
                      onChange={(e) => setInputPin(e.target.value)}
                      placeholder="Masukkan PIN / Password Anda"
                      className={`w-full pl-10 pr-10 py-2.5 text-sm font-mono tracking-widest font-black rounded-2xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                        isDark
                          ? 'bg-slate-850 border-slate-700 text-white'
                          : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  <span>Masuk Aplikasi Kasir</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </form>
            </>
          )}

          {/* MODE 2: REGISTER REAL ACCOUNT */}
          {activeMode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
                <p className="font-bold flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-4 h-4" />
                  Buat Akun Toko Anda
                </p>
                <p className="text-[11px] text-slate-300">
                  Daftarkan identitas pemilik atau kasir dengan PIN/Password Anda sendiri.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1 text-slate-300">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Contoh: Salsabila"
                  className={`w-full px-3.5 py-2 text-xs rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold block mb-1 text-slate-300">Email Google *</label>
                  <input
                    type="text"
                    required
                    maxLength={128}
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="nama@gmail.com"
                    className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1 text-slate-300">No. WhatsApp</label>
                  <input
                    type="tel"
                    maxLength={40}
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="0812xxxx"
                    className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1 text-slate-300">Peran Akun *</label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as UserRole)}
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="admin">Admin / Pemilik Toko (Akses Penuh)</option>
                  <option value="kasir">Kasir (Transaksi &amp; Stok)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold block mb-1 text-slate-300">PIN / Sandi *</label>
                  <input
                    type={showPin ? 'text' : 'password'}
                    required
                    maxLength={64}
                    value={regPin}
                    onChange={(e) => setRegPin(e.target.value)}
                    placeholder="Min. 4 karakter"
                    className={`w-full px-3 py-2 text-xs font-mono rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1 text-slate-300">Konfirmasi *</label>
                  <input
                    type={showPin ? 'text' : 'password'}
                    required
                    maxLength={64}
                    value={regConfirmPin}
                    onChange={(e) => setRegConfirmPin(e.target.value)}
                    placeholder="Ulangi sandi"
                    className={`w-full px-3 py-2 text-xs font-mono rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                      isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-slate-400 hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
                >
                  {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPin ? 'Sembunyikan' : 'Tampilkan'}</span>
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-3"
              >
                <span>Daftar &amp; Masuk Sekarang</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* MODE 3: RESET / GANTI PIN */}
          {activeMode === 'resetPin' && (
            <form onSubmit={handleResetPinSubmit} className="space-y-4">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                <p className="font-bold flex items-center gap-1.5 mb-1">
                  <Key className="w-4 h-4" />
                  Atur Ulang / Ganti PIN Akun
                </p>
                <p className="text-[11px] text-slate-300">
                  Ubah kode PIN atau password akun agar sesuai dengan sandi rahasia Anda.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1 text-slate-300">Pilih Akun</label>
                <select
                  value={resetSelectedUserId}
                  onChange={(e) => setResetSelectedUserId(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email}) - {u.role}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1 text-slate-300">PIN / Password Baru *</label>
                <input
                  type={showPin ? 'text' : 'password'}
                  required
                  maxLength={64}
                  value={resetNewPin}
                  onChange={(e) => setResetNewPin(e.target.value)}
                  placeholder="Minimal 4 karakter / digit"
                  className={`w-full px-3 py-2 text-xs font-mono rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1 text-slate-300">Konfirmasi PIN Baru *</label>
                <input
                  type={showPin ? 'text' : 'password'}
                  required
                  maxLength={64}
                  value={resetConfirmPin}
                  onChange={(e) => setResetConfirmPin(e.target.value)}
                  placeholder="Ulangi PIN baru"
                  className={`w-full px-3 py-2 text-xs font-mono rounded-xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                    isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-slate-400 hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
                >
                  {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showPin ? 'Sembunyikan' : 'Tampilkan'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMode('login')}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  Kembali ke Login
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-98 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-3"
              >
                <span>Simpan PIN &amp; Lanjut Login</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
