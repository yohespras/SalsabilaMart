import { Product, StoreProfile, Transaction, UserProfile } from '../types';

export const DEFAULT_STORE_PROFILE: StoreProfile = {
  name: 'Salsabila Mart',
  tagline: 'Toko Serba Ada, Lengkap, Murah & Terpercaya',
  address: 'Jl. Pemuda No. 128, Pasar Sentral',
  phone: '0812-3456-7890',
  email: 'salsabilamart684@gmail.com',
  operatingHours: 'Setiap Hari 07.00 - 22.00 WIB',
  qrisNmid: '',
  receiptHeader: 'Terima kasih telah berbelanja di Salsabila Mart',
  receiptFooter:
    'Barang yang sudah dibeli tidak dapat ditukar kecuali ada cacat pabrik. Simpan struk ini sebagai bukti transaksi.',
  paperSize: '58mm',
};

// Produksi: Seluruh data produk dan transaksi dimulai bersih dari 0 (tanpa data contoh/demo)
export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'admin-salsabila',
    name: 'Salsabila (Pemilik Toko)',
    email: 'salsabilamart684@gmail.com',
    role: 'admin',
    pin: '123456',
    phone: '',
    isActive: true,
    transactionsServed: 0,
    isDemo: false,
  },
];

// Gunakan kunci penyimpanan produksi v2 dan bersihkan sisa kunci demo v1 lama
const LEGACY_DEMO_KEYS = [
  'salsabilamart_products_v1',
  'salsabilamart_transactions_v1',
  'salsabilamart_users_v1',
];

const STORAGE_KEYS = {
  PRODUCTS: 'salsabilamart_products_v2_prod',
  TRANSACTIONS: 'salsabilamart_transactions_v2_prod',
  STORE_PROFILE: 'salsabilamart_store_profile_v2_prod',
  CURRENT_USER: 'salsabilamart_current_user_v2_prod',
  GOOGLE_SHEET_CONFIG: 'salsabilamart_gsheet_config_v2_prod',
  USERS: 'salsabilamart_users_v2_prod',
  DARK_MODE: 'salsabilamart_dark_mode_v1',
};

const purgeLegacyDemoStorageOnce = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    for (const key of LEGACY_DEMO_KEYS) {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // ignore storage errors
  }
};

purgeLegacyDemoStorageOnce();

export const loadStoredProducts = (): Product[] => {
  try {
    purgeLegacyDemoStorageOnce();
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!raw) {
      saveStoredProducts(INITIAL_PRODUCTS);
      return INITIAL_PRODUCTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_PRODUCTS;
  } catch (err) {
    console.error('Error loading products from localStorage:', err);
    return INITIAL_PRODUCTS;
  }
};

export const saveStoredProducts = (products: Product[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  } catch (err) {
    console.error('Error saving products:', err);
  }
};

export const loadStoredTransactions = (): Transaction[] => {
  try {
    purgeLegacyDemoStorageOnce();
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (raw === null) {
      saveStoredTransactions(INITIAL_TRANSACTIONS);
      return INITIAL_TRANSACTIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_TRANSACTIONS;
  } catch (err) {
    console.error('Error loading transactions:', err);
    return INITIAL_TRANSACTIONS;
  }
};

export const saveStoredTransactions = (transactions: Transaction[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  } catch (err) {
    console.error('Error saving transactions:', err);
  }
};

export const loadStoredProfile = (): StoreProfile => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STORE_PROFILE);
    if (!raw) {
      // Migrasikan profil toko v1 jika sudah pernah diubah pemilik
      const legacyProfile = localStorage.getItem('salsabilamart_store_profile_v1');
      if (legacyProfile) {
        const merged = { ...DEFAULT_STORE_PROFILE, ...JSON.parse(legacyProfile) };
        saveStoredProfile(merged);
        localStorage.removeItem('salsabilamart_store_profile_v1');
        return merged;
      }
      saveStoredProfile(DEFAULT_STORE_PROFILE);
      return DEFAULT_STORE_PROFILE;
    }
    return { ...DEFAULT_STORE_PROFILE, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Error loading store profile:', err);
    return DEFAULT_STORE_PROFILE;
  }
};

export const saveStoredProfile = (profile: StoreProfile) => {
  try {
    localStorage.setItem(STORAGE_KEYS.STORE_PROFILE, JSON.stringify(profile));
  } catch (err) {
    console.error('Error saving store profile:', err);
  }
};

export const loadStoredUsers = (): UserProfile[] => {
  try {
    purgeLegacyDemoStorageOnce();
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) {
      saveStoredUsers(INITIAL_USERS);
      return INITIAL_USERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_USERS;
  } catch (err) {
    console.error('Error loading users:', err);
    return INITIAL_USERS;
  }
};

export const saveStoredUsers = (users: UserProfile[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  } catch (err) {
    console.error('Error saving users:', err);
  }
};

export const loadStoredSheetsConfig = (): any => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GOOGLE_SHEET_CONFIG);
    if (!raw) {
      const legacyCfg = localStorage.getItem('salsabilamart_gsheet_config_v1');
      if (legacyCfg) {
        const parsedLegacy = JSON.parse(legacyCfg);
        saveStoredSheetsConfig(parsedLegacy);
        localStorage.removeItem('salsabilamart_gsheet_config_v1');
        return parsedLegacy;
      }
      return {
        spreadsheetId: '',
        spreadsheetName: '',
        spreadsheetUrl: '',
        autoSync: true,
        status: 'disconnected',
      };
    }
    return JSON.parse(raw);
  } catch {
    return {
      spreadsheetId: '',
      spreadsheetName: '',
      spreadsheetUrl: '',
      autoSync: true,
      status: 'disconnected',
    };
  }
};

export const saveStoredSheetsConfig = (config: any) => {
  try {
    localStorage.setItem(STORAGE_KEYS.GOOGLE_SHEET_CONFIG, JSON.stringify(config));
  } catch (err) {
    console.error('Error saving sheets config:', err);
  }
};

export const loadDarkMode = (): boolean => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DARK_MODE);
    return raw ? JSON.parse(raw) : false;
  } catch {
    return false;
  }
};

export const saveDarkMode = (isDark: boolean) => {
  try {
    localStorage.setItem(STORAGE_KEYS.DARK_MODE, JSON.stringify(isDark));
  } catch {
    // ignore
  }
};

export const formatRupiah = (val: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val);
};

/**
 * Menghasilkan tanggal lokal dalam format YYYY-MM-DD (mengikuti zona waktu perangkat WIB/WITA/WIT, bukan UTC)
 */
export const getLocalDateString = (dateInput?: Date | string): string => {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/**
 * Backup & Restore Data Lokal (Penggunaan Tanpa Hosting)
 */
export interface LocalDataBackup {
  version: string;
  exportedAt: string;
  storeProfile: StoreProfile;
  products: Product[];
  transactions: Transaction[];
  users: UserProfile[];
  sheetsConfig: any;
}

export const exportAllLocalDataBackup = (): LocalDataBackup => {
  return {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    storeProfile: loadStoredProfile(),
    products: loadStoredProducts(),
    transactions: loadStoredTransactions(),
    users: loadStoredUsers(),
    sheetsConfig: loadStoredSheetsConfig(),
  };
};

export const importAllLocalDataBackup = (
  rawJson: string
): { success: boolean; message: string; count?: { products: number; transactions: number } } => {
  try {
    const data = JSON.parse(rawJson);
    if (!data.products && !data.transactions && !data.storeProfile) {
      return { success: false, message: 'Format file cadangan tidak valid!' };
    }

    if (Array.isArray(data.products)) {
      saveStoredProducts(data.products);
    }
    if (Array.isArray(data.transactions)) {
      saveStoredTransactions(data.transactions);
    }
    if (data.storeProfile && typeof data.storeProfile === 'object') {
      saveStoredProfile(data.storeProfile);
    }
    if (Array.isArray(data.users)) {
      saveStoredUsers(data.users);
    }
    if (data.sheetsConfig && typeof data.sheetsConfig === 'object') {
      saveStoredSheetsConfig(data.sheetsConfig);
    }

    return {
      success: true,
      message: 'Data toko berhasil dipulihkan dengan sukses!',
      count: {
        products: Array.isArray(data.products) ? data.products.length : 0,
        transactions: Array.isArray(data.transactions) ? data.transactions.length : 0,
      },
    };
  } catch (err) {
    console.error('Error importing backup:', err);
    return { success: false, message: 'Gagal membaca file JSON cadangan. Pastikan file valid.' };
  }
};

export const downloadLocalDataBackupFile = () => {
  try {
    const backup = exportAllLocalDataBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().split('T')[0];
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-salsabila-mart-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Error downloading backup:', err);
    return false;
  }
};

/**
 * Unduh Script Runner Lokal (Windows .BAT)
 */
export const downloadWindowsBatchRunner = () => {
  const batchScript = `@echo off
title Salsabila Mart - Server Kasir Mandiri (Tanpa Hosting)
color 0A
cls
echo ================================================================
echo           SALSABILA MART - KASIR PINTAR POS & INVENTARIS
echo                   MODE LOKAL (TANPA HOSTING)
echo ================================================================
echo.
echo Aplikasi ini berjalan secara lokal di laptop / komputer toko Anda.
echo.
echo Memeriksa lingkungan perangkat...
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Node.js terdeteksi di komputer Anda.
    echo Menjalankan server lokal Vite Preview pada port 3000...
    echo Browser akan otomatis terbuka ke: http://localhost:3000
    echo.
    start "" http://localhost:3000
    call npm run preview
) else (
    echo [INFO] Node.js tidak terdeteksi secara global.
    echo Membuka aplikasi kasir di browser Anda...
    start "" index.html
)
pause
`;

  try {
    const blob = new Blob([batchScript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jalankan-kasir-lokal.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Error downloading batch runner:', err);
    return false;
  }
};

/**
 * Unduh Script Runner Linux / Mac (.sh)
 */
export const downloadShellRunner = () => {
  const shScript = `#!/bin/bash
echo "================================================================"
echo "          SALSABILA MART - KASIR PINTAR POS & INVENTARIS"
echo "                  MODE LOKAL (TANPA HOSTING)"
echo "================================================================"
echo ""
echo "Menjalankan aplikasi kasir lokal pada port 3000..."
echo "Buka browser Anda ke http://localhost:3000"
echo ""
if command -v xdg-open > /dev/null; then
  xdg-open http://localhost:3000 &
elif command -v open > /dev/null; then
  open http://localhost:3000 &
fi
npm run preview
`;

  try {
    const blob = new Blob([shScript], { type: 'text/x-shellscript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jalankan-kasir-lokal.sh';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Error downloading shell runner:', err);
    return false;
  }
};
