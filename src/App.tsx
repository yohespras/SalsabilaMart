import React, { useState, useEffect } from 'react';
import {
  Menu,
  Bell,
  AlertTriangle,
  Shield,
  LogOut,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Globe,
  Key,
  Cloud,
  RefreshCw,
  CheckCircle2,
  HardDrive,
} from 'lucide-react';
import {
  CartItem,
  GoogleSheetsConfig,
  Product,
  StoreProfile,
  Transaction,
  UserProfile,
  UserRole,
} from './types';
import {
  DEFAULT_STORE_PROFILE,
  INITIAL_PRODUCTS,
  INITIAL_TRANSACTIONS,
  INITIAL_USERS,
  clearStoredTransactions,
  getLocalDateString,
  loadDarkMode,
  loadStoredProfile,
  loadStoredProducts,
  loadStoredTransactions,
  loadStoredUsers,
  loadStoredSheetsConfig,
  saveDarkMode,
  saveStoredProfile,
  saveStoredProducts,
  saveStoredTransactions,
  saveStoredUsers,
  saveStoredSheetsConfig,
} from './services/storage';
import { googleSignIn, initAuth, logoutGoogle, formatFirebaseAuthError, testFirestoreConnection } from './services/auth';
import {
  appendTransactionToSheet,
  batchAppendTransactionsToSheet,
  overwriteFullStateToSheet,
  pullFullStateFromSheet,
} from './services/googleSheets';
import { exportDailyReportPDF } from './services/pdfExport';
import { StorePublicProfile } from './components/StorePublicProfile';
import { LoginPage } from './components/LoginPage';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { POS } from './components/POS';
import { Inventory } from './components/Inventory';
import { BarcodeScannerMenu } from './components/BarcodeScannerMenu';
import { FinancialReport } from './components/FinancialReport';
import { GoogleSheetsSync } from './components/GoogleSheetsSync';
import { UserManagement } from './components/UserManagement';
import { StoreSettings } from './components/StoreSettings';
import { LowStockNotificationModal } from './components/LowStockNotificationModal';
import { ThermalReceiptModal } from './components/ThermalReceiptModal';
import { OnlineGuideModal } from './components/OnlineGuideModal';
import { ChangePinModal } from './components/ChangePinModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SheetsSyncModal, SyncModalInitialMode } from './components/SheetsSyncModal';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { GlobalScannerSink } from './services/hardwareScanner';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoginPageOpen, setIsLoginPageOpen] = useState(false);
  const [isLoggingInGoogle, setIsLoggingInGoogle] = useState(false);

  // Theme State: Dark / Light Mode
  const [isDark, setIsDark] = useState<boolean>(() => loadDarkMode());
  const isOnline = useOnlineStatus();

  // Navigation & Layout States
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Core Data States
  const [products, setProducts] = useState<Product[]>(() => loadStoredProducts());
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    loadStoredTransactions()
  );
  const [storeProfile, setStoreProfile] = useState<StoreProfile>(() => loadStoredProfile());
  const [users, setUsers] = useState<UserProfile[]>(() => loadStoredUsers());
  const [cart, setCart] = useState<CartItem[]>([]);

  // Google Sheets Config (Loaded from persistent localStorage)
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig>(() =>
    loadStoredSheetsConfig()
  );
  const [isSyncingToSheets, setIsSyncingToSheets] = useState(false);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);

  const showAppToast = (msg: string, duration = 4000) => {
    setSyncToastMessage(msg);
    setTimeout(() => {
      setSyncToastMessage((prev) => (prev === msg ? null : prev));
    }, duration);
  };

  // Modal States
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);
  const [receiptModalTx, setReceiptModalTx] = useState<Transaction | null>(null);
  const [isOnlineModalOpen, setIsOnlineModalOpen] = useState(false);
  const [isChangePinModalOpen, setIsChangePinModalOpen] = useState(false);
  const [sheetsSyncModalMode, setSheetsSyncModalMode] = useState<SyncModalInitialMode | null>(null);

  // Persist dark mode and sync root html element
  useEffect(() => {
    saveDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const handleToggleDark = () => {
    setIsDark((prev) => !prev);
  };

  // Sync core collections to localStorage
  useEffect(() => {
    saveStoredProducts(products);
  }, [products]);

  useEffect(() => {
    saveStoredTransactions(transactions);
  }, [transactions]);

  useEffect(() => {
    saveStoredProfile(storeProfile);
  }, [storeProfile]);

  useEffect(() => {
    saveStoredUsers(users);
  }, [users]);

  useEffect(() => {
    saveStoredSheetsConfig(sheetsConfig);
  }, [sheetsConfig]);

  // Firebase auth state initialization & connection test
  useEffect(() => {
    testFirestoreConnection();
    initAuth(
      (user) => {
        if (!currentUser) {
          const matched = users.find((u) => u.email.toLowerCase() === user.email?.toLowerCase());
          if (matched) {
            setCurrentUser(matched);
          } else {
            setCurrentUser({
              id: user.uid,
              name: user.displayName || 'Salsabila (Pemilik Toko)',
              email: user.email || 'salsabilamart684@gmail.com',
              role: 'admin',
              isActive: true,
              avatar: user.photoURL || undefined,
            });
          }
        }
      },
      () => {
        // Logged out
      }
    );
  }, [currentUser, users]);

  // Handle Google Login
  const handleGoogleLogin = async () => {
    setIsLoggingInGoogle(true);
    try {
      const res = await googleSignIn();
      if (res) {
        const authedUser: UserProfile = {
          id: res.user.uid,
          name: res.user.displayName || 'Salsabila (Pemilik Toko)',
          email: res.user.email || 'salsabilamart684@gmail.com',
          role: 'admin',
          isActive: true,
          avatar: res.user.photoURL || undefined,
        };
        setCurrentUser(authedUser);
        setActiveTab('dashboard');
        setIsLoginPageOpen(false);
      }
    } catch (err: any) {
      console.error('Google login failed:', err);
      const friendlyMsg = formatFirebaseAuthError(err);
      showAppToast(friendlyMsg, 5000);
    } finally {
      setIsLoggingInGoogle(false);
    }
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setIsLoginPageOpen(false);
    if (user.role === 'kasir') {
      setActiveTab('pos');
    } else {
      setActiveTab('dashboard');
    }
  };

  const handleLogout = async () => {
    try {
      await logoutGoogle();
    } catch {
      // ignore
    }
    setCurrentUser(null);
    setIsLoginPageOpen(false);
  };

  // Pending sync transactions calculation
  const pendingSyncTransactions = transactions.filter((t) => !t.syncedToSheet);
  const pendingSyncCount = pendingSyncTransactions.length;
  const isSheetsConnected = Boolean(
    sheetsConfig.status === 'connected' || sheetsConfig.spreadsheetId || sheetsConfig.webhookUrl
  );

  // Push full local state (Dashboard + Transactions including 0 + Products) to Google Sheets
  const handlePushFullToSheet = async () => {
    if (!isOnline) {
      showAppToast('Perangkat sedang offline. Sambungkan internet untuk menyinkronkan Google Sheets.');
      return;
    }
    setIsSyncingToSheets(true);
    setSyncToastMessage(
      transactions.length === 0
        ? 'Mengosongkan lembar Transaksi & memperbarui Dashboard Rp 0 di Google Sheets...'
        : 'Menyinkronkan penuh Dashboard, Transaksi & Produk ke Google Sheets...'
    );
    try {
      const res = await overwriteFullStateToSheet(
        sheetsConfig.spreadsheetId,
        storeProfile,
        transactions,
        products,
        sheetsConfig.webhookUrl,
        true
      );
      if (res.success) {
        if (transactions.length > 0) {
          setTransactions((prev) => prev.map((t) => ({ ...t, syncedToSheet: true })));
        }
        setSheetsConfig((prev) => ({
          ...prev,
          lastSyncedAt: new Date().toISOString(),
          status: 'connected',
        }));
        showAppToast(res.message, 5000);
      } else {
        showAppToast(res.message, 6000);
      }
    } catch (err: any) {
      showAppToast(`Gagal sinkronisasi ke Google Sheets: ${err.message || 'Periksa koneksi'}`, 5000);
    } finally {
      setIsSyncingToSheets(false);
    }
  };

  // Pull full state (Transactions including 0 + Products) from Google Sheets to Dashboard
  const handlePullFullFromSheet = async () => {
    if (!isOnline) {
      showAppToast('Perangkat sedang offline. Sambungkan internet untuk menarik data Google Sheets.');
      return;
    }
    setIsSyncingToSheets(true);
    setSyncToastMessage('Menarik data Transaksi & Produk dari Google Sheets ke Dashboard...');
    try {
      const res = await pullFullStateFromSheet(
        sheetsConfig.spreadsheetId,
        products,
        sheetsConfig.webhookUrl
      );
      if (res.success) {
        if (res.products && res.products.length > 0) {
          setProducts(res.products);
          saveStoredProducts(res.products);
        }
        if (res.transactions !== null) {
          setTransactions(res.transactions);
          saveStoredTransactions(res.transactions);
        }
        setSheetsConfig((prev) => ({
          ...prev,
          lastSyncedAt: new Date().toISOString(),
          status: 'connected',
        }));
        showAppToast(res.message, 5000);
      } else {
        showAppToast(res.message, 6000);
      }
    } catch (err: any) {
      showAppToast(`Gagal menarik data dari Google Sheets: ${err.message || 'Periksa koneksi'}`, 5000);
    } finally {
      setIsSyncingToSheets(false);
    }
  };

  // Zero out all transactions in App (and optionally clear Google Sheets Transaksi + update Dashboard Rp 0)
  const handleZeroAllTransactions = async (alsoClearSheet: boolean) => {
    setTransactions([]);
    clearStoredTransactions();

    if (alsoClearSheet && (sheetsConfig.spreadsheetId || sheetsConfig.webhookUrl)) {
      if (!isOnline) {
        showAppToast(
          'Transaksi aplikasi telah di-0-kan! Sambungkan internet lalu klik "Sinkron Spreadsheets" untuk meng-0-kan Google Sheets.',
          6000
        );
        return;
      }
      setIsSyncingToSheets(true);
      setSyncToastMessage('Mengosongkan (0-kan) lembar Transaksi & memperbarui Dashboard di Google Sheets...');
      try {
        const res = await overwriteFullStateToSheet(
          sheetsConfig.spreadsheetId,
          storeProfile,
          [],
          products,
          sheetsConfig.webhookUrl,
          true
        );
        if (res.success) {
          setSheetsConfig((prev) => ({
            ...prev,
            lastSyncedAt: new Date().toISOString(),
            status: 'connected',
          }));
          showAppToast(
            'Berhasil! Data transaksi di Dashboard aplikasi dan Google Sheets telah sama-sama di-0-kan (Rp 0).',
            5000
          );
        } else {
          showAppToast(`Transaksi aplikasi sudah 0, namun gagal update Sheet: ${res.message}`, 6000);
        }
      } catch (err: any) {
        showAppToast(`Transaksi aplikasi sudah 0, namun gagal update Sheet: ${err.message}`, 5000);
      } finally {
        setIsSyncingToSheets(false);
      }
    } else {
      showAppToast('Seluruh data transaksi di Dashboard aplikasi berhasil di-0-kan (Rp 0)!', 4500);
    }
  };

  // Batch sync offline transactions to Google Sheets (or open 2-way sync modal when 0 pending)
  const handleSyncPendingTransactions = async (silent = false) => {
    if (!isOnline) {
      if (!silent) {
        showAppToast('Mode Offline Aktif. Transaksi tersimpan aman di perangkat & otomatis sinkron saat internet online.');
      }
      return;
    }

    if (!sheetsConfig.spreadsheetId && !sheetsConfig.webhookUrl) {
      if (!silent) {
        if (currentUser?.role === 'admin') {
          setSheetsSyncModalMode('hub');
        } else {
          showAppToast('Google Sheets belum dihubungkan oleh Admin.');
        }
      }
      return;
    }

    const unSynced = transactions.filter((t) => !t.syncedToSheet);
    if (unSynced.length === 0) {
      if (!silent) {
        if (currentUser?.role === 'admin') {
          // Buka modal sinkronisasi 2 arah agar Admin bisa menyamakan kondisi 0 / tarik dari Sheet
          setSheetsSyncModalMode('hub');
        } else {
          showAppToast('Semua transaksi kasir sudah tersinkronkan ke Google Sheets!');
        }
      }
      return;
    }

    setIsSyncingToSheets(true);
    setSyncToastMessage(`Menyinkronkan ${unSynced.length} transaksi ke Google Sheets...`);

    try {
      const res = await batchAppendTransactionsToSheet(
        sheetsConfig.spreadsheetId,
        unSynced,
        products,
        sheetsConfig.webhookUrl,
        transactions,
        storeProfile,
        !silent
      );

      if (res.success) {
        const syncedIds = new Set(unSynced.map((t) => t.id));
        setTransactions((prev) =>
          prev.map((t) => (syncedIds.has(t.id) ? { ...t, syncedToSheet: true } : t))
        );
        setSheetsConfig((prev) => ({
          ...prev,
          lastSyncedAt: new Date().toISOString(),
          status: 'connected',
        }));
        showAppToast(
          `Berhasil menyinkronkan ${unSynced.length} transaksi & memperbarui Dashboard Google Sheets!`,
          4000
        );
      } else {
        showAppToast(`Sinkronisasi tertunda: ${res.message}`, 5000);
      }
    } catch (err: any) {
      console.warn('Error auto-syncing transactions to Google Sheets:', err);
      showAppToast('Gagal sinkronisasi data ke Google Sheets.', 4000);
    } finally {
      setIsSyncingToSheets(false);
    }
  };

  // Auto-sync when internet comes back online or on reconnect
  useEffect(() => {
    if (isOnline && (sheetsConfig.spreadsheetId || sheetsConfig.webhookUrl)) {
      const unSynced = transactions.filter((t) => !t.syncedToSheet);
      if (unSynced.length > 0) {
        console.log(`[Auto-Sync] Internet online, menyinkronkan ${unSynced.length} transaksi ke Google Sheets...`);
        handleSyncPendingTransactions(true);
      }
    }
  }, [isOnline, sheetsConfig.spreadsheetId, sheetsConfig.webhookUrl]);

  // Quick Switch Role (KHUSUS ADMIN untuk simulasi kasir. KASIR DILARANG MENGAKSES ADMIN)
  const handleSwitchRole = () => {
    if (!currentUser || currentUser.role !== 'admin') {
      showAppToast('Akses Ditolak: Hanya Admin yang dapat melakukan simulasi peran.');
      return;
    }
    const targetUser = users.find((u) => u.role === 'kasir') || {
      ...currentUser,
      role: 'kasir',
      name: 'Simulasi Kasir (Petugas Shift)',
    };
    setCurrentUser(targetUser);
    setActiveTab('pos');
  };

  // Complete a sale from POS (Berjalan 100% Offline & Auto-Sync saat Online)
  const handleCompleteSale = async (
    newTransaction: Transaction,
    updatedProducts: Product[]
  ) => {
    let txToSave: Transaction = {
      ...newTransaction,
      syncedToSheet: false,
    };

    // If online and Google Sheets is connected, try to sync immediately!
    if (isOnline && (sheetsConfig.spreadsheetId || sheetsConfig.webhookUrl)) {
      try {
        const nextAllTransactions = [newTransaction, ...transactions];
        const synced = await appendTransactionToSheet(
          sheetsConfig.spreadsheetId,
          newTransaction,
          updatedProducts,
          sheetsConfig.webhookUrl,
          nextAllTransactions,
          storeProfile
        );
        if (synced) {
          txToSave.syncedToSheet = true;
          setSheetsConfig((prev) => ({
            ...prev,
            lastSyncedAt: new Date().toISOString(),
            status: 'connected',
          }));
        }
      } catch (err) {
        console.warn('Real-time Google Sheet sync delayed (disimpan ke antrean offline):', err);
        txToSave.syncedToSheet = false;
      }
    }

    setTransactions((prev) => [txToSave, ...prev]);
    setProducts(updatedProducts);

    // Update transactions served count for active user
    if (currentUser) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === currentUser.id
            ? { ...u, transactionsServed: (u.transactionsServed || 0) + 1 }
            : u
        )
      );
    }
  };

  // Inventory modifications
  const handleAddProduct = (newProdData: Omit<Product, 'id' | 'updatedAt'>): Product => {
    const newProduct: Product = {
      ...newProdData,
      id: `p-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };
    setProducts((prev) => [newProduct, ...prev]);
    return newProduct;
  };

  const handleUpdateProduct = (updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const handleQuickRestock = (productId: string, addQty: number) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, stock: p.stock + addQty, updatedAt: new Date().toISOString() }
          : p
      )
    );
  };

  // User management operations
  const handleAddUser = (newUserData: Omit<UserProfile, 'id'>) => {
    const newUser: UserProfile = {
      ...newUserData,
      id: `user-${Date.now()}`,
    };
    setUsers((prev) => [...prev, newUser]);
  };

  const handleRegisterUser = (newUserData: Omit<UserProfile, 'id'>, clearDemo = true) => {
    const newUser: UserProfile = {
      ...newUserData,
      id: `user-${Date.now()}`,
    };
    setUsers((prev) => {
      const filtered = clearDemo ? prev.filter((u) => !u.isDemo) : prev;
      return [newUser, ...filtered];
    });
    setCurrentUser(newUser);
    setIsLoginPageOpen(false);
  };

  const handleUpdateUserPin = (userId: string, newPin: string) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, pin: newPin, password: newPin, isDemo: false } : u))
    );
    if (currentUser && currentUser.id === userId) {
      setCurrentUser((prev) => (prev ? { ...prev, pin: newPin, password: newPin, isDemo: false } : null));
    }
  };

  const handleClearDemoUsers = () => {
    const realUsers = users.filter((u) => !u.isDemo);
    if (realUsers.length === 0) {
      const primaryRealUser: UserProfile = {
        id: `user-${Date.now()}`,
        name: 'Salsabila (Pemilik Toko)',
        email: storeProfile.email || 'salsabilamart684@gmail.com',
        phone: storeProfile.phone,
        role: 'admin',
        pin: '123456',
        isActive: true,
        transactionsServed: 0,
        isDemo: false,
      };
      setUsers([primaryRealUser]);
      showAppToast('Semua akun demo berhasil dibersihkan! Akun Real "Salsabila" telah disiapkan.');
    } else {
      setUsers(realUsers);
      showAppToast(`Berhasil membersihkan akun demo. Sekarang tersisa ${realUsers.length} akun real.`);
    }
  };

  const handleUpdateUser = (updated: UserProfile) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    if (currentUser && currentUser.id === updated.id) {
      setCurrentUser(updated);
    }
  };

  const handleDeleteUser = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleResetDemoData = () => {
    setProducts(INITIAL_PRODUCTS);
    setTransactions(INITIAL_TRANSACTIONS);
    setStoreProfile(DEFAULT_STORE_PROFILE);
    setUsers(INITIAL_USERS);
    setCart([]);
    saveStoredProducts(INITIAL_PRODUCTS);
    saveStoredTransactions(INITIAL_TRANSACTIONS);
    saveStoredProfile(DEFAULT_STORE_PROFILE);
    saveStoredUsers(INITIAL_USERS);
    showAppToast('Data toko telah berhasil direset ke data awal.');
  };

  const lowStockCount = products.filter((p) => p.stock <= p.minStock).length;
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // 1. IF USER IS NOT LOGGED IN & LOGIN PAGE OPEN: SHOW LOGIN PAGE
  if (!currentUser && isLoginPageOpen) {
    return (
      <LoginPage
        storeProfile={storeProfile}
        users={users}
        onLoginSuccess={handleLoginSuccess}
        onRegisterUser={handleRegisterUser}
        onUpdateUserPin={handleUpdateUserPin}
        onClearDemoUsers={handleClearDemoUsers}
        onGoogleLogin={handleGoogleLogin}
        onBackToProfile={() => setIsLoginPageOpen(false)}
        isLoggingInGoogle={isLoggingInGoogle}
        isDark={isDark}
      />
    );
  }

  // 2. IF USER IS NOT LOGGED IN: SHOW STORE PUBLIC PROFILE
  if (!currentUser) {
    return (
      <>
        <StorePublicProfile
          storeProfile={storeProfile}
          products={products}
          onOpenLogin={() => setIsLoginPageOpen(true)}
          isDark={isDark}
          onToggleDark={handleToggleDark}
          onOpenOnlineGuide={() => setIsOnlineModalOpen(true)}
        />
        <OnlineGuideModal
          isOpen={isOnlineModalOpen}
          onClose={() => setIsOnlineModalOpen(false)}
          isDark={isDark}
        />
      </>
    );
  }

  // Role guard: If cashier tries to stay on an admin tab, redirect to 'pos'
  const isCashier = currentUser.role === 'kasir';
  const effectiveTab: ActiveTab =
    isCashier && !['scanner', 'pos', 'inventory'].includes(activeTab) ? 'pos' : activeTab;

  // 3. IF USER IS LOGGED IN: SHOW MAIN POS APPLICATION
  return (
    <div
      className={`min-h-screen flex font-sans transition-colors ${
        isDark ? 'bg-[#090d16] text-slate-100' : 'bg-slate-50/80 text-slate-800'
      }`}
    >
      {/* Hidden zero-keyboard target for wired USB / OTG barcode scanners */}
      <GlobalScannerSink active={true} />

      {/* Collapsible & Responsive Sidebar */}
      <Sidebar
        activeTab={effectiveTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        storeProfile={storeProfile}
        lowStockCount={lowStockCount}
        cartCount={cartItemCount}
        onOpenLowStock={() => setIsLowStockModalOpen(true)}
        onLogout={handleLogout}
        onSwitchRole={currentUser.role === 'admin' ? handleSwitchRole : undefined}
        isOpenMobile={isOpenMobile}
        setIsOpenMobile={setIsOpenMobile}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isDark={isDark}
        onToggleDark={handleToggleDark}
        onOpenOnlineGuide={() => setIsOnlineModalOpen(true)}
        onOpenChangePin={() => setIsChangePinModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Navbar Header */}
        <header
          className={`sticky top-0 z-30 backdrop-blur-md border-b px-4 sm:px-6 py-3 flex items-center justify-between transition-colors ${
            isDark
              ? 'bg-slate-900/85 border-slate-800/90 shadow-sm'
              : 'bg-white/85 border-slate-200/90 shadow-2xs'
          }`}
        >
          <div className="flex items-center gap-3">
            {/* Mobile Drawer Trigger */}
            <button
              onClick={() => setIsOpenMobile(true)}
              className={`p-2 md:hidden rounded-xl transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Desktop Sidebar Toggle Button */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`hidden md:flex p-2 rounded-xl transition-all cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800/80' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title={isSidebarCollapsed ? 'Buka Sidebar' : 'Tutup Sidebar'}
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`font-black text-sm tracking-tight truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {storeProfile.name}
                </h2>
                <span
                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    currentUser.role === 'admin'
                      ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                      : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {currentUser.role === 'admin' ? 'Akses Admin' : 'Akses Kasir'}
                </span>
                {/* Online / Offline status badge */}
                <button
                  onClick={() => setIsOnlineModalOpen(true)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer transition-colors ${
                    isOnline
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30 animate-pulse'
                  }`}
                  title={isOnline ? 'Online (Terhubung Cloud)' : 'Mode Offline (Data Disimpan Lokal)'}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span>{isOnline ? 'Online' : 'Offline'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block mt-0.5">
                Petugas: <strong>{currentUser.name}</strong> • Shift Aktif
              </p>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2">
            {/* In-App PWA Install Button */}
            <PWAInstallButton variant="header" isDark={isDark} />
            {/* Pakai Tanpa Hosting & Panduan Lokal Button */}
            <button
              onClick={() => setIsOnlineModalOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                isDark
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/40'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 shadow-2xs'
              }`}
              title="Panduan Pakai Tanpa Hosting, Script Runner Lokal, dan Akses HP"
            >
              <HardDrive className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">Pakai Tanpa Hosting</span>
              <span className="sm:hidden">Tanpa Host</span>
            </button>
            {/* Dark/Light Mode Switcher */}
            <button
              onClick={handleToggleDark}
              className={`p-2 rounded-xl transition-all cursor-pointer border ${
                isDark
                  ? 'bg-slate-800/90 border-slate-700/80 text-amber-300 hover:bg-slate-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 shadow-2xs'
              }`}
              title={isDark ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {/* Low Stock Alert Bell Button */}
            <button
              onClick={() => setIsLowStockModalOpen(true)}
              className={`p-2 rounded-xl transition-all relative cursor-pointer border ${
                lowStockCount > 0
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/25'
                  : isDark
                  ? 'bg-slate-800/90 border-slate-700/80 text-slate-400 hover:bg-slate-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 shadow-2xs'
              }`}
              title="Notifikasi Stok Menipis"
            >
              <Bell className="w-4 h-4" />
              {lowStockCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow-xs">
                  {lowStockCount}
                </span>
              )}
            </button>
            {/* Google Sheets Live Sync Status & Trigger */}
            <button
              onClick={() => handleSyncPendingTransactions(false)}
              disabled={isSyncingToSheets}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                pendingSyncCount > 0
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30 animate-pulse'
                  : isSheetsConnected
                  ? isDark
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/40'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 shadow-2xs'
                  : isDark
                  ? 'bg-slate-850 border-slate-700 text-slate-400 hover:bg-slate-800'
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200 shadow-2xs'
              }`}
              title={
                pendingSyncCount > 0
                  ? `${pendingSyncCount} transaksi menunggu sinkronisasi ke Google Sheets. Klik untuk sinkronkan!`
                  : isSheetsConnected
                  ? 'Klik untuk Sinkronisasi 2 Arah Dashboard & Google Sheets (termasuk jika transaksi sudah 0)'
                  : 'Klik untuk menghubungkan Google Sheets'
              }
            >
              {isSyncingToSheets ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              ) : pendingSyncCount > 0 ? (
                <Cloud className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span className="hidden sm:inline">
                {isSyncingToSheets
                  ? 'Menyinkronkan...'
                  : pendingSyncCount > 0
                  ? `Sinkronkan (${pendingSyncCount})`
                  : isSheetsConnected
                  ? 'Sheets: Sinkron'
                  : 'Hubungkan Sheets'}
              </span>
            </button>
            {/* Quick PIN Security button */}
            <button
              onClick={() => setIsChangePinModalOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                isDark
                  ? 'bg-slate-800/90 border-slate-700/80 hover:bg-slate-700 text-slate-300'
                  : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700 shadow-2xs'
              }`}
              title="Ubah PIN / Password Akun Anda"
            >
              <Key className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Ganti PIN</span>
            </button>
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="Keluar ke Profil Toko"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </header>

        {/* Global Low Stock Banner Warning */}
        {lowStockCount > 0 && (
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 px-4 py-2 text-xs flex items-center justify-between shadow-xs font-semibold">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-slate-950" />
              <span>
                <strong>Peringatan Inventaris:</strong> Sebanyak {lowStockCount} barang mencapai batas minimum stok toko!
              </span>
            </div>
            <button
              onClick={() => setIsLowStockModalOpen(true)}
              className="bg-slate-950 text-white font-bold px-3 py-1 rounded-xl text-[11px] hover:bg-slate-850 transition-colors cursor-pointer shadow-xs"
            >
              {currentUser.role === 'admin' ? 'Restock Sekarang' : 'Lihat Barang'}
            </button>
          </div>
        )}

        {/* View Router */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {effectiveTab === 'dashboard' && currentUser.role === 'admin' && (
            <Dashboard
              products={products}
              transactions={transactions}
              storeProfile={storeProfile}
              userRole={currentUser.role}
              onNavigateToPOS={() => setActiveTab('pos')}
              onNavigateToSheets={() => setActiveTab('sheets')}
              onOpenLowStock={() => setIsLowStockModalOpen(true)}
              onSelectReceipt={(tx) => setReceiptModalTx(tx)}
              onExportPDF={() => {
                const today = getLocalDateString();
                const todayTxs = transactions.filter((t) => getLocalDateString(t.date) === today);
                exportDailyReportPDF(today, todayTxs, storeProfile);
              }}
              isSheetsConnected={isSheetsConnected}
              lastSyncedAt={sheetsConfig.lastSyncedAt}
              pendingSyncCount={pendingSyncCount}
              onSyncPending={() => handleSyncPendingTransactions(false)}
              onOpenSyncModal={(mode) => setSheetsSyncModalMode(mode || 'hub')}
              isSyncingSheets={isSyncingToSheets}
              isDark={isDark}
            />
          )}

          {effectiveTab === 'scanner' && (
            <BarcodeScannerMenu
              products={products}
              storeProfile={storeProfile}
              currentUser={currentUser}
              cart={cart}
              setCart={setCart}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onCompleteSale={handleCompleteSale}
              onNavigateToPOS={() => setActiveTab('pos')}
              onNavigateToInventory={() => setActiveTab('inventory')}
              isDark={isDark}
            />
          )}

          {effectiveTab === 'pos' && (
            <POS
              products={products}
              storeProfile={storeProfile}
              currentUser={currentUser}
              cart={cart}
              setCart={setCart}
              onCompleteSale={handleCompleteSale}
              onOpenLowStock={() => setIsLowStockModalOpen(true)}
              onAddProduct={handleAddProduct}
              isDark={isDark}
            />
          )}

          {effectiveTab === 'inventory' && (
            <Inventory
              products={products}
              userRole={currentUser.role}
              storeProfile={storeProfile}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onQuickRestock={handleQuickRestock}
              isDark={isDark}
            />
          )}

          {effectiveTab === 'reports' && currentUser.role === 'admin' && (
            <FinancialReport
              transactions={transactions}
              storeProfile={storeProfile}
              userRole={currentUser.role}
              onOpenSyncModal={(mode) => setSheetsSyncModalMode(mode || 'hub')}
              isDark={isDark}
            />
          )}

          {effectiveTab === 'sheets' && currentUser.role === 'admin' && (
            <GoogleSheetsSync
              products={products}
              transactions={transactions}
              storeProfile={storeProfile}
              config={sheetsConfig}
              onUpdateConfig={(cfg) => setSheetsConfig(cfg)}
              onImportProducts={(imported) => {
                setProducts(imported);
                saveStoredProducts(imported);
              }}
              onImportTransactions={(importedTxs) => {
                setTransactions(importedTxs);
                saveStoredTransactions(importedTxs);
              }}
              onZeroAllTransactions={handleZeroAllTransactions}
              pendingSyncCount={pendingSyncCount}
              onSyncPending={() => handleSyncPendingTransactions(false)}
              isSyncingPending={isSyncingToSheets}
              isDark={isDark}
            />
          )}

          {effectiveTab === 'users' && currentUser.role === 'admin' && (
            <UserManagement
              users={users}
              currentUser={currentUser}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onClearDemoUsers={handleClearDemoUsers}
              isDark={isDark}
            />
          )}

          {effectiveTab === 'settings' && currentUser.role === 'admin' && (
            <StoreSettings
              storeProfile={storeProfile}
              onSaveProfile={(prof) => setStoreProfile(prof)}
              onResetDemoData={handleResetDemoData}
              onOpenZeroTransactions={() => setSheetsSyncModalMode('confirm-zero')}
              isDark={isDark}
            />
          )}
        </main>
      </div>

      {/* Global Low Stock Notification Modal */}
      {isLowStockModalOpen && (
        <LowStockNotificationModal
          products={products}
          userRole={currentUser.role}
          onRestock={handleQuickRestock}
          onClose={() => setIsLowStockModalOpen(false)}
        />
      )}

      {/* Receipt Modal Viewer */}
      {receiptModalTx && (
        <ThermalReceiptModal
          transaction={receiptModalTx}
          storeProfile={storeProfile}
          onClose={() => setReceiptModalTx(null)}
        />
      )}

      {/* Online & Multi-Device Access Modal */}
      <OnlineGuideModal
        isOpen={isOnlineModalOpen}
        onClose={() => setIsOnlineModalOpen(false)}
        isDark={isDark}
      />

      {/* Change PIN / Password Security Modal */}
      {isChangePinModalOpen && currentUser && (
        <ChangePinModal
          isOpen={true}
          user={currentUser}
          onClose={() => setIsChangePinModalOpen(false)}
          onSaveNewPin={handleUpdateUserPin}
          isDark={isDark}
        />
      )}

      {/* 2-Way Dashboard <-> Google Sheets Sync & Zero-Out Modal */}
      <SheetsSyncModal
        isOpen={sheetsSyncModalMode !== null}
        initialMode={sheetsSyncModalMode || 'hub'}
        onClose={() => setSheetsSyncModalMode(null)}
        config={sheetsConfig}
        localTransactionCount={transactions.length}
        todayOmset={transactions
          .filter((t) => getLocalDateString(t.date) === getLocalDateString())
          .reduce((sum, t) => sum + t.total, 0)}
        productCount={products.length}
        isBusy={isSyncingToSheets}
        onPushFullToSheet={handlePushFullToSheet}
        onPullFullFromSheet={handlePullFullFromSheet}
        onZeroTransactions={handleZeroAllTransactions}
        onOpenSheetsMenu={() => setActiveTab('sheets')}
        isDark={isDark}
      />

      {/* Floating Offline Connectivity & Auto-Sync Indicator */}
      <OfflineIndicator
        pendingSyncCount={pendingSyncCount}
        isSyncing={isSyncingToSheets}
        onSyncNow={() => handleSyncPendingTransactions(false)}
        onOpenOnlineGuide={() => setIsOnlineModalOpen(true)}
        syncMessage={syncToastMessage}
      />
    </div>
  );
}
