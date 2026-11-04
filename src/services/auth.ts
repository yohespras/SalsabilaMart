import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
// CRITICAL: Initialize Firestore with the exact database ID provisioned for this project
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
// Strictly in-memory OAuth access token cache for Google Workspace APIs
let cachedAccessToken: string | null = null;
let cachedTokenExpiry = 0;

const getValidMemoryToken = (): string | null => {
  if (cachedAccessToken && cachedTokenExpiry > Date.now()) {
    return cachedAccessToken;
  }
  cachedAccessToken = null;
  cachedTokenExpiry = 0;
  return null;
};

// Error translation helper for Firebase Auth
export function formatFirebaseAuthError(error: any): string {
  if (!error) return 'Terjadi kesalahan autentikasi.';
  const code = error.code || '';
  if (code === 'auth/popup-blocked') {
    return 'Jendela popup Google diblokir oleh browser. Harap izinkan popup di pengaturan browser Anda.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Jendela masuk Google ditutup sebelum selesai. Silakan coba lagi.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'Domain ini belum terdaftar di Firebase Authorized Domains. Daftarkan domain di Firebase Console agar sinkronisasi lintas perangkat aktif.';
  }
  if (code === 'auth/cancelled-popup-request') {
    return 'Permintaan popup sebelumnya dibatalkan. Silakan klik sekali lagi.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Koneksi jaringan terputus. Menggunakan penyimpanan lokal sementara.';
  }
  return error.message || 'Gagal masuk dengan Google.';
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Firestore connection on startup
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) {
        onAuthSuccess(user, getValidMemoryToken());
      }
    } else if (!isSigningIn) {
      cachedAccessToken = null;
      cachedTokenExpiry = 0;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses Google dari Firebase');
    }
    cachedAccessToken = credential.accessToken;
    cachedTokenExpiry = Date.now() + 50 * 60 * 1000;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return getValidMemoryToken();
};

export const ensureAccessToken = async (interactive = false): Promise<string | null> => {
  const existing = await getAccessToken();
  if (existing) return existing;
  if (!interactive) return null;
  const res = await googleSignIn();
  return res?.accessToken || null;
};

export const clearCachedAccessToken = () => {
  cachedAccessToken = null;
  cachedTokenExpiry = 0;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  cachedTokenExpiry = token ? Date.now() + 50 * 60 * 1000 : 0;
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  cachedTokenExpiry = 0;
};
