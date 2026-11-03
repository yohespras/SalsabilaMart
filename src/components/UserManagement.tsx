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
  Sparkles,
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { ChangePinModal } from './ChangePinModal';

interface UserManagementProps {
  users: UserProfile[];
  currentUser: UserProfile;
  onAddUser: (user: Omit<UserProfile, 'id'>) => void;
  onUpdateUser: (user: UserProfile) => void;
  onDeleteUser: (userId: string) => void;
  onClearDemoUsers?: () => void;
  isDark: boolean;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  users,
  currentUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onClearDemoUsers,
  isDark,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [pinModalUser, setPinModalUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'kasir' as UserRole,
    pin: '',
    phone: '',
    isActive: true,
  });
  const [showFormPin, setShowFormPin] = useState(false);

  const hasDemoUsers = users.some((u) => u.isDemo);

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingUser(null);
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
    if (!formData.name.trim() || !formData.email.trim()) {
      alert('Nama dan Email/Username wajib diisi!');
      return;
    }
    if (!editingUser && formData.pin.length < 4) {
      alert('PIN / Password pengguna baru minimal 4 digit!');
      return;
    }
    if (editingUser) {
      onUpdateUser({
        ...editingUser,
        ...formData,
        isDemo: false,
      });
    } else {
      onAddUser({
        ...formData,
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
              Manajemen Pengguna & Keamanan Akun
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Kelola akun administrator dan kasir, atur PIN / Password real, dan amankan akses toko Anda.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {hasDemoUsers && onClearDemoUsers && (
            <button
              onClick={onClearDemoUsers}
              className="px-3.5 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Hapus akun bawaan demo"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bersihkan Akun Demo</span>
            </button>
          )}
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer w-fit"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Pengguna Baru</span>
          </button>
        </div>
      </div>

      {/* Demo Notice Banner if demo users present */}
      {hasDemoUsers && (
        <div className="p-4 rounded-3xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
            <div>
              <p className="font-bold">Beberapa akun masih berupa Akun Demo bawaan.</p>
              <p className="text-[11px] text-amber-200/80">
                Ubah PIN akun atau buat akun staf asli Anda untuk menggantikan akun demo.
              </p>
            </div>
          </div>
          {onClearDemoUsers && (
            <button
              onClick={onClearDemoUsers}
              className="px-3 py-1.5 bg-amber-500 text-slate-950 hover:bg-amber-400 rounded-xl font-bold text-[11px] shrink-0 cursor-pointer shadow-xs"
            >
              Hapus Akun Demo Sekarang
            </button>
          )}
        </div>
      )}

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
          const isMe = currentUser.id === u.id;
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
                      <div className="flex items-center gap-2">
                        <h3 className={`font-black text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {u.name}
                        </h3>
                        {isMe && (
                          <span className="text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.2 rounded-full">
                            Anda
                          </span>
                        )}
                        {u.isDemo ? (
                          <span className="text-[9px] font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded-full">
                            Demo
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded-full">
                            Real
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
                      onClick={() => {
                        if (confirm(`Yakin ingin menghapus pengguna "${u.name}"?`)) {
                          onDeleteUser(u.id);
                        }
                      }}
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
                {editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div>
                <label className="text-xs font-bold block mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Rian Sanjaya"
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-hidden ${
                    isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                  }`}
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Email / Username *</label>
                <input
                  type="text"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="rian@toko.com"
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-hidden ${
                    isDark ? 'bg-slate-850 border-slate-700 text-white' : 'bg-white border-slate-300'
                  }`}
                />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Nomor Telepon / WhatsApp</label>
                <input
                  type="tel"
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
