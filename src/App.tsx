import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Bell,
  AlertTriangle,
  LogOut,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Key,
  Cloud,
  RefreshCw,
  CheckCircle2,
  HardDrive,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  CartItem,
  GoogleSheetsConfig,
  Product,
  StoreProfile,
  Transaction,
  UserProfile,
} from './types';
import {
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
import {
  googleSignIn,
  initAuth,
  logoutGoogle,
  formatFirebaseAuthError,
  testFirestoreConnection,
} from './services/auth';
import {
  CloudStoreWorkspace,
  canUseCloudSync,
  ensureCloudStoreWorkspace,
  subscribeToCloudStore,
  upsertCloudStoreSettings,
  upsertCloudProduct,
  updateCloudProductStockOnly,
  deleteCloudProduct,
  createCloudTransaction,
  markCloudTransactionsSyncedToSheet,
  syncImportedProductsToCloud,
  syncImportedTransactionsToCloud,
  upsertCloudStaffProfile,
  deleteCloudStaffProfile,
  propagateAllowedEmailsToStoreDocs,
} from './services/cloudSync';
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

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let readable = error?.message || 'Terjadi gangguan tak terduga pada aplikasi.';
    try {
      const parsed = JSON.parse(readable);
      if (parsed && parsed.error) {
        readable = `Gangguan sinkronisasi Cloud (${parsed.operationType || 'akses'}): ${parsed.error}`;
      }
    } catch {
      // Bukan JSON FirestoreErrorInfo
    }
    return { hasError: true, errorMessage: readable };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('AppErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-base font-black">Gangguan Sinkronisasi Aplikasi</h2>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {this.state.errorMessage}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Muat Ulang Aplikasi
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function parseCloudErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err || '');
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.error === 'string') {
      if (parsed.error.includes('Missing or insufficient permissions')) {
        return 'Akses Cloud ditolak: pastikan email Google Anda terdaftar sebagai Admin atau Staf Kasir toko.';
      }
      if (parsed.error.includes('resource-exhausted') || parsed.error.includes('Quota')) {
        return 'Kuota sinkronisasi harian Cloud penuh sementara. Data tetap aman tersimpan di perangkat.';
      }
      return `Sinkronisasi Cloud tertunda: ${parsed.error}`;
    }
  } catch {
    // bukan JSON
  }
  return raw || 'Sinkronisasi Cloud tertunda, data tersimpan aman di perangkat lokal.';
}

function AppContent() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [cloudWorkspace, setCloudWorkspace] = useState<CloudStoreWorkspace | null>(null);
  const [isConnectingCloud, setIsConnectingCloud] = useState(false);

  const [isLoginPageOpen, setIsLoginPageOpen] = useState(false);
  const [isLoggingInGoogle, setIsLoggingInGoogle] = useState(false);

  // Theme State: Dark / Light Mode
  const [isDark, setIsDark] = useState<boolean>(() => loadDarkMode());
  const isOnline = useOnlineStatus();

  // Navigation & Layout States
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Core Data States (Starts cleanly from 0 products & 0 transactions)
  const [products, setProducts] = useState<Product[]>(() => loadStoredProducts());
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    loadStoredTransactions()
  );
  const [storeProfile, setStoreProfile] = useState<StoreProfile>(() => loadStoredProfile());
  const [users, setUsers] = useState<UserProfile[]>(() => loadStoredUsers());
  const [cart, setCart] = useState<CartItem[]>([]);

  // Google Sheets Config (Loaded from persistent localStorage & synced via Cloud)
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig>(() =>
    loadStoredSheetsConfig()
  );
  const [isSyncingToSheets, setIsSyncingToSheets] = useState(false);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);

  // Refs for fresh state access inside listeners and async callbacks
  const currentUserRef = useRef(currentUser);
  const firebaseUserRef = useRef(firebaseUser);
  const cloudWorkspaceRef = useRef(cloudWorkspace);
  const productsRef = useRef(products);
  const transactionsRef = useRef(transactions);
  const storeProfileRef = useRef(storeProfile);
  const sheetsConfigRef = useRef(sheetsConfig);
  const usersRef = useRef(users);

  currentUserRef.current = currentUser;
  firebaseUserRef.current = firebaseUser;
  cloudWorkspaceRef.current = cloudWorkspace;
  productsRef.current = products;
  transactionsRef.current = transactions;
  storeProfileRef.current = storeProfile;
  sheetsConfigRef.current = sheetsConfig;
  usersRef.current = users;

  const showAppToast = (msg: string, duration = 4000) => {
    setSyncToastMessage(msg);
    setTimeout(() => {
      setSyncToastMessage((prev) => (prev === msg ? null : prev));
    }, duration);
  };

  const runCloudTask = async <T,>(promise: Promise<T>): Promise<T | null> => {
    try {
      return await promise;
    } catch (err) {
      const msg = parseCloudErrorMessage(err);
      showAppToast(msg, 5000);
      return null;
    }
  };

  // Modal States
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);
  const [receiptModalTx, setReceiptModalTx] = useState<Transaction | null>(null);
  const [isOnlineModalOpen, setIsOnlineModalOpen] = useState(false);
  const [isChangePinModalOpen, setIsChangePinModalOpen] = useState(false);
  const [sheetsSyncModalMode, setSheetsSyncModalMode] = useState<SyncModalInitialMode | null>(null);

  const isCloudSynced = Boolean(cloudWorkspace && firebaseUser);

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

  // Sync core collections to localStorage (Offline-First Resilience)
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

  // 1. Initialize Firebase Auth listener ONCE on startup
  useEffect(() => {
    testFirestoreConnection();
    const unsubscribeAuth = initAuth(
      (user) => {
        setFirebaseUser(user);
      },
      () => {
        setFirebaseUser(null);
        setCloudWorkspace(null);
      }
    );
    return () => {
      unsubscribeAuth();
    };
  }, []);

  // 2. Bootstrap & Subscribe to Real-Time Multi-Device Cloud Store whenever Google user is active
  useEffect(() => {
    if (!firebaseUser || !canUseCloudSync(firebaseUser)) {
      setCloudWorkspace(null);
      return;
    }

    let cancelled = false;
    let unsubCloudStore: (() => void) | null = null;

    const setupCloudSync = async () => {
      setIsConnectingCloud(true);
      try {
        const ws = await ensureCloudStoreWorkspace(
          firebaseUser,
          storeProfileRef.current,
          sheetsConfigRef.current,
          productsRef.current,
          transactionsRef.current,
          usersRef.current
        );

        if (cancelled || !ws) return;

        setCloudWorkspace(ws);
        cloudWorkspaceRef.current = ws;

        // Auto-login atau sesuaikan profil pengguna berdasarkan akun Google yang aktif
        const userEmailLower = (firebaseUser.email || '').toLowerCase();
        const matchedStaff = usersRef.current.find(
          (u) => u.email.toLowerCase() === userEmailLower
        );
        const resolvedRole = ws.isOwner ? 'admin' : matchedStaff?.role || 'kasir';

        if (!currentUserRef.current) {
          const nextUser: UserProfile = matchedStaff
            ? {
                ...matchedStaff,
                role: resolvedRole,
                avatar: firebaseUser.photoURL || matchedStaff.avatar,
              }
            : {
                id: firebaseUser.uid,
                name:
                  firebaseUser.displayName ||
                  (ws.isOwner ? 'Salsabila (Pemilik Toko)' : 'Kasir Toko'),
                email: firebaseUser.email || 'salsabilamart684@gmail.com',
                role: resolvedRole,
                isActive: true,
                transactionsServed: 0,
                isDemo: false,
                avatar: firebaseUser.photoURL || undefined,
              };
          setCurrentUser(nextUser);
          setIsLoginPageOpen(false);
          if (nextUser.role === 'kasir') {
            setActiveTab('pos');
          }
        }

        // Berlangganan snapshot real-time lintas perangkat (HP, Tablet, Laptop)
        unsubCloudStore = subscribeToCloudStore(ws, firebaseUser, {
          onStoreSettings: (nextProfile, sheetsPatch, allowedEmails) => {
            if (cancelled) return;
            setStoreProfile(nextProfile);
            setSheetsConfig((prev) => ({
              ...prev,
              ...sheetsPatch,
            }));
            setCloudWorkspace((prev) =>
              prev ? { ...prev, allowedEmails } : prev
            );
          },
          onProducts: (cloudProducts) => {
            if (cancelled) return;
            setProducts(cloudProducts);
          },
          onTransactions: (cloudTransactions) => {
            if (cancelled) return;
            setTransactions(cloudTransactions);
          },
          onUsers: (cloudUsers) => {
            if (cancelled) return;
            if (ws.isOwner) {
              setUsers(cloudUsers);
              const active = currentUserRef.current;
              if (active) {
                const updatedSelf = cloudUsers.find(
                  (u) =>
                    u.id === active.id ||
                    u.email.toLowerCase() === active.email.toLowerCase()
                );
                if (updatedSelf) {
                  setCurrentUser((prev) =>
                    prev ? { ...prev, ...updatedSelf, role: 'admin' } : prev
                  );
                }
              }
            } else if (cloudUsers.length > 0) {
              const selfProfile = cloudUsers[0];
              setUsers((prev) => {
                const exists = prev.some((u) => u.id === selfProfile.id);
                return exists
                  ? prev.map((u) => (u.id === selfProfile.id ? selfProfile : u))
                  : [...prev, selfProfile];
              });
              setCurrentUser((prev) =>
                prev && prev.email.toLowerCase() === selfProfile.email.toLowerCase()
                  ? { ...prev, ...selfProfile }
                  : prev
              );
            }
          },
        });
      } catch (err) {
        if (!cancelled) {
          showAppToast(parseCloudErrorMessage(err), 5000);
        }
      } finally {
        if (!cancelled) {
          setIsConnectingCloud(false);
        }
      }
    };

    setupCloudSync();

    return () => {
      cancelled = true;
      if (unsubCloudStore) {
        unsubCloudStore();
      }
    };
  }, [firebaseUser?.uid]);

  // Handle Google Login from LoginPage
  const handleGoogleLogin = async () => {
    setIsLoggingInGoogle(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setFirebaseUser(res.user);
        const emailLower = (res.user.email || '').toLowerCase();
        const matched = usersRef.current.find(
          (u) => u.email.toLowerCase() === emailLower
        );
        const isPrimaryAdmin = emailLower === 'salsabilamart684@gmail.com';
        const resolvedRole = isPrimaryAdmin ? 'admin' : matched?.role || 'admin';

        const authedUser: UserProfile = matched
          ? {
              ...matched,
              role: resolvedRole,
              avatar: res.user.photoURL || matched.avatar,
            }
          : {
              id: res.user.uid,
              name: res.user.displayName || 'Salsabila (Pemilik Toko)',
              email: res.user.email || 'salsabilamart684@gmail.com',
              role: resolvedRole,
              isActive: true,
              transactionsServed: 0,
              isDemo: false,
              avatar: res.user.photoURL || undefined,
            };

        setCurrentUser(authedUser);
        setActiveTab(authedUser.role === 'kasir' ? 'pos' : 'dashboard');
        setIsLoginPageOpen(false);
        showAppToast('Login Google berhasil! Data toko otomatis disinkronkan lintas perangkat.', 4500);
      }
    } catch (err: any) {
      console.error('Google login failed:', err);
      const friendlyMsg = formatFirebaseAuthError(err);
      showAppToast(friendlyMsg, 5000);
    } finally {
      setIsLoggingInGoogle(false);
    }
  };

  // Connect Google Cloud Sync while already logged in via local PIN
  const handleConnectCloud = async () => {
    if (isConnectingCloud) return;
    setIsConnectingCloud(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setFirebaseUser(res.user);
        showAppToast(
          `Sinkronisasi Cloud aktif (${res.user.email})! Data otomatis sama di semua perangkat.`,
          5000
        );
      }
    } catch (err: any) {
      const friendlyMsg = formatFirebaseAuthError(err);
      showAppToast(friendlyMsg, 5000);
    } finally {
      setIsConnectingCloud(false);
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
    setFirebaseUser(null);
    setCloudWorkspace(null);
    setCurrentUser(null);
    setIsLoginPageOpen(false);
  };

  // Pending sync transactions calculation
  const pendingSyncTransactions = transactions.filter((t) => !t.syncedToSheet);
  const pendingSyncCount = pendingSyncTransactions.length;
  const isSheetsConnected = Boolean(
    sheetsConfig.status === 'connected' || sheetsConfig.spreadsheetId || sheetsConfig.webhookUrl
  );

  // Push full local state (Dashboard + Transactions + Products) to Google Sheets
  const handlePushFullToSheet = async () => {
    if (!isOnline) {
      showAppToast('Perangkat sedang offline. Sambungkan internet untuk menyinkronkan Google Sheets.');
      return;
    }
    setIsSyncingToSheets(true);
    setSyncToastMessage(
      transactions.length === 0
        ? 'Menyinkronkan kondisi awal 0 transaksi & produk ke Google Sheets...'
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
        const allTxIds = transactions.map((t) => t.id);
        if (transactions.length > 0) {
          setTransactions((prev) => prev.map((t) => ({ ...t, syncedToSheet: true })));
        }
        const nextCfg: GoogleSheetsConfig = {
          ...sheetsConfig,
          lastSyncedAt: new Date().toISOString(),
          status: 'connected',
        };
        setSheetsConfig(nextCfg);

        const ws = cloudWorkspaceRef.current;
        const fbUser = firebaseUserRef.current;
        if (ws && fbUser) {
          if (allTxIds.length > 0) {
            await runCloudTask(markCloudTransactionsSyncedToSheet(ws, fbUser, allTxIds));
          }
          await runCloudTask(
            upsertCloudStoreSettings(ws, fbUser, storeProfileRef.current, nextCfg, usersRef.current)
          );
        }

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

  // Pull full state (Transactions + Products) from Google Sheets to Dashboard & Cloud
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
        const ws = cloudWorkspaceRef.current;
        const fbUser = firebaseUserRef.current;

        if (res.products && res.products.length > 0) {
          setProducts(res.products);
          saveStoredProducts(res.products);
          if (ws && fbUser) {
            await runCloudTask(syncImportedProductsToCloud(ws, fbUser, res.products));
          }
        }
        if (res.transactions !== null) {
          setTransactions(res.transactions);
          saveStoredTransactions(res.transactions);
          if (ws && fbUser) {
            await runCloudTask(syncImportedTransactionsToCloud(ws, fbUser, res.transactions));
          }
        }
        const nextCfg: GoogleSheetsConfig = {
          ...sheetsConfig,
          lastSyncedAt: new Date().toISOString(),
          status: 'connected',
        };
        setSheetsConfig(nextCfg);
        if (ws && fbUser) {
          await runCloudTask(
            upsertCloudStoreSettings(ws, fbUser, storeProfileRef.current, nextCfg, usersRef.current)
          );
        }
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
        const syncedIdArray = unSynced.map((t) => t.id);
        const syncedIds = new Set(syncedIdArray);
        setTransactions((prev) =>
          prev.map((t) => (syncedIds.has(t.id) ? { ...t, syncedToSheet: true } : t))
        );
        const nextCfg: GoogleSheetsConfig = {
          ...sheetsConfig,
          lastSyncedAt: new Date().toISOString(),
          status: 'connected',
        };
        setSheetsConfig(nextCfg);

        const ws = cloudWorkspaceRef.current;
        const fbUser = firebaseUserRef.current;
        if (ws && fbUser) {
          await runCloudTask(markCloudTransactionsSyncedToSheet(ws, fbUser, syncedIdArray));
          await runCloudTask(
            upsertCloudStoreSettings(ws, fbUser, storeProfileRef.current, nextCfg, usersRef.current)
          );
        }

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

  // Complete a sale from POS (Offline-First + Real-Time Multi-Device Cloud + Google Sheets)
  const handleCompleteSale = async (
    newTransaction: Transaction,
    updatedProducts: Product[]
  ) => {
    let txToSave: Transaction = {
      ...newTransaction,
      syncedToSheet: false,
    };

    // If online and Google Sheets is connected, try to sync immediately
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
    let updatedActiveStaff: UserProfile | null = null;
    if (currentUser) {
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === currentUser.id || u.email.toLowerCase() === currentUser.email.toLowerCase()) {
            const nextU = { ...u, transactionsServed: (u.transactionsServed || 0) + 1 };
            updatedActiveStaff = nextU;
            return nextU;
          }
          return u;
        })
      );
    }

    // Push transaction & updated product stock to Cloud Firestore so other devices update immediately
    const ws = cloudWorkspaceRef.current;
    const fbUser = firebaseUserRef.current;
    if (ws && fbUser) {
      const soldIds = new Set(txToSave.items.map((item) => item.productId));
      const changedProducts = updatedProducts.filter((p) => soldIds.has(p.id));

      void runCloudTask(
        (async () => {
          await createCloudTransaction(ws, fbUser, txToSave);
          for (const prod of changedProducts) {
            await updateCloudProductStockOnly(ws, fbUser, prod.id, prod.stock, prod.updatedAt);
          }
          if (updatedActiveStaff) {
            await upsertCloudStaffProfile(ws, fbUser, updatedActiveStaff);
          }
        })()
      );
    }
  };

  // Inventory modifications (Local + Multi-Device Cloud Sync)
  const handleAddProduct = (newProdData: Omit<Product, 'id' | 'updatedAt'>): Product => {
    const newProduct: Product = {
      ...newProdData,
      id: `p-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };
    setProducts((prev) => [newProduct, ...prev]);

    const ws = cloudWorkspaceRef.current;
    const fbUser = firebaseUserRef.current;
    if (ws && fbUser) {
      void runCloudTask(upsertCloudProduct(ws, fbUser, newProduct));
    }
    return newProduct;
  };

  const handleUpdateProduct = (updated: Product) => {
    const stamped: Product = {
      ...updated,
      updatedAt: new Date().toISOString(),
    };
    setProducts((prev) => prev.map((p) => (p.id === stamped.id ? stamped : p)));

    const ws = cloudWorkspaceRef.current;
    const fbUser = firebaseUserRef.current;
    if (ws && fbUser) {
      void runCloudTask(upsertCloudProduct(ws, fbUser, stamped));
    }
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));

    const ws = cloudWorkspaceRef.current;
    const fbUser = firebaseUserRef.current;
    if (ws && fbUser) {
      void runCloudTask(deleteCloudProduct(ws, fbUser, productId));
    }
  };

  const handleQuickRestock = (productId: string, addQty: number) => {
    const nextUpdatedAt = new Date().toISOString();
    let targetNewStock: number | null = null;

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          targetNewStock = p.stock + addQty;
          return { ...p, stock: targetNewStock, updatedAt: nextUpdatedAt };
        }
        return p;
      })
    );

    const ws = cloudWorkspaceRef.current;
    const fbUser = firebaseUserRef.current;
    if (ws && fbUser && targetNewStock !== null) {
      const finalStock = targetNewStock;
      void runCloudTask(
        updateCloudProductStockOnly(ws, fbUser, productId, finalStock, nextUpdatedAt)
      );
    }
  };

  // Store Profile & Google Sheets Config updates (Local + Multi-Device Cloud Sync)
  const handleSaveProfile = (nextProfile: StoreProfile) => {
    setStoreProfile(nextProfile);
    const ws = cloudWorkspaceRef.current;
    const fbUser = firebaseUserRef.current;
    if (ws && fbUser) {
      void runCloudTask(
        upsertCloudStoreSettings(ws, fbUser, nextProfile, sheetsConfigRef.current, usersRef.current)
      );
    }
  };

  const handleUpdateSheetsConfig = (nextCfg: GoogleSheetsConfig) => {
    setSheetsConfig(nextCfg);
    const ws = cloudWorkspaceRef.current;
    const fbUser = firebaseUserRef.current;
    if (ws && fbUser) {
      void runCloudTask(
        upsertCloudStoreSettings(ws, fbUser, storeProfileRef.current, nextCfg, usersRef.current)
      );
    }
  };

  // User management operations (Local + Multi-Device Cloud Sync + Staff Email Access Propagation)
  const syncStaffListAccessToCloud = async (nextUsers: UserProfile[], targetStaff?: UserProfile) => {
    const ws = cloudWorkspaceRef.current;
    const fbUser = firebaseUserRef.current;
    if (!ws || !fbUser) return;

    if (targetStaff) {
      await upsertCloudStaffProfile(ws, fbUser, targetStaff);
    }
    const nextAllowedEmails = await upsertCloudStoreSettings(
      ws,
      fbUser,
      storeProfileRef.current,
      sheetsConfigRef.current,
      nextUsers
    );
    setCloudWorkspace((prev) =>
      prev ? { ...prev, allowedEmails: nextAllowedEmails } : prev
    );
    await propagateAllowedEmailsToStoreDocs(ws, fbUser, nextAllowedEmails);
  };

  const handleAddUser = (newUserData: Omit<UserProfile, 'id'>) => {
    const newUser: UserProfile = {
      ...newUserData,
      id: `user-${Date.now()}`,
      isDemo: false,
    };
    const nextUsers = [...usersRef.current, newUser];
    setUsers(nextUsers);
    void runCloudTask(syncStaffListAccessToCloud(nextUsers, newUser));
  };

  const handleRegisterUser = (newUserData: Omit<UserProfile, 'id'>) => {
    const newUser: UserProfile = {
      ...newUserData,
      id: `user-${Date.now()}`,
      isDemo: false,
    };
    const nextUsers = [newUser, ...usersRef.current.filter((u) => !u.isDemo)];
    setUsers(nextUsers);
    setCurrentUser(newUser);
    setIsLoginPageOpen(false);
    void runCloudTask(syncStaffListAccessToCloud(nextUsers, newUser));
  };

  const handleUpdateUserPin = (userId: string, newPin: string) => {
    let updatedTarget: UserProfile | undefined;
    const nextUsers = usersRef.current.map((u) => {
      if (u.id === userId) {
        updatedTarget = { ...u, pin: newPin, password: newPin, isDemo: false };
        return updatedTarget;
      }
      return u;
    });
    setUsers(nextUsers);

    if (currentUser && currentUser.id === userId) {
      setCurrentUser((prev) =>
        prev ? { ...prev, pin: newPin, password: newPin, isDemo: false } : null
      );
    }

    const ws = cloudWorkspaceRef.current;
    const fbUser = firebaseUserRef.current;
    if (ws && fbUser && updatedTarget) {
      void runCloudTask(upsertCloudStaffProfile(ws, fbUser, updatedTarget));
    }
  };

  const handleUpdateUser = (updated: UserProfile) => {
    const cleanUpdated: UserProfile = { ...updated, isDemo: false };
    const nextUsers = usersRef.current.map((u) =>
      u.id === cleanUpdated.id ? cleanUpdated : u
    );
    setUsers(nextUsers);
    if (currentUser && currentUser.id === cleanUpdated.id) {
      setCurrentUser(cleanUpdated);
    }
    void runCloudTask(syncStaffListAccessToCloud(nextUsers, cleanUpdated));
  };

  const handleDeleteUser = (userId: string) => {
    const nextUsers = usersRef.current.filter((u) => u.id !== userId);
    setUsers(nextUsers);

    const ws = cloudWorkspaceRef.current;
    const fbUser = firebaseUserRef.current;
    if (ws && fbUser) {
      void runCloudTask(
        (async () => {
          await deleteCloudStaffProfile(ws, fbUser, userId);
          const nextAllowed = await upsertCloudStoreSettings(
            ws,
            fbUser,
            storeProfileRef.current,
            sheetsConfigRef.current,
            nextUsers
          );
          setCloudWorkspace((prev) =>
            prev ? { ...prev, allowedEmails: nextAllowed } : prev
          );
          await propagateAllowedEmailsToStoreDocs(ws, fbUser, nextAllowed);
        })()
      );
    }
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
                  title={isOnline ? 'Online (Terhubung Internet)' : 'Mode Offline (Data Disimpan Lokal)'}
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

            {/* Multi-Device Cloud Sync Status / Connect Trigger */}
            {isCloudSynced ? (
              <div
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border ${
                  isDark
                    ? 'bg-teal-950/40 border-teal-500/30 text-teal-300'
                    : 'bg-teal-50 border-teal-300 text-teal-700 shadow-2xs'
                }`}
                title={`Sinkronisasi Lintas Perangkat Aktif (${firebaseUser?.email || ''})`}
              >
                <Cloud className="w-3.5 h-3.5 text-teal-400" />
                <span className="hidden lg:inline">Cloud: Sinkron</span>
              </div>
            ) : (
              <button
                onClick={handleConnectCloud}
                disabled={isConnectingCloud}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isDark
                    ? 'bg-sky-950/50 border-sky-500/40 text-sky-300 hover:bg-sky-900/50'
                    : 'bg-sky-50 border-sky-300 text-sky-700 hover:bg-sky-100 shadow-2xs'
                }`}
                title="Hubungkan Akun Google agar data produk, stok & transaksi otomatis sama di HP, Tablet, dan Laptop lain"
              >
                {isConnectingCloud ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                ) : (
                  <Cloud className="w-3.5 h-3.5 text-sky-400" />
                )}
                <span className="hidden md:inline">
                  {isConnectingCloud ? 'Menghubungkan...' : 'Sinkron Perangkat'}
                </span>
              </button>
            )}

            {/* Pakai Tanpa Hosting & Panduan Lokal Button */}
            <button
              onClick={() => setIsOnlineModalOpen(true)}
              className={`hidden xl:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                isDark
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/40'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100 shadow-2xs'
              }`}
              title="Panduan Pakai Tanpa Hosting, Script Runner Lokal, dan Akses HP"
            >
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tanpa Hosting</span>
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
                  ? 'Klik untuk Sinkronisasi 2 Arah Dashboard & Google Sheets'
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
              onNavigateToInventory={() => setActiveTab('inventory')}
              onNavigateToSheets={() => setActiveTab('sheets')}
              onOpenLowStock={() => setIsLowStockModalOpen(true)}
              onSelectReceipt={(tx) => setReceiptModalTx(tx)}
              onExportPDF={() => {
                const today = getLocalDateString();
                const todayTxs = transactions.filter((t) => getLocalDateString(t.date) === today);
                exportDailyReportPDF(today, todayTxs, storeProfile);
              }}
              isSheetsConnected={isSheetsConnected}
              isCloudSynced={isCloudSynced}
              onConnectCloud={handleConnectCloud}
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
              onUpdateConfig={handleUpdateSheetsConfig}
              onImportProducts={(imported) => {
                setProducts(imported);
                saveStoredProducts(imported);
                const ws = cloudWorkspaceRef.current;
                const fbUser = firebaseUserRef.current;
                if (ws && fbUser) {
                  void runCloudTask(syncImportedProductsToCloud(ws, fbUser, imported));
                }
              }}
              onImportTransactions={(importedTxs) => {
                setTransactions(importedTxs);
                saveStoredTransactions(importedTxs);
                const ws = cloudWorkspaceRef.current;
                const fbUser = firebaseUserRef.current;
                if (ws && fbUser) {
                  void runCloudTask(syncImportedTransactionsToCloud(ws, fbUser, importedTxs));
                }
              }}
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
              isCloudSynced={isCloudSynced}
              isDark={isDark}
            />
          )}

          {effectiveTab === 'settings' && currentUser.role === 'admin' && (
            <StoreSettings
              storeProfile={storeProfile}
              onSaveProfile={handleSaveProfile}
              isCloudSynced={isCloudSynced}
              onConnectCloud={handleConnectCloud}
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

      {/* 2-Way Dashboard <-> Google Sheets Sync Modal */}
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

export default function App() {
  return (
    <AppErrorBoundary>
      <AppContent />
    </AppErrorBoundary>
  );
}
