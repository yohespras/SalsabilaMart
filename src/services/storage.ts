import { Product, StoreProfile, Transaction, UserProfile } from '../types';

export const DEFAULT_STORE_PROFILE: StoreProfile = {
  name: 'Salsabila Mart',
  tagline: 'Toko Serba Ada, Lengkap, Murah & Terpercaya',
  address: 'Jl. Pemuda No. 128, Pasar Sentral',
  phone: '0812-3456-7890',
  email: 'salsabilamart684@gmail.com',
  operatingHours: 'Setiap Hari 07.00 - 22.00 WIB',
  qrisNmid: 'ID10200304050607',
  receiptHeader: 'Terima kasih telah berbelanja di Salsabila Mart',
  receiptFooter: 'Barang yang sudah dibeli tidak dapat ditukar kecuali ada cacat pabrik. Simpan struk ini sebagai bukti transaksi.',
  paperSize: '58mm',
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'p-1',
    barcode: '8999999195041',
    name: 'Beras Premium Ramos 5kg',
    category: 'Sembako',
    price: 74000,
    costPrice: 66000,
    stock: 15,
    minStock: 5,
    unit: 'sak',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p-2',
    barcode: '8992388123456',
    name: 'Minyak Goreng Sania 2L',
    category: 'Sembako',
    price: 36000,
    costPrice: 32500,
    stock: 4, // Low stock alert! (<= minStock 6)
    minStock: 6,
    unit: 'pouch',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p-3',
    barcode: '8998866200234',
    name: 'Gula Pasir Gulaku 1kg',
    category: 'Sembako',
    price: 18500,
    costPrice: 16500,
    stock: 20,
    minStock: 5,
    unit: 'bks',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p-4',
    barcode: '8992775210101',
    name: 'Indomie Goreng Spesial 85g',
    category: 'Makanan Instan',
    price: 3500,
    costPrice: 3000,
    stock: 72,
    minStock: 20,
    unit: 'pcs',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p-5',
    barcode: '8992775210102',
    name: 'Indomie Kuah Ayam Bawang 75g',
    category: 'Makanan Instan',
    price: 3500,
    costPrice: 3000,
    stock: 7, // Low stock alert!
    minStock: 15,
    unit: 'pcs',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p-6',
    barcode: '8991389222333',
    name: 'Telur Ayam Negeri 1kg',
    category: 'Sembako',
    price: 29000,
    costPrice: 26000,
    stock: 14,
    minStock: 5,
    unit: 'kg',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p-7',
    barcode: '8996001301015',
    name: 'Teh Botol Sosro 450ml',
    category: 'Minuman',
    price: 6500,
    costPrice: 5200,
    stock: 3, // Low stock alert!
    minStock: 10,
    unit: 'btl',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p-8',
    barcode: '8996001410007',
    name: 'Aqua Air Mineral 600ml',
    category: 'Minuman',
    price: 4000,
    costPrice: 3000,
    stock: 36,
    minStock: 12,
    unit: 'btl',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p-9',
    barcode: '8992753210045',
    name: 'Kopi Kapal Api Spesial Mix 10s',
    category: 'Minuman',
    price: 15000,
    costPrice: 13200,
    stock: 24,
    minStock: 6,
    unit: 'renceng',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p-10',
    barcode: '8998899120011',
    name: 'Susu UHT Ultra Milk Cokelat 250ml',
    category: 'Minuman',
    price: 7500,
    costPrice: 6200,
    stock: 18,
    minStock: 8,
    unit: 'kotak',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p-11',
    barcode: '8999999551101',
    name: 'Sabun Mandi Lifebuoy Total 10 110g',
    category: 'Perlengkapan Mandi',
    price: 5500,
    costPrice: 4300,
    stock: 22,
    minStock: 8,
    unit: 'pcs',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'p-12',
    barcode: '8992695123456',
    name: 'Deterjen Rinso Molto Bubuk 770g',
    category: 'Kebutuhan Rumah',
    price: 24000,
    costPrice: 20500,
    stock: 5, // Low stock alert!
    minStock: 8,
    unit: 'bks',
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'TRX-20261012-001',
    date: new Date(Date.now() - 3600000 * 3).toISOString(),
    cashierName: 'Kasir Salsabila Mart',
    cashierRole: 'kasir',
    items: [
      {
        productId: 'p-1',
        barcode: '8999999195041',
        name: 'Beras Premium Ramos 5kg',
        price: 74000,
        costPrice: 66000,
        quantity: 1,
        subtotal: 74000,
      },
      {
        productId: 'p-4',
        barcode: '8992775210101',
        name: 'Indomie Goreng Spesial 85g',
        price: 3500,
        costPrice: 3000,
        quantity: 5,
        subtotal: 17500,
      },
    ],
    subtotal: 91500,
    discount: 0,
    total: 91500,
    paymentMethod: 'TUNAI',
    amountPaid: 100000,
    change: 8500,
  },
  {
    id: 'TRX-20261012-002',
    date: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    cashierName: 'Salsabila (Admin)',
    cashierRole: 'admin',
    items: [
      {
        productId: 'p-2',
        barcode: '8992388123456',
        name: 'Minyak Goreng Sania 2L',
        price: 36000,
        costPrice: 32500,
        quantity: 2,
        subtotal: 72000,
      },
      {
        productId: 'p-3',
        barcode: '8998866200234',
        name: 'Gula Pasir Gulaku 1kg',
        price: 18500,
        costPrice: 16500,
        quantity: 1,
        subtotal: 18500,
      },
      {
        productId: 'p-8',
        barcode: '8996001410007',
        name: 'Aqua Air Mineral 600ml',
        price: 4000,
        costPrice: 3000,
        quantity: 2,
        subtotal: 8000,
      },
    ],
    subtotal: 98500,
    discount: 3500,
    total: 95000,
    paymentMethod: 'QRIS',
    amountPaid: 95000,
    change: 0,
    qrisRef: 'QRIS-ID-88491209',
  },
];

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'user-admin-1',
    name: 'Salsabila (Pemilik Toko)',
    email: 'salsabilamart684@gmail.com',
    role: 'admin',
    pin: '123456',
    phone: '0812-3456-7890',
    isActive: true,
    transactionsServed: 148,
    isDemo: false,
  },
  {
    id: 'user-kasir-1',
    name: 'Budi Santoso',
    email: 'kasir.budi@gmail.com',
    role: 'kasir',
    pin: '123456',
    phone: '0857-1122-3344',
    isActive: true,
    transactionsServed: 92,
    isDemo: true,
  },
  {
    id: 'user-kasir-2',
    name: 'Dewi Lestari',
    email: 'kasir.dewi@gmail.com',
    role: 'kasir',
    pin: '112233',
    phone: '0878-5566-7788',
    isActive: true,
    transactionsServed: 57,
    isDemo: true,
  },
];

const STORAGE_KEYS = {
  PRODUCTS: 'salsabilamart_products_v1',
  TRANSACTIONS: 'salsabilamart_transactions_v1',
  STORE_PROFILE: 'salsabilamart_store_profile_v1',
  CURRENT_USER: 'salsabilamart_current_user_v1',
  GOOGLE_SHEET_CONFIG: 'salsabilamart_gsheet_config_v1',
  USERS: 'salsabilamart_users_v1',
  DARK_MODE: 'salsabilamart_dark_mode_v1',
};

export const loadStoredProducts = (): Product[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!raw) {
      saveStoredProducts(INITIAL_PRODUCTS);
      return INITIAL_PRODUCTS;
    }
    return JSON.parse(raw);
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

export const clearStoredTransactions = () => {
  saveStoredTransactions([]);
};

export const loadStoredProfile = (): StoreProfile => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STORE_PROFILE);
    if (!raw) {
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
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) {
      saveStoredUsers(INITIAL_USERS);
      return INITIAL_USERS;
    }
    return JSON.parse(raw);
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
    version: '1.0',
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
 * Memungkinkan kasir dibuka di laptop/PC toko tanpa perlu hosting!
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
echo Tidak memerlukan hosting cloud, Vercel, Firebase, atau kuota internet!
echo.
echo Memeriksa lingkungan perangkat...
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [OK] Node.js terdeteksi di komputer Anda.
    echo Menjalankan server lokal Vite Preview pada port 3000...
    echo Browser akan otomatis terbuka ke: http://localhost:3000
    echo.
    echo Tekan Ctrl+C jika ingin mematikan kasir.
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

