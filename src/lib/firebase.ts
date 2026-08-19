import { initializeApp } from 'firebase/app'
import {
  getAuth, onAuthStateChanged, signInAnonymously, signOut,
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  browserPopupRedirectResolver, browserLocalPersistence, browserSessionPersistence,
  setPersistence,
  type Auth, type User,
} from 'firebase/auth'
import { deleteDoc, doc, getDoc, getFirestore, onSnapshot, setDoc, type Firestore } from 'firebase/firestore'
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

/**
 * What actually lives in the budget document. `writerId` identifies the tab that
 * last wrote it, so a client can ignore the echo of its own save; `updatedAt`
 * lets a late write recognise that it is stale.
 */
export type StoredBudget = BudgetState & { writerId?: string; updatedAt?: number }

export interface AccountInfo {
  uid: string
  email: string | null
  isGoogle: boolean
  householdId: string | null
}

let auth: Auth | null = null
let db: Firestore | null = null
let lastAuthError: string | null = null
/** Whether the sessionStorage-to-localStorage redirect patch took effect. */
let redirectPatch: 'applied' | 'field-missing' | 'resolver-missing' | 'not-attempted' = 'not-attempted'

export const getRedirectPatchStatus = () => redirectPatch

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
  // The SDK keeps the pending-redirect flag in sessionStorage, which Android
  // wipes when it destroys and recreates an installed PWA window mid sign-in.
  // Move it to localStorage so getRedirectResult can still find it on return.
  // This reaches into a private field, so record whether it actually applied —
  // if the SDK renames it, the auth log will say so instead of failing silently.
  const resolverHolder = auth as unknown as {
    _popupRedirectResolver?: { _redirectPersistence?: unknown }
  }
  const resolver = resolverHolder._popupRedirectResolver
  if (resolver && '_redirectPersistence' in resolver) {
    resolver._redirectPersistence = browserLocalPersistence
    redirectPatch = 'applied'
  } else {
    redirectPatch = resolver ? 'field-missing' : 'resolver-missing'
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
const memberFor = (householdId: string, uid: string) => doc(db!, 'households', householdId, 'members', uid)

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Invite codes are credentials, so they come from the CSPRNG rather than
 * Math.random. The alphabet drops characters that are easy to misread aloud
 * (0/O, 1/I/L) because these get read out over the phone.
 */
function makeInviteCode(len = 8): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(len)
  crypto.getRandomValues(bytes)
  // Rejection-free bias is negligible at this length; readability wins.
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

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
export async function loadRemote(): Promise<{ uid: string; householdId: string | null; state: StoredBudget | null }> {
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
  // Households created before membership documents existed would otherwise be
  // locked out by the rules — repair the owner's record on the way in.
  if (householdId && householdId === uid) {
    try { await ensureOwnerMembership(uid) } catch (e) { noteError('repair-membership', e) }
  }
  let snap
  try {
    snap = await getDoc(docFor(uid, householdId))
    logAuth(`budget load OK (${snap.exists() ? 'found saved budget' : 'nothing saved yet'})`)
  } catch (e) {
    noteError('load-budget (firestore rules?)', e)
    logAuth(`budget load FAILED → ${(e as { code?: string }).code ?? e}`)
    throw e
  }
  return { uid, householdId, state: snap.exists() ? (snap.data() as StoredBudget) : null }
}

/** Observe auth changes (Google sign-in/out). */
export function onAuthChange(cb: (user: User | null) => void) {
  if (!auth) return () => {}
  return onAuthStateChanged(auth, cb)
}

/**
 * Snapshot of the signed-in user. `householdId` must be supplied by the caller,
 * which is the only place that knows the membership loaded during hydration.
 */
export function currentAccount(householdId: string | null = null): AccountInfo | null {
  if (!auth?.currentUser) return null
  const u = auth.currentUser
  return {
    uid: u.uid,
    email: u.email,
    isGoogle: u.providerData.some((p) => p.providerId === 'google.com'),
    householdId,
  }
}

/**
 * Google sign-in.
 *
 * Popup first, everywhere — including installed PWAs. The redirect flow hands
 * off to accounts.google.com and back through the Firebase auth handler on
 * {project}.firebaseapp.com, which means the return leg depends on third-party
 * storage and on sessionStorage surviving a window the OS may have destroyed.
 * Neither holds up in an installed Android PWA. The popup flow keeps the opener
 * alive and talks to it over postMessage, so it does not depend on either.
 *
 * Redirect stays as the fallback for the case where the popup is genuinely
 * blocked.
 */
export async function signInWithGoogle(): Promise<User> {
  if (!auth) throw new Error('firebase-unavailable')
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })

  // Firebase's default persistence writes the signed-in user to IndexedDB, and
  // that layer closes its connection the instant document.visibilityState goes
  // 'hidden' — with no retry if a write lands while still hidden. On some
  // devices (Android tablets in particular) opening the sign-in popup flips the
  // opener tab to hidden while focus is on the popup, so the credential arrives
  // right as the write gets refused: "Database is closing/hidden". This is not
  // a fluke — it's the SDK's own guard doing exactly what it's built to do.
  //
  // sessionStorage-backed persistence is synchronous and has no such guard, so
  // it's a safe landing zone for the credential during the popup. Once we're
  // back in the foreground we migrate it into durable storage.
  const usingSession = await trySetPersistence(browserSessionPersistence, 'session (pre-popup)')

  try {
    logAuth('opening Google popup…')
    const cred = await signInWithPopup(auth, provider, browserPopupRedirectResolver)
    logAuth(`popup OK → ${cred.user.email ?? cred.user.uid}`)
    try { localStorage.removeItem('ldb-signin-attempt') } catch { /* ignore */ }

    if (usingSession) {
      // Migrate to durable storage now that the tab is back in the foreground.
      // If this still races (unlikely — the popup has closed by now), the user
      // stays signed in for this tab session rather than losing the sign-in.
      await trySetPersistence(browserLocalPersistence, 'local (post-popup)')
    }
    return cred.user
  } catch (e) {
    const code = (e as { code?: string }).code ?? ''
    if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      logAuth('popup closed by user')
      throw new Error('cancelled') // user closed it — not a real failure
    }
    if (code === 'auth/popup-blocked' || code === 'auth/popup-failed' || code === 'auth/operation-not-supported-in-this-environment') {
      logAuth(`popup unavailable (${code}) — falling back to redirect [patch: ${redirectPatch}]`)
      try { localStorage.setItem('ldb-signin-attempt', String(Date.now())) } catch { /* ignore */ }
      await signInWithRedirect(auth, provider)
      throw new Error('redirecting') // page navigates away; unreachable
    }
    noteError('popup-sign-in', e)
    logAuth(`popup FAILED → ${code || String(e)}`)
    throw e
  }
}

/** setPersistence, but logged and never fatal — the sign-in itself matters more than which storage it lands in. */
async function trySetPersistence(p: typeof browserLocalPersistence, label: string): Promise<boolean> {
  if (!auth) return false
  try {
    await setPersistence(auth, p)
    return true
  } catch (e) {
    logAuth(`could not switch to ${label} persistence — continuing anyway (${(e as Error).message})`)
    return false
  }
}

/**
 * Sign out and start a fresh anonymous session. The caller is responsible for
 * clearing local state first — otherwise the previous account's budget would be
 * pushed into the new anonymous document on the next hydrate.
 */
export async function signOutAccount() {
  if (!auth) return
  await signOut(auth)
  await signInAnonymously(auth)
}

/**
 * Make sure the owner has a membership document. Membership — not the profile
 * field — is what the security rules check, and early households were created
 * before this collection existed.
 */
async function ensureOwnerMembership(uid: string): Promise<void> {
  if (!db) return
  await setDoc(doc(db, 'households', uid), { owner: uid, createdAt: Date.now() }, { merge: true })
  await setDoc(memberFor(uid, uid), { role: 'owner', joinedAt: Date.now(), email: auth?.currentUser?.email ?? null }, { merge: true })
}

/** Create a household around the signed-in user's budget; returns an invite code. */
export async function createHousehold(): Promise<string> {
  if (!auth?.currentUser || !db) throw new Error('firebase-unavailable')
  const uid = auth.currentUser.uid
  const householdId = uid // owner uid doubles as household id — one household per owner
  await ensureOwnerMembership(uid)
  const code = makeInviteCode()
  await setDoc(doc(db, 'invites', code), {
    householdId,
    createdBy: uid,
    createdAt: Date.now(),
    expiresAt: Date.now() + INVITE_TTL_MS,
  })
  await setDoc(profileFor(uid), { householdId, email: auth.currentUser.email ?? null }, { merge: true })
  return code
}

/**
 * Join a household via invite code. The membership write is what actually
 * grants access, and the rules re-check the code server-side — the profile
 * field below is only a local convenience for finding the right document.
 * The code is burned on success so it cannot be reused or shared onward.
 */
export async function joinHousehold(code: string): Promise<void> {
  if (!auth?.currentUser || !db) throw new Error('firebase-unavailable')
  const clean = code.trim().toUpperCase()
  const uid = auth.currentUser.uid
  const snap = await getDoc(doc(db, 'invites', clean))
  if (!snap.exists()) throw new Error('bad-code')
  const { householdId, expiresAt } = snap.data() as { householdId: string; expiresAt?: number }
  if (typeof expiresAt === 'number' && expiresAt < Date.now()) throw new Error('expired-code')
  try {
    await setDoc(memberFor(householdId, uid), {
      code: clean,
      role: 'member',
      joinedAt: Date.now(),
      email: auth.currentUser.email ?? null,
    })
  } catch (e) {
    noteError('join-household (rules rejected the code)', e)
    throw new Error('bad-code')
  }
  await setDoc(profileFor(uid), { householdId, email: auth.currentUser.email ?? null }, { merge: true })
  try { await deleteDoc(doc(db, 'invites', clean)) } catch { /* already burned — harmless */ }
}

/** Leave the household — back to a personal budget. */
export async function leaveHousehold(): Promise<void> {
  if (!auth?.currentUser || !db) throw new Error('firebase-unavailable')
  const uid = auth.currentUser.uid
  const householdId = await getHouseholdId(uid)
  if (householdId && householdId !== uid) {
    try { await deleteDoc(memberFor(householdId, uid)) } catch { /* already gone */ }
  }
  await setDoc(profileFor(uid), { householdId: null, email: auth.currentUser.email ?? null }, { merge: true })
}

/**
 * Live subscription to the budget document. Fires on every remote change,
 * including this client's own writes; callers filter those out with `writerId`.
 */
export function subscribeRemote(
  uid: string,
  householdId: string | null,
  onChange: (state: StoredBudget) => void,
  onError: () => void,
): () => void {
  if (!db) return () => {}
  return onSnapshot(
    docFor(uid, householdId),
    { includeMetadataChanges: false },
    (snap) => { if (snap.exists()) onChange(snap.data() as StoredBudget) },
    () => onError(),
  )
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

/** Debounced save of the whole budget state to Firestore. */
export function saveRemote(uid: string, householdId: string | null, state: StoredBudget, onError: () => void) {
  if (!db) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    setDoc(docFor(uid, householdId), state).catch(onError)
  }, 600)
}

/** Flush any pending debounced write immediately (used on tab hide / unload). */
export function flushRemote() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
}

/** One-shot write — used to import this device's budget into an account/household. */
export async function pushStateNow(uid: string, householdId: string | null, state: StoredBudget): Promise<void> {
  if (!db) throw new Error('firebase-unavailable')
  await setDoc(docFor(uid, householdId), state)
}

/** One-shot read — used to check whether an account/household already has data. */
export async function pullStateOnce(uid: string, householdId: string | null): Promise<StoredBudget | null> {
  if (!db) return null
  const snap = await getDoc(docFor(uid, householdId))
  return snap.exists() ? (snap.data() as StoredBudget) : null
}
