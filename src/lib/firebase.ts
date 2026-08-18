import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously, type Auth } from 'firebase/auth'
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

let auth: Auth | null = null
let db: Firestore | null = null

try {
  const app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
} catch {
  // Firebase unavailable (blocked network, bad config) — app falls back to local-only
}

const docFor = (uid: string) => doc(db!, 'users', uid, 'budget', 'state')

/** Sign in anonymously and load the remote budget state. Returns null if none saved yet. */
export async function loadRemote(): Promise<{ uid: string; state: BudgetState | null }> {
  if (!auth || !db) throw new Error('firebase-unavailable')
  const cred = await signInAnonymously(auth)
  const snap = await getDoc(docFor(cred.user.uid))
  return { uid: cred.user.uid, state: snap.exists() ? (snap.data() as BudgetState) : null }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

/** Debounced save of the whole budget state to Firestore. */
export function saveRemote(uid: string, state: BudgetState, onError: () => void) {
  if (!db) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    try {
      await setDoc(docFor(uid), state)
    } catch {
      onError()
    }
  }, 600)
}
