import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Unsubscribe,
  updateDoc,
  where,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from './auth';
import {
  GoogleSheetsConfig,
  PaymentMethod,
  Product,
  StoreProfile,
  Transaction,
  TransactionItem,
  UserProfile,
  UserRole,
} from '../types';

export interface CloudStoreWorkspace {
  storeId: string;
  originalOwnerUid: string;
  allowedEmails: string[];
  isOwner: boolean;
}

const BOOTSTRAPPED_ADMIN_EMAIL = 'salsabilamart684@gmail.com';
const ID_REGEX = /^[a-zA-Z0-9_-]+$/;

export function canUseCloudSync(user: User | null | undefined): user is User {
  return Boolean(
    user &&
      user.uid &&
      user.emailVerified === true &&
      typeof user.email === 'string' &&
      user.email.length >= 3 &&
      user.email.length <= 128
  );
}

export function sanitizeDocId(raw: string, fallbackPrefix = 'item'): string {
  const cleaned = String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 128);
  if (cleaned.length >= 1 && ID_REGEX.test(cleaned)) {
    return cleaned;
  }
  return `${fallbackPrefix}-${Date.now()}`.slice(0, 128);
}

function truncateStr(val: unknown, maxLen: number, minLen = 0, fallback = ''): string {
  let str = typeof val === 'string' ? val.trim() : String(val ?? '').trim();
  if (str.length < minLen) {
    str = fallback;
  }
  return str.slice(0, maxLen);
}

function clampNum(val: unknown, min: number, max: number, fallback = 0): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export function buildAllowedEmails(
  currentUserEmail: string,
  extraEmails: (string | undefined | null)[] = []
): string[] {
  const result: string[] = [];
  const addEmail = (raw?: string | null) => {
    if (!raw || typeof raw !== 'string') return;
    const trimmed = raw.trim();
    if (trimmed.length >= 3 && trimmed.length <= 128 && trimmed.includes('@')) {
      if (!result.includes(trimmed) && result.length < 20) {
        result.push(trimmed);
      }
      const lower = trimmed.toLowerCase();
      if (!result.includes(lower) && result.length < 20) {
        result.push(lower);
      }
    }
  };

  // Pastikan email aktif request.auth.token.email selalu berada di daftar (dan posisi pertama)
  addEmail(currentUserEmail);
  addEmail(BOOTSTRAPPED_ADMIN_EMAIL);
  for (const e of extraEmails) {
    addEmail(e);
  }

  if (result.length === 0 && currentUserEmail.length >= 3) {
    result.push(currentUserEmail.slice(0, 128));
  }
  return result.slice(0, 20);
}

export function isWorkspaceOwner(workspace: CloudStoreWorkspace, user: User): boolean {
  return (
    workspace.originalOwnerUid === user.uid ||
    user.email === BOOTSTRAPPED_ADMIN_EMAIL
  );
}

function sanitizeTransactionItems(items: TransactionItem[]): TransactionItem[] {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 100).map((it, idx) => ({
    productId: truncateStr(it.productId, 128, 1, `p-${idx + 1}`),
    barcode: truncateStr(it.barcode, 64, 0, ''),
    name: truncateStr(it.name, 200, 1, 'Barang'),
    price: clampNum(it.price, 0, 1000000000, 0),
    costPrice: clampNum(it.costPrice, 0, 1000000000, 0),
    quantity: clampNum(it.quantity, 1, 1000000, 1),
    subtotal: clampNum(it.subtotal, 0, 10000000000, 0),
  }));
}

function docToProduct(data: Record<string, any>): Product {
  return {
    id: String(data.id),
    barcode: String(data.barcode || ''),
    name: String(data.name || ''),
    category: String(data.category || 'Umum'),
    price: Number(data.price) || 0,
    costPrice: Number(data.costPrice) || 0,
    stock: Number(data.stock) || 0,
    minStock: Number(data.minStock) || 0,
    unit: String(data.unit || 'pcs'),
    updatedAt: String(data.isoUpdatedAt || new Date().toISOString()),
  };
}

function docToTransaction(data: Record<string, any>): Transaction {
  return {
    id: String(data.id),
    date: String(data.txDate || new Date().toISOString()),
    cashierName: String(data.cashierName || 'Kasir'),
    cashierRole: data.cashierRole === 'admin' ? 'admin' : 'kasir',
    items: Array.isArray(data.items)
      ? data.items.map((it: any) => ({
          productId: String(it.productId || ''),
          barcode: String(it.barcode || ''),
          name: String(it.name || ''),
          price: Number(it.price) || 0,
          costPrice: Number(it.costPrice) || 0,
          quantity: Number(it.quantity) || 1,
          subtotal: Number(it.subtotal) || 0,
        }))
      : [],
    subtotal: Number(data.subtotal) || 0,
    discount: Number(data.discount) || 0,
    total: Number(data.total) || 0,
    paymentMethod: data.paymentMethod === 'QRIS' ? 'QRIS' : 'TUNAI',
    amountPaid: Number(data.amountPaid) || 0,
    change: Number(data.change) || 0,
    qrisRef: data.qrisRef ? String(data.qrisRef) : undefined,
    syncedToSheet: Boolean(data.syncedToSheet),
  };
}

function docToUserProfile(data: Record<string, any>): UserProfile {
  const pinVal = data.pinCode ? String(data.pinCode) : undefined;
  return {
    id: String(data.id),
    name: String(data.name || 'Pengguna'),
    email: String(data.email || ''),
    role: data.role === 'admin' ? 'admin' : 'kasir',
    pin: pinVal,
    password: pinVal,
    phone: data.phone ? String(data.phone) : '',
    isActive: data.isActive !== false,
    transactionsServed: Number(data.transactionsServed) || 0,
    isDemo: false,
  };
}

/**
 * Menemukan workspace toko yang sudah ada di Cloud Firestore atau menginisialisasi baru
 * jika akun Google pemilik belum pernah membuat dokumen toko.
 */
export async function ensureCloudStoreWorkspace(
  user: User,
  localProfile: StoreProfile,
  localSheetsConfig: GoogleSheetsConfig,
  localProducts: Product[],
  localTransactions: Transaction[],
  localUsers: UserProfile[]
): Promise<CloudStoreWorkspace | null> {
  if (!canUseCloudSync(user)) return null;

  const userEmail = user.email!;
  const settingsCol = collection(db, 'store_settings');

  try {
    const q = query(settingsCol, where('allowedEmails', 'array-contains', userEmail));
    const snap = await getDocs(q);

    if (!snap.empty) {
      // Utamakan store utama 'salsabila-mart' bila ada lebih dari satu
      const preferredDoc =
        snap.docs.find((d) => d.id === 'salsabila-mart') || snap.docs[0];
      const existingData = preferredDoc.data();
      const storeId = preferredDoc.id;
      const originalOwnerUid = String(existingData.originalOwnerUid);
      const ownerFlag =
        originalOwnerUid === user.uid || userEmail === BOOTSTRAPPED_ADMIN_EMAIL;

      const mergedAllowed = buildAllowedEmails(userEmail, [
        ...(Array.isArray(existingData.allowedEmails) ? existingData.allowedEmails : []),
        existingData.email,
        ...localUsers.map((u) => u.email),
      ]);

      const workspace: CloudStoreWorkspace = {
        storeId,
        originalOwnerUid,
        allowedEmails: mergedAllowed,
        isOwner: ownerFlag,
      };

      // Jika owner login dan ada email staf baru di perangkat lokal yang belum masuk allowedEmails
      const prevEmails: string[] = Array.isArray(existingData.allowedEmails)
        ? existingData.allowedEmails
        : [];
      const hasNewEmails = mergedAllowed.some((em) => !prevEmails.includes(em));
      if (ownerFlag && hasNewEmails) {
        await updateDoc(doc(db, 'store_settings', storeId), {
          allowedEmails: mergedAllowed,
          authorUid: user.uid,
          updatedAt: serverTimestamp(),
        });
      }

      // Unggah produk/transaksi lokal yang dibuat saat offline sebelum login Google (hanya jika belum ada di Cloud)
      await uploadMissingOfflineRecords(
        workspace,
        user,
        localProducts,
        localTransactions,
        ownerFlag ? localUsers : []
      );

      return workspace;
    }

    // Belum ada dokumen store_settings untuk akun ini -> inisialisasi baru
    const storeId =
      userEmail.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL
        ? 'salsabila-mart'
        : sanitizeDocId(`store-${user.uid.slice(0, 24)}`, 'store');

    const allowedEmails = buildAllowedEmails(userEmail, [
      localProfile.email,
      ...localUsers.map((u) => u.email),
    ]);

    const paperSize: '58mm' | '80mm' = localProfile.paperSize === '80mm' ? '80mm' : '58mm';
    const syncMode: 'oauth' | 'webhook' =
      localSheetsConfig.syncMode === 'webhook' ? 'webhook' : 'oauth';
    const sheetsStatus: 'disconnected' | 'connecting' | 'connected' | 'error' =
      localSheetsConfig.status === 'connected' ||
      localSheetsConfig.status === 'connecting' ||
      localSheetsConfig.status === 'error'
        ? localSheetsConfig.status
        : 'disconnected';

    await setDoc(doc(db, 'store_settings', storeId), {
      id: storeId,
      name: truncateStr(localProfile.name, 120, 1, 'Salsabila Mart'),
      tagline: truncateStr(localProfile.tagline, 200, 0, ''),
      address: truncateStr(localProfile.address, 300, 0, ''),
      phone: truncateStr(localProfile.phone, 40, 0, ''),
      email: truncateStr(localProfile.email || userEmail, 128, 0, ''),
      operatingHours: truncateStr(localProfile.operatingHours, 100, 0, ''),
      qrisNmid: truncateStr(localProfile.qrisNmid, 100, 0, ''),
      receiptHeader: truncateStr(localProfile.receiptHeader, 300, 0, ''),
      receiptFooter: truncateStr(localProfile.receiptFooter, 500, 0, ''),
      paperSize,
      spreadsheetId: truncateStr(localSheetsConfig.spreadsheetId, 128, 0, ''),
      spreadsheetName: truncateStr(localSheetsConfig.spreadsheetName, 200, 0, ''),
      spreadsheetUrl: truncateStr(localSheetsConfig.spreadsheetUrl, 500, 0, ''),
      syncMode,
      webhookUrl: truncateStr(localSheetsConfig.webhookUrl, 500, 0, ''),
      autoSync: localSheetsConfig.autoSync !== false,
      sheetsStatus,
      originalOwnerUid: user.uid,
      authorUid: user.uid,
      allowedEmails,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const workspace: CloudStoreWorkspace = {
      storeId,
      originalOwnerUid: user.uid,
      allowedEmails,
      isOwner: true,
    };

    // Setelah store_settings tercipta, unggah data riil yang sudah diinput di perangkat ini (jika ada)
    await uploadMissingOfflineRecords(
      workspace,
      user,
      localProducts,
      localTransactions,
      localUsers
    );

    return workspace;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'store_settings');
  }
}

async function uploadMissingOfflineRecords(
  workspace: CloudStoreWorkspace,
  user: User,
  localProducts: Product[],
  localTransactions: Transaction[],
  localUsers: UserProfile[]
): Promise<void> {
  if (!canUseCloudSync(user)) return;

  // 1. Sinkronkan akun pengguna staf (khusus owner)
  if (isWorkspaceOwner(workspace, user) && localUsers.length > 0) {
    for (const u of localUsers) {
      if (u.isDemo) continue;
      const cleanStaffId = sanitizeDocId(u.id, 'user');
      const ref = doc(db, 'staff_profiles', cleanStaffId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await upsertCloudStaffProfile(workspace, user, { ...u, id: cleanStaffId });
      }
    }
  }

  // 2. Sinkronkan produk lokal yang belum ada di Cloud
  if (localProducts.length > 0) {
    for (const p of localProducts) {
      const cleanProdId = sanitizeDocId(p.id, 'p');
      const ref = doc(db, 'products', cleanProdId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await upsertCloudProduct(workspace, user, { ...p, id: cleanProdId });
      }
    }
  }

  // 3. Sinkronkan transaksi lokal yang belum ada di Cloud
  if (localTransactions.length > 0) {
    for (const tx of localTransactions) {
      const cleanTxId = sanitizeDocId(tx.id, 'TRX');
      const ref = doc(db, 'transactions', cleanTxId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await createCloudTransaction(workspace, user, { ...tx, id: cleanTxId });
      }
    }
  }
}

export interface CloudStoreSubscriptionCallbacks {
  onStoreSettings: (
    profile: StoreProfile,
    sheetsConfigPatch: Partial<GoogleSheetsConfig>,
    allowedEmails: string[]
  ) => void;
  onProducts: (products: Product[]) => void;
  onTransactions: (transactions: Transaction[]) => void;
  onUsers: (users: UserProfile[]) => void;
}

/**
 * Berlangganan pembaruan real-time lintas perangkat (HP, Tablet, Laptop Kasir)
 */
export function subscribeToCloudStore(
  workspace: CloudStoreWorkspace,
  user: User,
  callbacks: CloudStoreSubscriptionCallbacks
): Unsubscribe {
  if (!canUseCloudSync(user)) {
    return () => {};
  }

  const userEmail = user.email!;
  const unsubscribers: Unsubscribe[] = [];

  // 1. Listener Pengaturan Toko & Google Sheets
  const settingsRef = doc(db, 'store_settings', workspace.storeId);
  unsubscribers.push(
    onSnapshot(
      settingsRef,
      (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        const profile: StoreProfile = {
          name: String(d.name || 'Salsabila Mart'),
          tagline: String(d.tagline || ''),
          address: String(d.address || ''),
          phone: String(d.phone || ''),
          email: String(d.email || ''),
          operatingHours: String(d.operatingHours || ''),
          qrisNmid: String(d.qrisNmid || ''),
          receiptHeader: String(d.receiptHeader || ''),
          receiptFooter: String(d.receiptFooter || ''),
          paperSize: d.paperSize === '80mm' ? '80mm' : '58mm',
        };
        const sheetsPatch: Partial<GoogleSheetsConfig> = {
          spreadsheetId: String(d.spreadsheetId || ''),
          spreadsheetName: String(d.spreadsheetName || ''),
          spreadsheetUrl: String(d.spreadsheetUrl || ''),
          syncMode: d.syncMode === 'webhook' ? 'webhook' : 'oauth',
          webhookUrl: String(d.webhookUrl || ''),
          autoSync: d.autoSync !== false,
          status:
            d.sheetsStatus === 'connected' ||
            d.sheetsStatus === 'connecting' ||
            d.sheetsStatus === 'error'
              ? d.sheetsStatus
              : 'disconnected',
        };
        const emails = Array.isArray(d.allowedEmails)
          ? d.allowedEmails.map(String)
          : [userEmail];
        callbacks.onStoreSettings(profile, sheetsPatch, emails);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `store_settings/${workspace.storeId}`);
      }
    )
  );

  // 2. Listener Produk & Stok Real-Time (Single-field array-contains, bebas composite index)
  const productsQuery = query(
    collection(db, 'products'),
    where('allowedEmails', 'array-contains', userEmail)
  );
  unsubscribers.push(
    onSnapshot(
      productsQuery,
      (snap) => {
        const items: Product[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.storeId === workspace.storeId) {
            items.push(docToProduct(data));
          }
        });
        items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        callbacks.onProducts(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'products');
      }
    )
  );

  // 3. Listener Transaksi Penjualan Real-Time
  const transactionsQuery = query(
    collection(db, 'transactions'),
    where('allowedEmails', 'array-contains', userEmail)
  );
  unsubscribers.push(
    onSnapshot(
      transactionsQuery,
      (snap) => {
        const txs: Transaction[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.storeId === workspace.storeId) {
            txs.push(docToTransaction(data));
          }
        });
        txs.sort((a, b) => b.date.localeCompare(a.date));
        callbacks.onTransactions(txs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'transactions');
      }
    )
  );

  // 4. Listener Profil Staf (Owner melihat seluruh staf toko; Kasir hanya melihat profilnya sendiri demi isolasi PII)
  const staffQuery =
    workspace.originalOwnerUid === user.uid
      ? query(collection(db, 'staff_profiles'), where('originalOwnerUid', '==', user.uid))
      : query(collection(db, 'staff_profiles'), where('email', '==', userEmail));

  unsubscribers.push(
    onSnapshot(
      staffQuery,
      (snap) => {
        const staffList: UserProfile[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.storeId === workspace.storeId) {
            staffList.push(docToUserProfile(data));
          }
        });
        if (staffList.length > 0) {
          callbacks.onUsers(staffList);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'staff_profiles');
      }
    )
  );

  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}

/**
 * Simpan perubahan Profil Toko & Konfigurasi Google Sheets ke Cloud (Khusus Owner/Admin)
 */
export async function upsertCloudStoreSettings(
  workspace: CloudStoreWorkspace,
  user: User,
  profile: StoreProfile,
  sheetsConfig: GoogleSheetsConfig,
  staffUsers: UserProfile[]
): Promise<string[]> {
  if (!canUseCloudSync(user) || !isWorkspaceOwner(workspace, user)) {
    return workspace.allowedEmails;
  }

  const nextAllowedEmails = buildAllowedEmails(user.email!, [
    ...workspace.allowedEmails,
    profile.email,
    ...staffUsers.map((u) => u.email),
  ]);

  const paperSize: '58mm' | '80mm' = profile.paperSize === '80mm' ? '80mm' : '58mm';
  const syncMode: 'oauth' | 'webhook' =
    sheetsConfig.syncMode === 'webhook' ? 'webhook' : 'oauth';
  const sheetsStatus: 'disconnected' | 'connecting' | 'connected' | 'error' =
    sheetsConfig.status === 'connected' ||
    sheetsConfig.status === 'connecting' ||
    sheetsConfig.status === 'error'
      ? sheetsConfig.status
      : 'disconnected';

  const path = `store_settings/${workspace.storeId}`;
  try {
    await updateDoc(doc(db, 'store_settings', workspace.storeId), {
      name: truncateStr(profile.name, 120, 1, 'Salsabila Mart'),
      tagline: truncateStr(profile.tagline, 200, 0, ''),
      address: truncateStr(profile.address, 300, 0, ''),
      phone: truncateStr(profile.phone, 40, 0, ''),
      email: truncateStr(profile.email, 128, 0, ''),
      operatingHours: truncateStr(profile.operatingHours, 100, 0, ''),
      qrisNmid: truncateStr(profile.qrisNmid, 100, 0, ''),
      receiptHeader: truncateStr(profile.receiptHeader, 300, 0, ''),
      receiptFooter: truncateStr(profile.receiptFooter, 500, 0, ''),
      paperSize,
      spreadsheetId: truncateStr(sheetsConfig.spreadsheetId, 128, 0, ''),
      spreadsheetName: truncateStr(sheetsConfig.spreadsheetName, 200, 0, ''),
      spreadsheetUrl: truncateStr(sheetsConfig.spreadsheetUrl, 500, 0, ''),
      syncMode,
      webhookUrl: truncateStr(sheetsConfig.webhookUrl, 500, 0, ''),
      autoSync: sheetsConfig.autoSync !== false,
      sheetsStatus,
      authorUid: user.uid,
      allowedEmails: nextAllowedEmails,
      updatedAt: serverTimestamp(),
    });
    return nextAllowedEmails;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Tambah atau perbarui produk lengkap di Cloud Firestore
 */
export async function upsertCloudProduct(
  workspace: CloudStoreWorkspace,
  user: User,
  product: Product
): Promise<void> {
  if (!canUseCloudSync(user)) return;

  const cleanId = sanitizeDocId(product.id, 'p');
  const ref = doc(db, 'products', cleanId);
  const path = `products/${cleanId}`;
  const allowedEmails = buildAllowedEmails(user.email!, workspace.allowedEmails);

  const sanitizedFields = {
    barcode: truncateStr(product.barcode, 64, 1, `SKU-${cleanId.slice(0, 20)}`),
    name: truncateStr(product.name, 200, 1, 'Produk Toko'),
    category: truncateStr(product.category, 100, 1, 'Umum'),
    price: clampNum(product.price, 0, 1000000000, 0),
    costPrice: clampNum(product.costPrice, 0, 1000000000, 0),
    stock: clampNum(product.stock, 0, 1000000, 0),
    minStock: clampNum(product.minStock, 0, 1000000, 0),
    unit: truncateStr(product.unit, 32, 1, 'pcs'),
    isoUpdatedAt: truncateStr(
      product.updatedAt || new Date().toISOString(),
      64,
      1,
      new Date().toISOString()
    ),
  };

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        id: cleanId,
        storeId: workspace.storeId,
        ...sanitizedFields,
        originalOwnerUid: workspace.originalOwnerUid,
        authorUid: user.uid,
        allowedEmails,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else if (isWorkspaceOwner(workspace, user)) {
      await updateDoc(ref, {
        ...sanitizedFields,
        authorUid: user.uid,
        allowedEmails,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Kasir hanya diizinkan memperbarui stok
      await updateDoc(ref, {
        stock: sanitizedFields.stock,
        isoUpdatedAt: sanitizedFields.isoUpdatedAt,
        authorUid: user.uid,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Pengurangan stok saat transaksi kasir / restock cepat (Diizinkan untuk Admin maupun Kasir)
 */
export async function updateCloudProductStockOnly(
  workspace: CloudStoreWorkspace,
  user: User,
  productId: string,
  newStock: number,
  isoUpdatedAt?: string
): Promise<void> {
  if (!canUseCloudSync(user)) return;

  const cleanId = sanitizeDocId(productId, 'p');
  const path = `products/${cleanId}`;
  try {
    await updateDoc(doc(db, 'products', cleanId), {
      stock: clampNum(newStock, 0, 1000000, 0),
      isoUpdatedAt: truncateStr(
        isoUpdatedAt || new Date().toISOString(),
        64,
        1,
        new Date().toISOString()
      ),
      authorUid: user.uid,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCloudProduct(
  workspace: CloudStoreWorkspace,
  user: User,
  productId: string
): Promise<void> {
  if (!canUseCloudSync(user) || !isWorkspaceOwner(workspace, user)) return;

  const cleanId = sanitizeDocId(productId, 'p');
  const path = `products/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'products', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Catat struk transaksi baru ke Cloud Firestore agar tampil seketika di semua perangkat
 */
export async function createCloudTransaction(
  workspace: CloudStoreWorkspace,
  user: User,
  tx: Transaction
): Promise<void> {
  if (!canUseCloudSync(user)) return;

  const cleanId = sanitizeDocId(tx.id, 'TRX');
  const ref = doc(db, 'transactions', cleanId);
  const path = `transactions/${cleanId}`;
  const allowedEmails = buildAllowedEmails(user.email!, workspace.allowedEmails);
  const role: UserRole = tx.cashierRole === 'admin' ? 'admin' : 'kasir';
  const method: PaymentMethod = tx.paymentMethod === 'QRIS' ? 'QRIS' : 'TUNAI';

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        id: cleanId,
        storeId: workspace.storeId,
        txDate: truncateStr(tx.date || new Date().toISOString(), 64, 1, new Date().toISOString()),
        cashierName: truncateStr(tx.cashierName, 120, 1, 'Kasir'),
        cashierRole: role,
        items: sanitizeTransactionItems(tx.items),
        subtotal: clampNum(tx.subtotal, 0, 10000000000, 0),
        discount: clampNum(tx.discount, 0, 10000000000, 0),
        total: clampNum(tx.total, 0, 10000000000, 0),
        paymentMethod: method,
        amountPaid: clampNum(tx.amountPaid, 0, 10000000000, 0),
        change: clampNum(tx.change, 0, 10000000000, 0),
        qrisRef: truncateStr(tx.qrisRef || '', 120, 0, ''),
        syncedToSheet: Boolean(tx.syncedToSheet),
        originalOwnerUid: workspace.originalOwnerUid,
        authorUid: user.uid,
        allowedEmails,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        syncedToSheet: Boolean(tx.syncedToSheet),
        authorUid: user.uid,
        allowedEmails,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function markCloudTransactionsSyncedToSheet(
  workspace: CloudStoreWorkspace,
  user: User,
  txIds: string[]
): Promise<void> {
  if (!canUseCloudSync(user) || txIds.length === 0) return;

  const allowedEmails = buildAllowedEmails(user.email!, workspace.allowedEmails);
  for (const rawId of txIds) {
    const cleanId = sanitizeDocId(rawId, 'TRX');
    const path = `transactions/${cleanId}`;
    try {
      await updateDoc(doc(db, 'transactions', cleanId), {
        syncedToSheet: true,
        authorUid: user.uid,
        allowedEmails,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }
}

/**
 * Sinkronkan daftar produk impor (misal dari Google Sheets) ke Cloud Firestore
 */
export async function syncImportedProductsToCloud(
  workspace: CloudStoreWorkspace,
  user: User,
  products: Product[]
): Promise<void> {
  if (!canUseCloudSync(user)) return;
  for (const p of products) {
    await upsertCloudProduct(workspace, user, p);
  }
}

/**
 * Sinkronkan daftar transaksi impor (misal dari Google Sheets) ke Cloud Firestore
 */
export async function syncImportedTransactionsToCloud(
  workspace: CloudStoreWorkspace,
  user: User,
  importedTransactions: Transaction[]
): Promise<void> {
  if (!canUseCloudSync(user)) return;

  for (const tx of importedTransactions) {
    await createCloudTransaction(workspace, user, tx);
  }

  // Jika owner menarik kondisi 0 transaksi dari Google Sheets, bersihkan transaksi lama di Cloud agar semua perangkat ikut sinkron
  if (isWorkspaceOwner(workspace, user)) {
    const keepIds = new Set(importedTransactions.map((t) => sanitizeDocId(t.id, 'TRX')));
    try {
      const q = query(
        collection(db, 'transactions'),
        where('allowedEmails', 'array-contains', user.email!)
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        if (d.data().storeId === workspace.storeId && !keepIds.has(d.id)) {
          await deleteDoc(doc(db, 'transactions', d.id));
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'transactions');
    }
  }
}

/**
 * Manajemen Staf / Kasir di Cloud Firestore + propagasi allowedEmails agar staf bisa login di perangkat lain
 */
export async function upsertCloudStaffProfile(
  workspace: CloudStoreWorkspace,
  user: User,
  staff: UserProfile
): Promise<void> {
  if (!canUseCloudSync(user)) return;

  const cleanId = sanitizeDocId(staff.id, 'user');
  const ref = doc(db, 'staff_profiles', cleanId);
  const path = `staff_profiles/${cleanId}`;
  const role: UserRole = staff.role === 'admin' ? 'admin' : 'kasir';

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      if (!isWorkspaceOwner(workspace, user)) return;
      await setDoc(ref, {
        id: cleanId,
        storeId: workspace.storeId,
        name: truncateStr(staff.name, 120, 1, 'Staf Toko'),
        email: truncateStr(staff.email, 128, 1, 'staf@toko.id'),
        role,
        pinCode: truncateStr(staff.pin || staff.password || '', 64, 0, ''),
        phone: truncateStr(staff.phone || '', 40, 0, ''),
        isActive: staff.isActive !== false,
        transactionsServed: clampNum(staff.transactionsServed, 0, 10000000, 0),
        originalOwnerUid: workspace.originalOwnerUid,
        authorUid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else if (isWorkspaceOwner(workspace, user)) {
      await updateDoc(ref, {
        name: truncateStr(staff.name, 120, 1, 'Staf Toko'),
        email: truncateStr(staff.email, 128, 1, 'staf@toko.id'),
        role,
        pinCode: truncateStr(staff.pin || staff.password || '', 64, 0, ''),
        phone: truncateStr(staff.phone || '', 40, 0, ''),
        isActive: staff.isActive !== false,
        transactionsServed: clampNum(staff.transactionsServed, 0, 10000000, 0),
        authorUid: user.uid,
        updatedAt: serverTimestamp(),
      });
    } else if (snap.data().email === user.email) {
      // Staf memperbarui PIN atau jumlah transaksi sendiri
      await updateDoc(ref, {
        pinCode: truncateStr(staff.pin || staff.password || '', 64, 0, ''),
        transactionsServed: clampNum(staff.transactionsServed, 0, 10000000, 0),
        authorUid: user.uid,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCloudStaffProfile(
  workspace: CloudStoreWorkspace,
  user: User,
  staffId: string
): Promise<void> {
  if (!canUseCloudSync(user) || !isWorkspaceOwner(workspace, user)) return;

  const cleanId = sanitizeDocId(staffId, 'user');
  const path = `staff_profiles/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'staff_profiles', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Ketika daftar staf bertambah/berubah oleh Owner, perbarui allowedEmails pada produk & transaksi yang sudah ada
 * supaya staf baru yang login Google dari HP lain langsung dapat melihat inventaris & riwayat transaksi toko.
 */
export async function propagateAllowedEmailsToStoreDocs(
  workspace: CloudStoreWorkspace,
  user: User,
  nextAllowedEmails: string[]
): Promise<void> {
  if (!canUseCloudSync(user) || !isWorkspaceOwner(workspace, user)) return;

  const safeEmails = buildAllowedEmails(user.email!, nextAllowedEmails);
  try {
    const prodSnap = await getDocs(
      query(collection(db, 'products'), where('allowedEmails', 'array-contains', user.email!))
    );
    for (const d of prodSnap.docs) {
      const data = d.data();
      if (data.storeId === workspace.storeId) {
        const cur: string[] = Array.isArray(data.allowedEmails) ? data.allowedEmails : [];
        if (
          cur.length !== safeEmails.length ||
          safeEmails.some((e) => !cur.includes(e))
        ) {
          await updateDoc(doc(db, 'products', d.id), {
            allowedEmails: safeEmails,
            authorUid: user.uid,
            updatedAt: serverTimestamp(),
          });
        }
      }
    }

    const txSnap = await getDocs(
      query(collection(db, 'transactions'), where('allowedEmails', 'array-contains', user.email!))
    );
    for (const d of txSnap.docs) {
      const data = d.data();
      if (data.storeId === workspace.storeId) {
        const cur: string[] = Array.isArray(data.allowedEmails) ? data.allowedEmails : [];
        if (
          cur.length !== safeEmails.length ||
          safeEmails.some((e) => !cur.includes(e))
        ) {
          await updateDoc(doc(db, 'transactions', d.id), {
            allowedEmails: safeEmails,
            authorUid: user.uid,
            updatedAt: serverTimestamp(),
          });
        }
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'products');
  }
}
