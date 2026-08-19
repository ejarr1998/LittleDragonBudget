import type { BudgetState } from '@/types'
import { dateKey } from '@/lib/money'

const FORMAT = 'little-dragon-budget'
const VERSION = 1

export interface BackupFile {
  format: typeof FORMAT
  version: number
  exportedAt: string
  state: BudgetState
}

/** Download the whole budget as a JSON file. */
export function exportBackup(state: BudgetState) {
  const payload: BackupFile = {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    state,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `little-dragon-budget-${dateKey(new Date())}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke on the next tick so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Validate and unwrap a backup file. Throws with a readable message on bad input. */
export async function readBackup(file: File): Promise<BudgetState> {
  let parsed: unknown
  try {
    parsed = JSON.parse(await file.text())
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  const b = parsed as Partial<BackupFile>
  if (b?.format !== FORMAT) throw new Error('That is not a Little Dragon backup file.')
  if (typeof b.version !== 'number' || b.version > VERSION) {
    throw new Error('That backup was made by a newer version of the app.')
  }
  const s = b.state as Partial<BudgetState> | undefined
  if (!s || !Array.isArray(s.transactions) || !Array.isArray(s.categories)) {
    throw new Error('That backup is missing its budget data.')
  }
  return {
    transactions: s.transactions,
    categories: s.categories,
    goals: s.goals ?? [],
    incomes: s.incomes ?? [],
    monthlyIncome: s.monthlyIncome ?? 0,
  }
}
