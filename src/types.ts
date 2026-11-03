export type UserRole = 'admin' | 'kasir';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  pin?: string;
  password?: string;
  phone?: string;
  isActive: boolean;
  avatar?: string;
  transactionsServed?: number;
  isDemo?: boolean;
}

export interface Product {
  id: string;
  barcode: string;
  name: string;
  category: string;
  price: number; // Harga Jual
  costPrice: number; // Harga Modal (HPP)
  stock: number;
  minStock: number;
  unit: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
  discount: number; // nominal diskon per item
}

export type PaymentMethod = 'TUNAI' | 'QRIS';

export interface TransactionItem {
  productId: string;
  barcode: string;
  name: string;
  price: number;
  costPrice: number;
  quantity: number;
  subtotal: number;
}

export interface Transaction {
  id: string; // Misal: TRX-20261012-001
  date: string; // ISO string
  cashierName: string;
  cashierRole: UserRole;
  items: TransactionItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  change: number;
  qrisRef?: string;
  notes?: string;
  syncedToSheet?: boolean;
}

export interface StoreProfile {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  operatingHours: string;
  qrisNmid: string;
  receiptHeader: string;
  receiptFooter: string;
  paperSize: '58mm' | '80mm';
}

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  spreadsheetName: string;
  spreadsheetUrl: string;
  syncMode?: 'oauth' | 'webhook';
  webhookUrl?: string;
  lastSyncedAt?: string;
  autoSync: boolean;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  errorMessage?: string;
}

