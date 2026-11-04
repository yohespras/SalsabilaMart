import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Key,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  Search,
  Eye,
  EyeOff,
  Cloud,
  AlertTriangle,
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { ChangePinModal } from './ChangePinModal';

interface UserManagementProps {
  users: UserProfile[];
  currentUser: UserProfile;
  onAddUser: (user: Omit<UserProfile, 'id'>) => void;
  onUpdateUser: (user: UserProfile) => void;
  onDeleteUser: (userId: string) => void;
  isCloudSynced?: boolean;
  isDark: boolean;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  users,
  currentUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  isCloudSynced = false,
  isDark,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [pinModalUser, setPinModalUser] = useState<UserProfile | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<UserProfile | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'kasir' as UserRole,
    pin: '',
    phone: '',
    isActive: true,
  });
  const [showFormPin, setShowFormPin] = useState(false);

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormError(null);
    setFormData({
      name: '',
      email: '',
      role: 'kasir',
      pin: '',
      phone: '',
      isActive: true,
    });
    setShowFormPin(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: UserProfile) => {
    setEditingUser(user);
    setFormError(null);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      pin: user.pin || '',
      phone: user.phone || '',
      isActive: user.isActive,
    });
    setShowFormPin(false);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.name.trim() || !formData.email.trim()) {
      setFormError('Nama lengkap dan Email Google / Username wajib diisi!');
      return;
    }
    if (!editingUser && formData.pin.length < 4) {
      setFormError('PIN / Password pengguna baru minimal 4 karakter!');
      return;
    }
    if (editingUser) {
      onUpdateUser({
        ...editingUser,
        ...formData,
        name: formData.name.trim(),
        email: formData.email.trim(),
        pin: formData.pin.trim() || editingUser.pin,
        isDemo: false,
      });
    } else {
      onAddUser({
        ...formData,
        name: formData.name.trim(),
        email: formData.email.trim(),
        pin: formData.pin.trim(),
        transactionsServed: 0,
        isDemo: false,
      });
    }
    setIsModalOpen(false);
  };

  const handleSavePinFromModal = (userId: string, newPin: string) => {
    const target = users.find((u) => u.id === userId);
    if (target) {
      onUpdateUser({
        ...target,
        pin: newPin,
        password: newPin,
        isDemo: false,
      });
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl">
      {/* Header Bar */}
      <div
        className={`p-6 sm:p-7 rounded-3xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/15 text-purple-400 rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Manajemen Pengguna & Akses Multi-Perangkat
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Daftarkan email Google staf kasir atau admin agar saat login di HP/perangkat lain otomatis tersinkron ke toko ini.
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer w-fit"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Staf / Kasir</span>
        </button>
      </div>

      {/* Multi-device Sync Tip Banner */}
      <div
        className={`p-4 rounded-3xl border text-xs flex items-start gap-3 ${
          isCloudSynced
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
            : isDark
            ? 'border-slate-800 bg-slate-900/80 text-slate-300'
            : 'border-slate-200 bg-white text-slate-700'
        }`}
      >
        <Cloud className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
        <div className="space-y-0.5">
          <p className="font-bold">
            {isCloudSynced
              ? 'Sinkronisasi Akun Lintas Perangkat Aktif'
              : 'Tips Login di Perangkat Lain (HP / Tablet / PC Kasir):'}
          </p>
          <p className="text-[11px] opacity-85 leading-relaxed">
            Gunakan akun Google yang sama (<strong>salsabilamart684@gmail.com</strong>) di perangkat lain, atau tambahkan alamat Gmail kasir Anda di bawah ini agar kasir dapat login dengan Google di HP-nya dan langsung mengakses data barang &amp; stok yang sama secara real-time.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div
        className={`p-4 rounded-3xl border shadow-sm ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
        }`}
      >
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari pengguna berdasarkan nama, email, atau peran..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl border focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
              isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          />
        </div>
      </div>

      {/* User Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredUsers.map((u) => {
          const isMe =
            currentUser.id === u.id ||
            currentUser.email.toLowerCase() === u.email.toLowerCase();
          const isAdminRole = u.role === 'admin';
          return (
            <div
              key={u.id}
              className={`p-5 rounded-3xl border shadow-sm flex flex-col justify-between transition-all ${
                isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200/90'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black text-white shadow-md ${
                        isAdminRole
                          ? 'bg-gradient-to-br from-purple-600 to-indigo-700'
                          : 'bg-gradient-to-br from-emerald-600 to-teal-700'
                      }`}
                    >
                      {u.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {u.name}
                        </h3>
                        {isMe && (
                          <span className="text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.2 rounded-full">
                            Anda
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{u.email}</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider ${
                      isAdminRole
                        ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {u.role}
                  </span>
                </div>
                <div
                  className={`mt-4 pt-3 border-t grid grid-cols-2 gap-2 text-xs ${
                    isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
                  }`}
                >
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Keamanan PIN
                    </span>
                    <button
                      onClick={() => setPinModalUser(u)}
                      className="text-xs font-mono font-bold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer mt-0.5"
                    >
                      <Key className="w-3 h-3" />
                      <span>{u.pin ? '•••••• (Ganti)' : 'Atur PIN'}</span>
                    </button>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      Transaksi Dilayani
                    </span>
                    <span className="font-bold">{u.transactionsServed || 0} struk</span>
                  </div>
                </div>
              </div>
              <div
                className={`mt-4 pt-3 border-t flex items-center justify-between ${
                  isDark ? 'border-slate-800' : 'border-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs">
                  {u.isActive ? (
                    <span className="flex items-center gap-1 text-emerald-500 font-bold">
                      <CheckCircle className="w-3.5 h-3.5" /> Aktif
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-rose-500 font-bold">
                      <XCircle className="w-3.5 h-3.5" /> Nonaktif
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPinModalUser(u)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                    title="Ubah PIN / Password"
                  >
                    <Key className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(u)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Edit Profil Pengguna"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {!isMe && (
                    <button
                      onClick={() => setConfirmDeleteUser(u)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Hapus pengguna"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div
            className={`rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-7 border animate-in zoom-in-95 duration-150 ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-black text-base">
                {editingUser ? 'Edit Pengguna' : 'Tambah Staf / Kasir Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-bold">
                  {formError}
                </div>
              )}
              <div>
                <label className="text-xs font-bold block mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Rina Kasir"
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-hidden ${
                    isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                  }`}
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">
                  Alamat Email Google (untuk Login Multi-Perangkat) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={128}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contohkasir@gmail.com"
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-hidden ${
                    isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                  }`}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Masukkan alamat Gmail staf agar ia dapat login Google dari perangkat lain &amp; tersinkron otomatis.
                </p>
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Nomor Telepon / WhatsApp</label>
                <input
                  type="tel"
                  maxLength={40}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0812xxxxxxxx"
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-hidden ${
                    isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                  }`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">Hak Akses Peran</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-hidden ${
                      isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                    }`}
                  >
                    <option value="kasir">Kasir (Transaksi & Stok)</option>
                    <option value="admin">Admin (Akses Penuh)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">
                    {editingUser ? 'PIN Baru (Opsional)' : 'PIN / Password *'}
                  </label>
                  <div className="relative">
                    <input
                      type={showFormPin ? 'text' : 'password'}
                      required={!editingUser}
                      maxLength={64}
                      value={formData.pin}
                      onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                      placeholder={editingUser ? 'Biarkan bila tetap' : 'Min. 4 karakter'}
                      className={`w-full pl-3 pr-8 py-2 text-xs font-mono rounded-xl border focus:outline-hidden ${
                        isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowFormPin(!showFormPin)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showFormPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="userActiveCheck"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="userActiveCheck" className="text-xs font-semibold cursor-pointer">
                  Akun aktif dan diizinkan login ke aplikasi kasir
                </label>
              </div>
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/30 cursor-pointer"
                >
                  {editingUser ? 'Simpan Perubahan' : 'Buat Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete User Modal */}
      {confirmDeleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div
            className={`rounded-3xl shadow-2xl max-w-sm w-full p-6 border space-y-4 ${
              isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-500/15 text-rose-500 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="text-xs space-y-1">
                <h4 className="font-black text-sm">Hapus Akun Pengguna?</h4>
                <p className="text-slate-400 leading-relaxed">
                  Pengguna <strong>{confirmDeleteUser.name}</strong> ({confirmDeleteUser.email}) akan dihapus dari daftar akses toko.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDeleteUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteUser(confirmDeleteUser.id);
                  setConfirmDeleteUser(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change PIN Dedicated Modal */}
      {pinModalUser && (
        <ChangePinModal
          isOpen={true}
          user={pinModalUser}
          onClose={() => setPinModalUser(null)}
          onSaveNewPin={handleSavePinFromModal}
          isDark={isDark}
        />
      )}
    </div>
  );
};
