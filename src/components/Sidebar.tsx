import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  TrendingUp,
  FileSpreadsheet,
  Users,
  Settings,
  LogOut,
  AlertTriangle,
  Shield,
  Store,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Globe,
  Key,
  HardDrive,
  ScanLine,
} from 'lucide-react';
import { StoreProfile, UserProfile } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

export type ActiveTab =
  | 'dashboard'
  | 'scanner'
  | 'pos'
  | 'inventory'
  | 'reports'
  | 'sheets'
  | 'users'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentUser: UserProfile;
  storeProfile: StoreProfile;
  lowStockCount: number;
  cartCount?: number;
  onOpenLowStock: () => void;
  onLogout: () => void;
  onSwitchRole?: () => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isDark: boolean;
  onToggleDark: () => void;
  onOpenOnlineGuide?: () => void;
  onOpenChangePin?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  storeProfile,
  lowStockCount,
  cartCount = 0,
  onOpenLowStock,
  onLogout,
  onSwitchRole,
  isOpenMobile,
  setIsOpenMobile,
  isCollapsed,
  setIsCollapsed,
  isDark,
  onToggleDark,
  onOpenOnlineGuide,
  onOpenChangePin,
}) => {
  const isAdmin = currentUser.role === 'admin';

  // Grouped Menu Structure for Admin & Kasir
  const menuSections = isAdmin
    ? [
        {
          title: 'UTAMA',
          items: [
            { id: 'dashboard' as ActiveTab, label: 'Dashboard Ringkas', icon: LayoutDashboard },
            {
              id: 'scanner' as ActiveTab,
              label: 'Scan Barcode (Kabel)',
              icon: ScanLine,
              badge: 'USB',
              badgeColor: 'bg-emerald-400 text-slate-950 font-black',
            },
            {
              id: 'pos' as ActiveTab,
              label: 'Mesin Kasir (POS)',
              icon: ShoppingCart,
              badge: cartCount > 0 ? cartCount : null,
              badgeColor: 'bg-emerald-500 text-white font-black',
            },
            {
              id: 'inventory' as ActiveTab,
              label: 'Inventaris & Stok',
              icon: Boxes,
              badge: lowStockCount > 0 ? lowStockCount : null,
              badgeColor: 'bg-amber-500 text-slate-950 font-black',
            },
          ],
        },
        {
          title: 'KEUANGAN & DATA',
          items: [
            { id: 'reports' as ActiveTab, label: 'Laporan Keuangan', icon: TrendingUp },
            { id: 'sheets' as ActiveTab, label: 'Database Google Sheets', icon: FileSpreadsheet },
          ],
        },
        {
          title: 'PENGATURAN TOKO',
          items: [
            { id: 'users' as ActiveTab, label: 'Manajemen Pengguna', icon: Users },
            { id: 'settings' as ActiveTab, label: 'Pengaturan Toko', icon: Settings },
          ],
        },
      ]
    : [
        {
          title: 'MENU KASIR',
          items: [
            {
              id: 'scanner' as ActiveTab,
              label: 'Scan Barcode (Kabel)',
              icon: ScanLine,
              badge: 'USB',
              badgeColor: 'bg-emerald-400 text-slate-950 font-black',
            },
            {
              id: 'pos' as ActiveTab,
              label: 'Kasir Penjualan',
              icon: ShoppingCart,
              badge: cartCount > 0 ? cartCount : null,
              badgeColor: 'bg-emerald-500 text-white font-black',
            },
            {
              id: 'inventory' as ActiveTab,
              label: 'Input & Cek Stok',
              icon: Boxes,
              badge: lowStockCount > 0 ? lowStockCount : null,
              badgeColor: 'bg-amber-500 text-slate-950 font-black',
            },
          ],
        },
      ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          onClick={() => setIsOpenMobile(false)}
          className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-2xs transition-opacity"
        />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen transition-all duration-200 ease-in-out shrink-0 flex flex-col justify-between border-r shadow-2xl ${
          isDark
            ? 'bg-slate-950 text-slate-200 border-slate-800/80 shadow-black/60'
            : 'bg-slate-900 text-slate-200 border-slate-800 shadow-slate-900/40'
        } ${
          isOpenMobile
            ? 'translate-x-0 w-[275px]'
            : '-translate-x-full md:translate-x-0 ' + (isCollapsed ? 'md:w-[76px]' : 'md:w-[275px]')
        }`}
      >
        {/* TOP SECTION: Header & Scrollable Menu */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Store Brand Header */}
          <div className="px-4 py-3.5 border-b border-slate-800/80 flex items-center justify-between gap-2.5 shrink-0 bg-slate-950/40">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white rounded-2xl flex items-center justify-center font-black shadow-md shadow-emerald-500/25 shrink-0">
                <Store className="w-5 h-5 text-white" />
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <h2 className="font-extrabold text-xs text-white truncate tracking-tight leading-tight">
                    {storeProfile.name}
                  </h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-emerald-400 font-bold tracking-wider uppercase">
                      {isAdmin ? 'ADMIN CONTROL' : 'KASIR ON-DUTY'}
                    </span>
                  </div>
                </div>
              )}
            </div>
            {/* Desktop Collapse / Expand Toggle Button */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-all cursor-pointer shrink-0"
              title={isCollapsed ? 'Buka Sidebar' : 'Ciutkan Sidebar'}
            >
              {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>

          {/* User Profile Mini Bar */}
          <div className="px-3 pt-3 shrink-0">
            <div
              className={`p-2.5 rounded-2xl border border-slate-800/90 bg-slate-900/80 shadow-inner transition-all ${
                isCollapsed ? 'text-center' : ''
              }`}
            >
              <div className={`flex items-center gap-2.5 ${isCollapsed ? 'justify-center' : ''}`}>
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0 shadow-sm ${
                    isAdmin
                      ? 'bg-gradient-to-br from-purple-600 to-indigo-700 shadow-purple-900/30'
                      : 'bg-gradient-to-br from-emerald-600 to-teal-700 shadow-emerald-900/30'
                  }`}
                >
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </div>
                {!isCollapsed && (
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.2 rounded-md uppercase tracking-wider ${
                          isAdmin
                            ? 'bg-purple-950 text-purple-300 border border-purple-800/60'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                        }`}
                      >
                        {currentUser.role}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{currentUser.email}</p>
                  </div>
                )}
              </div>

              {!isCollapsed && (
                <div className="mt-2 space-y-1.5">
                  {onOpenChangePin && (
                    <button
                      onClick={onOpenChangePin}
                      className="w-full py-1.5 px-2 text-[10px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-emerald-500/25 active:scale-98"
                      title="Ubah PIN / Password Akun Anda"
                    >
                      <Key className="w-3 h-3 text-emerald-400" />
                      <span>Ubah PIN / Password Real</span>
                    </button>
                  )}
                  {/* Kasir TIDAK memiliki tombol Ganti Shift untuk mencegah akses tidak sah ke Admin */}
                  {isAdmin && onSwitchRole && (
                    <button
                      onClick={onSwitchRole}
                      className="w-full py-1.5 px-2 text-[10px] font-bold bg-slate-800/80 hover:bg-slate-800 hover:text-white text-slate-300 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700/60 active:scale-98"
                      title="Admin beralih ke simulasi Kasir"
                    >
                      <Shield className="w-3 h-3 text-amber-400" />
                      <span>Simulasi Kasir (Admin Only)</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Low Stock Warning Alert Pill */}
          {lowStockCount > 0 && (
            <div className="px-3 pt-2 shrink-0">
              <button
                onClick={onOpenLowStock}
                className={`w-full p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-amber-400 hover:bg-amber-500/20 transition-all text-xs cursor-pointer ${
                  isCollapsed ? 'justify-center' : ''
                }`}
                title={`${lowStockCount} Barang Kritis Perlu Restock!`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
                  {!isCollapsed && (
                    <span className="font-bold text-[11px] truncate">
                      {lowStockCount} Barang Kritis!
                    </span>
                  )}
                </div>
                {!isCollapsed && (
                  <span className="text-[9px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded-full shrink-0">
                    RESTOCK
                  </span>
                )}
              </button>
            </div>
          )}

          {/* SCROLLABLE MENU ITEMS AREA */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {menuSections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-1">
                {/* Section Header */}
                {!isCollapsed && (
                  <div className="px-2.5 pb-1 text-[10px] font-extrabold text-slate-500 tracking-wider uppercase flex items-center justify-between">
                    <span>{section.title}</span>
                  </div>
                )}
                {/* Section Items */}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setIsOpenMobile(false);
                        }}
                        className={`w-full flex items-center rounded-2xl text-xs font-semibold transition-all cursor-pointer relative group ${
                          isCollapsed
                            ? 'justify-center p-3'
                            : 'justify-between px-3.5 py-2.5'
                        } ${
                          isActive
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-md shadow-emerald-600/30'
                            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                        }`}
                        title={isCollapsed ? item.label : undefined}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                              isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                            }`}
                          />
                          {!isCollapsed && (
                            <span className="truncate">{item.label}</span>
                          )}
                        </div>
                        {/* Active Indicator Bar */}
                        {isActive && !isCollapsed && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white shadow-xs shrink-0" />
                        )}
                        {/* Badge if available */}
                        {!isCollapsed && item.badge && (
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.2 rounded-full shrink-0 shadow-2xs ${
                              item.badgeColor || 'bg-amber-500 text-slate-950'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM FIXED SECTION: Theme & Logout */}
        <div className="p-3 border-t border-slate-800/80 space-y-1.5 shrink-0 bg-slate-950/40">
          {/* PWA Install Button in Sidebar */}
          <PWAInstallButton variant="sidebar" isDark={isDark} />

          {/* Pakai Tanpa Hosting & Akses Multi-Device */}
          {onOpenOnlineGuide && (
            <button
              onClick={onOpenOnlineGuide}
              className={`w-full flex items-center rounded-2xl text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all cursor-pointer ${
                isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
              }`}
              title="Panduan Pakai Tanpa Hosting, Runner Lokal, dan Akses HP"
            >
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
                {!isCollapsed && <span>Pakai Tanpa Hosting</span>}
              </div>
              {!isCollapsed && (
                <span className="text-[10px] font-black text-emerald-300 bg-emerald-500/25 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Lokal
                </span>
              )}
            </button>
          )}

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={onToggleDark}
            className={`w-full flex items-center rounded-2xl text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer ${
              isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
            }`}
            title="Ganti Tema Gelap / Terang"
          >
            <div className="flex items-center gap-2">
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-300 shrink-0" />
              ) : (
                <Moon className="w-4 h-4 text-slate-400 shrink-0" />
              )}
              {!isCollapsed && <span>Mode {isDark ? 'Terang' : 'Gelap'}</span>}
            </div>
            {!isCollapsed && (
              <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700/50">
                {isDark ? 'Dark' : 'Light'}
              </span>
            )}
          </button>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className={`w-full flex items-center rounded-2xl text-xs font-semibold text-rose-400 hover:bg-rose-500/15 hover:text-rose-300 transition-colors cursor-pointer ${
              isCollapsed ? 'justify-center p-2.5' : 'justify-start gap-2 px-3 py-2'
            }`}
            title="Keluar ke Profil Toko"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Keluar / Profil Toko</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
