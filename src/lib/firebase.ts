import { initializeApp } from 'firebase/app'
import {
  getAuth, onAuthStateChanged, signInAnonymously, signOut,
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  browserPopupRedirectResolver, browserLocalPersistence,
  type Auth, type User,
} from 'firebase/auth'
import { deleteDoc, doc, getDoc, getFirestore, setDoc, type Firestore } from 'firebase/firestore'
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
let lastAuthError: string | null = null

const noteError = (context: string, e: unknown) => {
  const c = e as { code?: string; message?: string }
  lastAuthError = `${context}: ${c.code ?? c.message ?? String(e)}`
  try { sessionStorage.setItem('ldb-auth-debug', lastAuthError) } catch { /* private mode */ }
}

/** Last auth/firestore error seen, for diagnosing sign-in issues in the UI. */
export function getLastAuthError(): string | null {
  if (lastAuthError) return lastAuthError
  try { return sessionStorage.getItem('ldb-auth-debug') } catch { return null }
}

export function clearAuthError() {
  lastAuthError = null
  try { sessionStorage.removeItem('ldb-auth-debug') } catch { /* ignore */ }
}

/** Timestamped auth event log so we can see exactly what happened during sign-in. */
export function logAuth(msg: string) {
  try {
    const log: string[] = JSON.parse(sessionStorage.getItem('ldb-auth-log') ?? '[]')
    log.push(`${new Date().toLocaleTimeString()} ${msg}`)
    sessionStorage.setItem('ldb-auth-log', JSON.stringify(log.slice(-12)))
  } catch { /* private mode */ }
}

export function getAuthLog(): string[] {
  try { return JSON.parse(sessionStorage.getItem('ldb-auth-log') ?? '[]') } catch { return [] }
}

try {
  const app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
  // The SDK stores the pending redirect sign-in in sessionStorage — which does NOT
  // survive the round trip out to Google and back in an installed PWA (Android
  // destroys/recreates the window). Switch the live resolver instance to
  // localStorage so the result can always be picked up on return.
  void browserPopupRedirectResolver // (class reference kept for clarity)
  const resolverHolder = auth as unknown as { _popupRedirectResolver?: { _redirectPersistence?: unknown } }
  if (resolverHolder._popupRedirectResolver) {
    resolverHolder._popupRedirectResolver._redirectPersistence = browserLocalPersistence
  }
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
  } catch (e) {
    noteError('read-profile (firestore rules?)', e)
    return null
  }
}

/** Ensure a signed-in session exists (anonymous if brand new) and load the remote state. */
export async function loadRemote(): Promise<{ uid: string; householdId: string | null; state: BudgetState | null }> {
  if (!auth || !db) throw new Error('firebase-unavailable')
  const standalone =
    (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  const hasAuthParams = /[?&](state|code|authType)=/.test(location.search)
  logAuth(`page load · ${standalone ? 'installed app' : 'browser'} · ${hasAuthParams ? 'URL has sign-in params' : 'clean URL'}`)
  // Complete a Google redirect sign-in if we just came back from one
  try {
    const res = await getRedirectResult(auth)
    if (res?.user) {
      clearAuthError()
      try { localStorage.removeItem('ldb-signin-attempt') } catch { /* ignore */ }
      logAuth(`redirect OK → ${res.user.email ?? res.user.uid}`)
    } else {
      logAuth('no redirect result pending')
      // Did a sign-in attempt vanish into another window (installed app vs browser)?
      try {
        const attempted = Number(localStorage.getItem('ldb-signin-attempt') ?? 0)
        if (attempted && Date.now() - attempted < 15 * 60 * 1000) {
          if (hasAuthParams) {
            noteError('redirect-result', new Error('auth/missing-redirect-event — the sign-in response arrived but the app lost track of the attempt (browser/app storage split)'))
            logAuth('FAILED: sign-in came back but the app lost the attempt (installed-app vs browser split)')
          } else {
            noteError('redirect-result', new Error('auth/handoff-blocked — Google completed the sign-in, but your browser blocked the handoff back to the app (third-party cookies / tracking protection)'))
            logAuth('FAILED: Google finished but the handoff was blocked — enable third-party cookies for this site')
          }
        }
      } catch { /* ignore */ }
    }
  } catch (e) {
    noteError('redirect-result', e) // surfaced in the account sheet
    logAuth(`redirect FAILED → ${(e as { code?: string }).code ?? e}`)
  }
  if (!auth.currentUser) {
    try {
      const cred = await signInAnonymously(auth)
      logAuth(`anonymous session → ${cred.user.uid.slice(0, 6)}…`)
    } catch (e) {
      noteError('anon-sign-in', e)
      logAuth(`anonymous FAILED → ${(e as { code?: string }).code ?? e}`)
      throw e
    }
  }
  const uid = auth.currentUser!.uid
  const householdId = await getHouseholdId(uid)
  let snap
  try {
    snap = await getDoc(docFor(uid, householdId))
    logAuth(`budget load OK (${snap.exists() ? 'found saved budget' : 'nothing saved yet'})`)
  } catch (e) {
    noteError('load-budget (firestore rules?)', e)
    logAuth(`budget load FAILED → ${(e as { code?: string }).code ?? e}`)
    throw e
  }
  return { uid, householdId, state: snap.exists() ? (snap.data() as BudgetState) : null }
}

/** Observe auth changes (Google sign-in/out). */
export function onAuthChange(cb: (user: User | null) => void) {
  if (!auth) return () => {}
  return onAuthStateChanged(auth, (user) => {
    // Remember Google sessions so we can tell when one vanishes.
    try {
      const wasGoogle = localStorage.getItem('ldb-google-email')
      const isGoogle = user?.providerData.some((p) => p.providerId === 'google.com')
      if (user && isGoogle && user.email) {
        localStorage.setItem('ldb-google-email', user.email)
      } else if (wasGoogle && (!user || user.isAnonymous)) {
        logAuth(`Google session lost (${wasGoogle}) — refresh token revoked or app storage cleared`)
        noteError('session', new Error(`auth/session-lost — the saved Google sign-in disappeared. Usually: the sign-in was revoked from a Google security prompt, or Android cleared the app's storage. Signing in again fixes it.`))
        localStorage.removeItem('ldb-google-email')
      }
    } catch { /* ignore */ }
    cb(user)
  })
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
const isIOSDevice = () =>
  /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

export async function signInWithGoogle(): Promise<User> {
  if (!auth) throw new Error('firebase-unavailable')
  const provider = new GoogleAuthProvider()
  // iOS breaks the redirect flow: the sign-in leaves the app for Safari, and
  // Apple's tracking prevention blocks the cross-site helper that hands the
  // credential back to the app — the account is created but the session never
  // sticks. The popup flow returns the credential via postMessage instead,
  // which needs no shared storage, so prefer popup on iOS.
  if (isIOSDevice()) {
    try {
      logAuth('opening Google popup (iOS)…')
      const cred = await Promise.race([
        signInWithPopup(auth, provider),
        new Promise<never>((_, rej) => setTimeout(() => rej(Object.assign(new Error('popup-timeout'), { code: 'auth/popup-blocked' })), 20000)),
      ])
      logAuth(`popup OK → ${cred.user.email ?? cred.user.uid}`)
      return cred.user
    } catch (e) {
      const code = (e as { code?: string }).code ?? ''
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        throw new Error('cancelled')
      }
      // popup unavailable (installed-app web view) — fall back to redirect
      logAuth(`popup unavailable (${code || 'timeout'}) — trying redirect…`)
      try { localStorage.setItem('ldb-signin-attempt', String(Date.now())) } catch { /* ignore */ }
      await signInWithRedirect(auth, provider)
      throw new Error('redirecting')
    }
  }
  const preferRedirect =
    /Android/i.test(navigator.userAgent) ||
    (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  if (preferRedirect) {
    try { localStorage.setItem('ldb-signin-attempt', String(Date.now())) } catch { /* ignore */ }
    logAuth('starting Google redirect…')
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
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // matches the expiry window the rules allow

/** Create (or re-key) your household and mint a fresh 7-day invite code. */
export async function createHousehold(): Promise<string> {
  if (!auth?.currentUser || !db) throw new Error('firebase-unavailable')
  const uid = auth.currentUser.uid
  const email = auth.currentUser.email ?? null
  const householdId = uid // owner uid doubles as household id — one household per owner
  const code = Math.random().toString(36).slice(2, 8).toUpperCase()
  const expiresAt = Date.now() + INVITE_TTL_MS
  // Rules contract: household doc needs owner == hid; owner needs a members doc;
  // invites need an expiresAt within 7 days.
  await setDoc(doc(db, 'households', householdId), { owner: householdId, createdAt: Date.now() }, { merge: true })
  await setDoc(doc(db, 'households', householdId, 'members', uid), { joinedAt: Date.now(), email }, { merge: true })
    .catch((e) => {
      // Rules freeze member docs after creation — already being a member is fine here.
      const code = (e as { code?: string }).code ?? ''
      if (code !== 'permission-denied') throw e
    })
  await setDoc(doc(db, 'invites', code), { householdId, createdBy: uid, createdAt: Date.now(), expiresAt })
  await setDoc(profileFor(uid), { householdId, inviteCode: code, inviteExpiresAt: expiresAt, email }, { merge: true })
  return code
}

/** Recover your household's invite code from your profile — only while it is still valid. */
export async function findMyInviteCode(): Promise<string | null> {
  if (!auth?.currentUser || !db) return null
  try {
    const prof = await getDoc(profileFor(auth.currentUser.uid))
    const data = prof.data() as { inviteCode?: string; inviteExpiresAt?: number } | undefined
    if (typeof data?.inviteCode === 'string' && data.inviteCode.length === 6 &&
        typeof data.inviteExpiresAt === 'number' && data.inviteExpiresAt > Date.now()) {
      return data.inviteCode
    }
  } catch { /* profile unreadable — caller offers regeneration */ }
  return null
}

/** Join a household via invite code. The code is the credential; it is burned on use. */
export async function joinHousehold(code: string): Promise<void> {
  if (!auth?.currentUser || !db) throw new Error('firebase-unavailable')
  const uid = auth.currentUser.uid
  const inviteRef = doc(db, 'invites', code.trim().toUpperCase())
  const snap = await getDoc(inviteRef)
  if (!snap.exists()) throw new Error('bad-code')
  const { householdId, expiresAt } = snap.data() as { householdId: string; expiresAt?: number }
  if (typeof expiresAt === 'number' && expiresAt <= Date.now()) throw new Error('expired-code')
  if (householdId === uid) throw new Error('own-code')
  // The rules validate membership against a live invite code passed as `code`.
  await setDoc(doc(db, 'households', householdId, 'members', uid), {
    code: code.trim().toUpperCase(),
    joinedAt: Date.now(),
    email: auth.currentUser.email ?? null,
  })
  await deleteDoc(inviteRef).catch(() => {}) // burn the code; failure just means it lingers until expiry
  await setDoc(profileFor(uid), { householdId, email: auth.currentUser.email ?? null }, { merge: true })
}

/** Leave the household — back to a personal budget. */
export async function leaveHousehold(): Promise<void> {
  if (!auth?.currentUser || !db) throw new Error('firebase-unavailable')
  const uid = auth.currentUser.uid
  const householdId = await getHouseholdId(uid)
  if (householdId) {
    await deleteDoc(doc(db, 'households', householdId, 'members', uid)).catch(() => {})
  }
  await setDoc(profileFor(uid), { householdId: null, inviteCode: null, inviteExpiresAt: null, email: auth.currentUser.email ?? null }, { merge: true })
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
