import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { JournalEntry, JournalMessage } from './types';

// Initialize Firebase App singleton
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Firebase Firestore using configured databaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

/**
 * Strips undefined and invalid properties from objects to prevent Firestore write crashes
 */
export function sanitizeFirestorePayload<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'object' && item !== null ? sanitizeFirestorePayload(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeFirestorePayload(value);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

/**
 * Sign in using Google Provider (Popup)
 */
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/**
 * Sign out current user
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Save or update a Journal Entry for a specific user.
 * Isolated strictly to /users/{userId}/entries/{entryId}
 */
export async function saveJournalEntry(
  userId: string,
  entry: Partial<JournalEntry> & { id: string; messages: JournalMessage[] }
): Promise<void> {
  if (!userId) throw new Error('User ID is required to save journal entries.');
  if (!entry.id) throw new Error('Entry ID is required.');

  const now = new Date().toISOString();
  const entryRef = doc(db, 'users', userId, 'entries', entry.id);

  const payload = sanitizeFirestorePayload({
    id: entry.id,
    userId,
    title: entry.title || 'Untitled Reflection',
    summary: entry.summary || '',
    tags: entry.tags || ['Reflection'],
    mode: entry.mode || 'reflect',
    messages: entry.messages || [],
    createdAt: entry.createdAt || now,
    updatedAt: now,
    serverUpdatedAt: serverTimestamp(),
  });

  await setDoc(entryRef, payload, { merge: true });
}

/**
 * Fetch all past journal entries for the current user
 */
export async function fetchUserJournalEntries(userId: string): Promise<JournalEntry[]> {
  if (!userId) return [];
  const entriesRef = collection(db, 'users', userId, 'entries');
  const q = query(entriesRef, orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(q);

  const entries: JournalEntry[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as JournalEntry;
    entries.push(data);
  });
  return entries;
}

/**
 * Delete a journal entry
 */
export async function deleteJournalEntry(userId: string, entryId: string): Promise<void> {
  if (!userId || !entryId) return;
  const entryRef = doc(db, 'users', userId, 'entries', entryId);
  await deleteDoc(entryRef);
}
