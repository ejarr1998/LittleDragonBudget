import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { BudgetState, Category, Goal, IncomeSource, Transaction } from '@/types'
import { categorize, cleanMerchant, monthKey, uid } from '@/lib/money'
import { playChaching } from '@/lib/sound'
import { breatheFire } from '@/lib/fire'
import {
  loadRemote, saveRemote, subscribeRemote, flushRemote, pushStateNow, onAuthChange,
  signInWithGoogle, signOutAccount, createHousehold, joinHousehold, leaveHousehold,
  logAuth, currentAccount, type AccountInfo, type StoredBudget, type SyncStatus,
} from '@/lib/firebase'

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'rent', name: 'Rent', bucket: 'fixed', limit: 1650, color: '#0f5257', icon: 'home' },
  { id: 'utilities', name: 'Utilities & Phone', bucket: 'fixed', limit: 220, color: '#17696f', icon: 'zap' },
  { id: 'insurance', name: 'Insurance', bucket: 'fixed', limit: 180, color: '#1f8289', icon: 'shield' },
  { id: 'daycare', name: 'Daycare', bucket: 'fixed', limit: 1200, color: '#d06079', icon: 'baby' },
  { id: 'savings', name: 'Savings', bucket: 'fixed', limit: 500, color: '#1f8a70', icon: 'piggy' },
  { id: 'subscriptions', name: 'Subscriptions', bucket: 'fixed', limit: 75, color: '#2a9aa2', icon: 'repeat' },
  { id: 'groceries', name: 'Groceries', bucket: 'flexible', limit: 550, color: '#1f7a4d', icon: 'cart' },
  { id: 'dining', name: 'Dining Out', bucket: 'flexible', limit: 320, color: '#3d9970', icon: 'utensils' },
  { id: 'coffee', name: 'Coffee', bucket: 'flexible', limit: 90, color: '#8a5a2b', icon: 'coffee' },
  { id: 'transport', name: 'Transport', bucket: 'flexible', limit: 260, color: '#b7791f', icon: 'car' },
  { id: 'shopping', name: 'Shopping', bucket: 'flexible', limit: 300, color: '#c0564b', icon: 'bag' },
  { id: 'entertainment', name: 'Entertainment', bucket: 'flexible', limit: 160, color: '#7a5aa8', icon: 'ticket' },
  { id: 'health', name: 'Health & Fitness', bucket: 'flexible', limit: 120, color: '#4a7ba6', icon: 'heart' },
  { id: 'travel', name: 'Travel', bucket: 'nonmonthly', limit: 250, color: '#2a7f8f', icon: 'plane' },
  { id: 'other', name: 'Everything Else', bucket: 'flexible', limit: 150, color: '#5f6b6d', icon: 'dots' },
  { id: 'income', name: 'Income', bucket: 'fixed', limit: 0, color: '#1f7a4d', icon: 'income' },
]

// --- Deterministic demo data ------------------------------------------------
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedTransactions(): Transaction[] {
  const rnd = mulberry32(20260819)
  const out: Transaction[] = []
  const now = new Date()
  const add = (y: number, m: number, d: number, merchant: string, categoryId: string, amount: number, recurring = false) =>
    out.push({
      id: uid(), categoryId, merchant, amount: Math.round(amount * 100) / 100, recurring,
      date: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    })
  const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)]

  const grocery = ['Whole Foods Market', 'Trader Joe’s', 'Costco', 'Safeway']
  const dining = ['Chipotle', 'Shake Shack', 'Blue Door Ramen', 'La Taqueria', 'DoorDash', 'Nonna’s Pizza', 'Sushi Nakama']
  const coffee = ['Blue Bottle Coffee', 'Starbucks', 'Sightglass Coffee']
  const fun = ['AMC Theatres', 'Steam', 'City Bowling', 'Vinyl Records Co.']
  const shop = ['Amazon', 'Target', 'IKEA', 'Best Buy', 'Etsy']
  const transport = ['Uber', 'Shell', 'Lyft', 'Metro Transit', 'Chevron']

  for (let back = 5; back >= 0; back--) {
    const base = new Date(now.getFullYear(), now.getMonth() - back, 1)
    const y = base.getFullYear(), m = base.getMonth()
    const days = new Date(y, m + 1, 0).getDate()
    const maxDay = back === 0 ? now.getDate() : days
    add(y, m, 1, 'Acme Corp — Salary', 'income', -3450, true)
    if (maxDay >= 15) add(y, m, 15, 'Acme Corp — Salary', 'income', -3450, true)
    add(y, m, 2, 'Greenview Property Mgmt', 'rent', 1650, true)
    add(y, m, 5, 'City Power & Electric', 'utilities', 88 + rnd() * 40, true)
    add(y, m, 7, 'Verizon Wireless', 'utilities', 72, true)
    add(y, m, 9, 'Geico Auto Insurance', 'insurance', 164, true)
    add(y, m, 3, 'Netflix', 'subscriptions', 15.49, true)
    add(y, m, 4, 'Spotify', 'subscriptions', 11.99, true)
    add(y, m, 11, 'iCloud+', 'subscriptions', 2.99, true)
    add(y, m, 12, 'Planet Fitness', 'health', 24.99, true)
    for (let i = 0; i < 6; i++) { const d = 1 + Math.floor(rnd() * days); if (d <= maxDay) add(y, m, d, pick(grocery), 'groceries', 35 + rnd() * 110) }
    for (let i = 0; i < 8; i++) { const d = 1 + Math.floor(rnd() * days); if (d <= maxDay) add(y, m, d, pick(dining), 'dining', 14 + rnd() * 55) }
    for (let i = 0; i < 9; i++) { const d = 1 + Math.floor(rnd() * days); if (d <= maxDay) add(y, m, d, pick(coffee), 'coffee', 4.5 + rnd() * 8) }
    for (let i = 0; i < 5; i++) { const d = 1 + Math.floor(rnd() * days); if (d <= maxDay) add(y, m, d, pick(transport), 'transport', 9 + rnd() * 48) }
    for (let i = 0; i < 3; i++) { const d = 1 + Math.floor(rnd() * days); if (d <= maxDay) add(y, m, d, pick(shop), 'shopping', 18 + rnd() * 140) }
    for (let i = 0; i < 2; i++) { const d = 1 + Math.floor(rnd() * days); if (d <= maxDay) add(y, m, d, pick(fun), 'entertainment', 12 + rnd() * 45) }
    if (rnd() > 0.5) { const d = 6 + Math.floor(rnd() * 18); if (d <= maxDay) add(y, m, d, 'CVS Pharmacy', 'health', 12 + rnd() * 40) }
    if (back === 2) add(y, m, 14, 'Delta Airlines', 'travel', 286)
    if (back === 4) add(y, m, 20, 'Airbnb', 'travel', 342)
  }
  return out.sort((a, b) => b.date.localeCompare(a.date))
}

function seedState(): BudgetState {
  return {
    transactions: seedTransactions(),
    categories: DEFAULT_CATEGORIES,
    incomes: [{ id: uid(), name: 'Acme Corp — Salary', owner: 'Alex', amount: 6900 }],
    monthlyIncome: 6900,
    goals: [
      { id: uid(), name: 'Emergency fund', target: 10000, saved: 6400, color: '#0f5257' },
      { id: uid(), name: 'Japan trip', target: 3200, saved: 1150, color: '#b7791f' },
      { id: uid(), name: 'New laptop', target: 1800, saved: 1450, color: '#7a5aa8' },
    ],
  }
}

/** Strip the sync envelope and backfill fields missing from older saves. */
function normalise(remote: StoredBudget): BudgetState {
  return {
    transactions: remote.transactions ?? [],
    categories: mergeCategories(remote.categories),
    goals: remote.goals ?? [],
    incomes: remote.incomes ?? [],
    monthlyIncome: remote.monthlyIncome ?? 0,
  }
}

/** Add any newly-introduced default categories to saved budgets. */
function mergeCategories(saved: Category[] | undefined): Category[] {
  const list = saved?.length ? [...saved] : []
  for (const d of DEFAULT_CATEGORIES) {
    if (!list.some((c) => c.id === d.id)) list.push({ ...d })
  }
  return list
}

// --- Store -------------------------------------------------------------------
const KEY = 'ldb-budget-v1'
const LEGACY_KEYS = ['clover-budget-v1'] // renamed from an earlier scaffold

/** Identifies this tab so it can ignore the echo of its own writes. */
const WRITER_ID = Math.random().toString(36).slice(2, 10)

/** Union two lists of id-bearing records, preferring `mine` on conflict. */
function unionById<T extends { id: string }>(mine: T[], theirs: T[]): T[] {
  const out = [...mine]
  const have = new Set(mine.map((x) => x.id))
  for (const t of theirs) if (!have.has(t.id)) out.push(t)
  return out
}

const emptyState = (): BudgetState => ({
  transactions: [], categories: DEFAULT_CATEGORIES, goals: [], incomes: [], monthlyIncome: 0,
})

const readLocal = (): BudgetState | null => {
  for (const k of [KEY, ...LEGACY_KEYS]) {
    try {
      const raw = localStorage.getItem(k)
      if (!raw) continue
      const parsed = JSON.parse(raw) as BudgetState
      if (parsed?.categories?.length) return parsed
    } catch { /* corrupt entry — try the next key */ }
  }
  return null
}

interface Store extends BudgetState {
  syncStatus: SyncStatus
  account: AccountInfo | null
  signInGoogle: () => Promise<void>
  signOut: () => Promise<void>
  createInvite: () => Promise<string>
  joinInvite: (code: string) => Promise<void>
  leaveHousehold: () => Promise<void>
  importLocal: () => Promise<void>
  addTransaction: (t: Omit<Transaction, 'id' | 'categoryId'> & { categoryId?: string }) => void
  deleteTransaction: (id: string) => void
  recategorize: (id: string, categoryId: string) => void
  importTransactions: (rows: { date: string; merchant: string; amount: number }[]) => { added: number; importId: string }
  undoImport: (importId: string) => number
  setLimit: (categoryId: string, limit: number) => void
  addIncome: (i: Omit<IncomeSource, 'id'>) => void
  updateIncome: (id: string, patch: Partial<Omit<IncomeSource, 'id'>>) => void
  deleteIncome: (id: string) => void
  addGoal: (g: Omit<Goal, 'id'>) => void
  contribute: (goalId: string, amount: number) => void
  deleteGoal: (id: string) => void
  restoreBackup: (state: BudgetState) => void
  resetDemo: () => void
  startFresh: () => void
}

const Ctx = createContext<Store | null>(null)

export function BudgetProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BudgetState>(() => {
    const saved = readLocal()
    // New users start with a clean slate — demo data is opt-in via the menu.
    if (!saved) return emptyState()
    return { ...saved, categories: mergeCategories(saved.categories), incomes: saved.incomes ?? [], goals: saved.goals ?? [] }
  })

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('connecting')
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const uidRef = useRef<string | null>(null)
  const householdRef = useRef<string | null>(null)
  const hydratedRef = useRef(false)
  const stateRef = useRef(state)
  stateRef.current = state

  const inflightRef = useRef<Promise<boolean> | null>(null)
  // True while we are applying a snapshot from Firestore, so the save effect
  // does not immediately write the same data back out.
  const applyingRemoteRef = useRef(false)
  // True when this device has local edits that have not been flushed yet.
  const dirtyRef = useRef(false)
  const unsubDocRef = useRef<(() => void) | null>(null)

  // Hydrate from Firestore; returns true if a remote state was loaded.
  const hydrate = (): Promise<boolean> => {
    if (inflightRef.current) return inflightRef.current // one load at a time
    const p = hydrateInner().finally(() => { inflightRef.current = null })
    inflightRef.current = p
    return p
  }

  const hydrateInner = async (): Promise<boolean> => {
    const { uid: remoteUid, householdId, state: remote } = await loadRemote()
    uidRef.current = remoteUid
    householdRef.current = householdId
    if (remote?.categories?.length) {
      applyingRemoteRef.current = true
      setState(normalise(remote))
      hydratedRef.current = true
      setSyncStatus('synced')
      return true
    }
    // Nothing saved remotely yet: push this device's budget up.
    hydratedRef.current = true
    saveRemote(remoteUid, householdId, stateRef.current, () => setSyncStatus('offline'))
    setSyncStatus('synced')
    return false
  }

  // On mount: sign in (anonymously if brand new) and hydrate (fall back to local).
  useEffect(() => {
    let cancelled = false
    hydrate()
      .then(() => { if (!cancelled) { resubscribe(); setAccount(currentAccount(householdRef.current)) } })
      .catch(() => { if (!cancelled) { hydratedRef.current = true; setSyncStatus('local-only'); setAccount(currentAccount(householdRef.current)) } })
    const unsub = onAuthChange((user) => {
      logAuth(`auth state → ${user ? (user.email ?? `anon ${user.uid.slice(0, 6)}…`) : 'signed out'}`)
      if (!cancelled && user && user.uid !== uidRef.current) {
        // Account changed (Google sign-in/out) — re-hydrate from the new account.
        hydrate()
          .then(() => { if (!cancelled) { resubscribe(); setAccount(currentAccount(householdRef.current)) } })
          .catch(() => { if (!cancelled) { setSyncStatus('offline'); setAccount(currentAccount(householdRef.current)) } })
      }
    })
    return () => { cancelled = true; unsub(); unsubDocRef.current?.(); flushRemote() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Adopt a change written by another device. When this device has nothing
   * pending we take the remote copy wholesale; when it does, we union the
   * id-bearing lists so neither side's additions are lost.
   */
  const applyRemote = (remote: StoredBudget) => {
    if (remote.writerId === WRITER_ID) return // our own write coming back
    const incoming = normalise(remote)
    applyingRemoteRef.current = true
    setState((mine) => {
      if (!dirtyRef.current) return incoming
      return {
        ...incoming,
        transactions: unionById(mine.transactions, incoming.transactions)
          .sort((a, b) => b.date.localeCompare(a.date)),
        goals: unionById(mine.goals, incoming.goals),
        incomes: unionById(mine.incomes, incoming.incomes),
        categories: mergeCategories(mine.categories),
        monthlyIncome: mine.monthlyIncome,
      }
    })
  }

  /** (Re)attach the live listener for whichever document we are now reading. */
  const resubscribe = () => {
    unsubDocRef.current?.()
    unsubDocRef.current = null
    if (!uidRef.current) return
    unsubDocRef.current = subscribeRemote(
      uidRef.current,
      householdRef.current,
      applyRemote,
      () => setSyncStatus('offline'),
    )
  }

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* storage full */ }
    if (applyingRemoteRef.current) {
      // This render came from a snapshot, not a user edit — do not echo it back.
      applyingRemoteRef.current = false
      dirtyRef.current = false
      return
    }
    if (hydratedRef.current && uidRef.current) {
      dirtyRef.current = true
      saveRemote(
        uidRef.current,
        householdRef.current,
        { ...state, writerId: WRITER_ID, updatedAt: Date.now() },
        () => setSyncStatus('offline'),
      )
      // The write is queued; the snapshot echo clears the flag for real.
      setTimeout(() => { dirtyRef.current = false }, 1500)
    }
  }, [state])

  const store = useMemo<Store>(() => ({
    ...state,
    syncStatus,
    account,
    signInGoogle: async () => {
      await signInWithGoogle()
      await hydrate()
      resubscribe()
      setAccount(currentAccount(householdRef.current))
    },
    signOut: async () => {
      // Clear this device before the new anonymous session starts, or the budget
      // we just signed out of gets pushed straight into the anonymous account.
      const blank = emptyState()
      stateRef.current = blank
      setState(blank)
      uidRef.current = null
      householdRef.current = null
      hydratedRef.current = false
      try { localStorage.removeItem(KEY); for (const k of LEGACY_KEYS) localStorage.removeItem(k) } catch { /* ignore */ }
      await signOutAccount()
      await hydrate()
      resubscribe()
      setAccount(currentAccount(householdRef.current))
    },
    createInvite: async () => {
      const code = await createHousehold()
      const uid = uidRef.current!
      householdRef.current = uid
      // Move the current budget into the household doc so the partner sees it.
      await pushStateNow(uid, uid, { ...stateRef.current, writerId: WRITER_ID, updatedAt: Date.now() })
      resubscribe()
      setAccount(currentAccount(uid))
      return code
    },
    joinInvite: async (code) => {
      await joinHousehold(code)
      await hydrate() // pulls the shared budget down (or pushes local up if empty)
      resubscribe()
      setAccount(currentAccount(householdRef.current))
    },
    leaveHousehold: async () => {
      await leaveHousehold()
      await hydrate()
      resubscribe()
      setAccount(currentAccount(householdRef.current))
    },
    importLocal: async () => {
      if (!uidRef.current) throw new Error('not-signed-in')
      await pushStateNow(uidRef.current, householdRef.current, { ...stateRef.current, writerId: WRITER_ID, updatedAt: Date.now() })
    },
    addTransaction: (t) => {
      if (t.amount > 0) { playChaching(); breatheFire() } // manual expenses only — imports stay quiet
      setState((s) => ({
        ...s,
        transactions: [{ ...t, id: uid(), categoryId: t.categoryId ?? categorize(t.merchant, s.categories) }, ...s.transactions]
          .sort((a, b) => b.date.localeCompare(a.date)),
      }))
    },
    deleteTransaction: (id) => setState((s) => ({ ...s, transactions: s.transactions.filter((t) => t.id !== id) })),
    recategorize: (id, categoryId) => setState((s) => ({
      ...s, transactions: s.transactions.map((t) => (t.id === id ? { ...t, categoryId } : t)),
    })),
    importTransactions: (rows) => {
      // Counts are derived from the current state up front, never from inside the
      // setState updater — React does not promise to run updaters synchronously.
      const importId = uid()
      const current = stateRef.current
      // Duplicate detection is per-occurrence, not per-key: two identical coffees
      // on the same day are two real transactions, so only skip as many as we
      // already hold.
      const budget = new Map<string, number>()
      for (const t of current.transactions) {
        const k = `${t.date}|${t.merchant}|${t.amount}`
        budget.set(k, (budget.get(k) ?? 0) + 1)
      }
      const fresh: Transaction[] = []
      for (const r of rows) {
        const merchant = cleanMerchant(r.merchant)
        const k = `${r.date}|${merchant}|${r.amount}`
        const remaining = budget.get(k) ?? 0
        if (remaining > 0) { budget.set(k, remaining - 1); continue } // already have this one
        fresh.push({ ...r, merchant, id: uid(), importId, categoryId: categorize(merchant, current.categories) })
      }
      if (fresh.length) {
        setState((s) => ({
          ...s,
          transactions: [...fresh, ...s.transactions].sort((a, b) => b.date.localeCompare(a.date)),
        }))
      }
      return { added: fresh.length, importId }
    },
    undoImport: (importId) => {
      const removed = stateRef.current.transactions.filter((t) => t.importId === importId).length
      if (removed) setState((s) => ({ ...s, transactions: s.transactions.filter((t) => t.importId !== importId) }))
      return removed
    },
    setLimit: (categoryId, limit) => setState((s) => ({
      ...s, categories: s.categories.map((c) => (c.id === categoryId ? { ...c, limit } : c)),
    })),
    addIncome: (i) => setState((s) => ({ ...s, incomes: [...s.incomes, { ...i, id: uid() }] })),
    updateIncome: (id, patch) => setState((s) => ({
      ...s, incomes: s.incomes.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    })),
    deleteIncome: (id) => setState((s) => ({ ...s, incomes: s.incomes.filter((i) => i.id !== id) })),
    addGoal: (g) => setState((s) => ({ ...s, goals: [...s.goals, { ...g, id: uid() }] })),
    contribute: (goalId, amount) => setState((s) => ({
      ...s, goals: s.goals.map((g) => (g.id === goalId ? { ...g, saved: Math.max(0, Math.min(g.target, g.saved + amount)) } : g)),
    })),
    deleteGoal: (id) => setState((s) => ({ ...s, goals: s.goals.filter((g) => g.id !== id) })),
    restoreBackup: (restored) => setState({ ...restored, categories: mergeCategories(restored.categories) }),
    resetDemo: () => setState(seedState()),
    startFresh: () => setState((s) => ({
      ...s,
      transactions: [],
      goals: [],
      // keep categories + limits — that's your budget setup, not test data
    })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [state, syncStatus, account])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useBudget() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useBudget must be used inside BudgetProvider')
  return ctx
}

export function useMonthSpend(month: string) {
  const { transactions } = useBudget()
  return useMemo(() => {
    const txns = transactions.filter((t) => monthKey(t.date) === month)
    return {
      txns,
      spent: txns.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
      earned: txns.filter((t) => t.amount < 0).reduce((s, t) => s - t.amount, 0),
      byCategory: txns.reduce<Record<string, number>>((acc, t) => {
        if (t.amount > 0) acc[t.categoryId] = (acc[t.categoryId] ?? 0) + t.amount
        return acc
      }, {}),
    }
  }, [transactions, month])
}
