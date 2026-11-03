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
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

const SESSION_TOKEN_KEY = 'salsabilamart_google_oauth_token_v1';
const SESSION_EXPIRY_KEY = 'salsabilamart_google_oauth_expiry_v1';

const loadSessionToken = (): string | null => {
  try {
    const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
    const expiry = Number(sessionStorage.getItem(SESSION_EXPIRY_KEY) || '0');
    if (token && expiry > Date.now()) {
      return token;
    }
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(SESSION_EXPIRY_KEY);
    return null;
  } catch {
    return null;
  }
};

const saveSessionToken = (token: string | null) => {
  try {
    if (token) {
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
      // Google OAuth access tokens last ~3600s; cache for 50 minutes
      sessionStorage.setItem(SESSION_EXPIRY_KEY, String(Date.now() + 50 * 60 * 1000));
    } else {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      sessionStorage.removeItem(SESSION_EXPIRY_KEY);
    }
  } catch {
    // ignore storage errors
  }
};

let isSigningIn = false;
let cachedAccessToken: string | null = loadSessionToken();

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
    return `Domain ini belum terdaftar di Firebase Authorized Domains. Anda tetap dapat masuk menggunakan PIN / Akun Kasir secara offline atau memakai mode Webhook.`;
  }
  if (code === 'auth/cancelled-popup-request') {
    return 'Permintaan popup sebelumnya dibatalkan. Silakan klik sekali lagi.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Koneksi jaringan terputus. Menggunakan mode offline.';
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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Notification:', JSON.stringify(errInfo));
  return errInfo;
}

// Test Firestore connection on startup
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client offline, local cache is active.');
    }
  }
}

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (!cachedAccessToken) {
        cachedAccessToken = loadSessionToken();
      }
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      saveSessionToken(null);
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
    saveSessionToken(cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken) {
    cachedAccessToken = loadSessionToken();
  }
  return cachedAccessToken;
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
  saveSessionToken(null);
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  saveSessionToken(token);
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
  saveSessionToken(null);
};
