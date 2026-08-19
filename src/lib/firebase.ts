import { initializeApp } from 'firebase/app'
import {
  getAuth, onAuthStateChanged, signInAnonymously, signOut,
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  type Auth, type User,
} from 'firebase/auth'
import { doc, getDoc, getFirestore, setDoc, type Firestore } from 'firebase/firestore'
import type { BudgetState } from '@/types'

const firebaseConfig = {
  apiKey: 'AIzaSyDxmZAlemwKZiBxo4dgR01zpSjSwwYnHpc',
  authDomain: 'littledragonbudget.firebaseapp.com',
  projectId: 'littledragonbudget',
  storageBucket: 'littledragonbudget.firebasestorage.app',
  messagingSenderId: '309545288992',
  appId: '1:309545288992:web:aafdf325aa12f051548345',
}

export type SyncStatus = 'connecting' | 'synced' | 'offline' | 'local-only'

export interface AccountInfo {
  uid: string
  email: string | null
  isGoogle: boolean
  householdId: string | null
}

let auth: Auth | null = null
let db: Firestore | null = null

try {
  const app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
} catch {
  // Firebase unavailable (blocked network, bad config) — app falls back to local-only
}

/** Where the budget state lives: the household doc if shared, else the user's own. */
const docFor = (uid: string, householdId?: string | null) =>
  householdId
    ? doc(db!, 'households', householdId, 'budget', 'state')
    : doc(db!, 'users', uid, 'budget', 'state')

const profileFor = (uid: string) => doc(db!, 'users', uid, 'profile', 'account')

/** Read the signed-in user's profile (household membership). */
async function getHouseholdId(uid: string): Promise<string | null> {
  if (!db) return null
  try {
    const snap = await getDoc(profileFor(uid))
    return snap.exists() ? ((snap.data() as { householdId?: string }).householdId ?? null) : null
  } catch {
    return null
  }
}

/** Ensure a signed-in session exists (anonymous if brand new) and load the remote state. */
export async function loadRemote(): Promise<{ uid: string; householdId: string | null; state: BudgetState | null }> {
  if (!auth || !db) throw new Error('firebase-unavailable')
  // Complete a Google redirect sign-in if we just came back from one
  try { await getRedirectResult(auth) } catch { /* no redirect pending */ }
  if (!auth.currentUser) await signInAnonymously(auth)
  const uid = auth.currentUser!.uid
  const householdId = await getHouseholdId(uid)
  const snap = await getDoc(docFor(uid, householdId))
  return { uid, householdId, state: snap.exists() ? (snap.data() as BudgetState) : null }
}

/** Observe auth changes (Google sign-in/out). */
export function onAuthChange(cb: (user: User | null) => void) {
  if (!auth) return () => {}
  return onAuthStateChanged(auth, cb)
}

export function currentAccount(): AccountInfo | null {
  if (!auth?.currentUser) return null
  const u = auth.currentUser
  return {
    uid: u.uid,
    email: u.email,
    isGoogle: u.providerData.some((p) => p.providerId === 'google.com'),
    householdId: null,
  }
}

/** Google sign-in — redirect on mobile/standalone (popups fail there), popup on desktop. */
export async function signInWithGoogle(): Promise<User> {
  if (!auth) throw new Error('firebase-unavailable')
  const provider = new GoogleAuthProvider()
  const preferRedirect =
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  if (preferRedirect) {
    await signInWithRedirect(auth, provider)
    throw new Error('redirecting') // page navigates away; unreachable
  }
  try {
    const cred = await signInWithPopup(auth, provider)
    return cred.user
  } catch (e) {
    const code = (e as { code?: string }).code ?? ''
    if (code === 'auth/popup-blocked' || code === 'auth/popup-failed' || code === 'auth/internal-error') {
      await signInWithRedirect(auth, provider)
      throw new Error('redirecting')
    }
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      throw new Error('cancelled') // user closed it — not a real failure
    }
    throw e
  }
}

export async function signOutAccount() {
  if (!auth) return
  await signOut(auth)
  await signInAnonymously(auth)
}

/** Create a household around the signed-in user's budget; returns an invite code. */
export async function createHousehold(): Promise<string> {
  if (!auth?.currentUser || !db) throw new Error('firebase-unavailable')
  const uid = auth.currentUser.uid
  const householdId = uid // owner uid doubles as household id — one household per owner
  const code = Math.random().toString(36).slice(2, 8).toUpperCase()
  await setDoc(profileFor(uid), { householdId, email: auth.currentUser.email ?? null }, { merge: true })
  await setDoc(doc(db, 'invites', code), { householdId, createdBy: uid, createdAt: Date.now() })
  return code
}

/** Join a household via invite code. Both members then share the same budget doc. */
export async function joinHousehold(code: string): Promise<void> {
  if (!auth?.currentUser || !db) throw new Error('firebase-unavailable')
  const snap = await getDoc(doc(db, 'invites', code.trim().toUpperCase()))
  if (!snap.exists()) throw new Error('bad-code')
  const { householdId } = snap.data() as { householdId: string }
  await setDoc(profileFor(auth.currentUser.uid), { householdId, email: auth.currentUser.email ?? null }, { merge: true })
}

/** Leave the household — back to a personal budget. */
export async function leaveHousehold(): Promise<void> {
  if (!auth?.currentUser || !db) throw new Error('firebase-unavailable')
  await setDoc(profileFor(auth.currentUser.uid), { householdId: null, email: auth.currentUser.email ?? null }, { merge: true })
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

/** Debounced save of the whole budget state to Firestore. */
export function saveRemote(uid: string, householdId: string | null, state: BudgetState, onError: () => void) {
  if (!db) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    try {
      await setDoc(docFor(uid, householdId), state)
    } catch {
      onError()
    }
  }, 600)
}

/** One-shot write — used to import this device's budget into an account/household. */
export async function pushStateNow(uid: string, householdId: string | null, state: BudgetState): Promise<void> {
  if (!db) throw new Error('firebase-unavailable')
  await setDoc(docFor(uid, householdId), state)
}

/** One-shot read — used to check whether an account/household already has data. */
export async function pullStateOnce(uid: string, householdId: string | null): Promise<BudgetState | null> {
  if (!db) return null
  const snap = await getDoc(docFor(uid, householdId))
  return snap.exists() ? (snap.data() as BudgetState) : null
}
