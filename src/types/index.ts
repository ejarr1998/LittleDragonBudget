export type Bucket = 'fixed' | 'flexible' | 'nonmonthly'

export interface Category {
  id: string
  name: string
  bucket: Bucket
  limit: number // monthly budget limit, 0 = untracked
  color: string
  icon: string // lucide icon name key
}

export interface Transaction {
  id: string
  date: string // YYYY-MM-DD
  merchant: string
  categoryId: string
  amount: number // positive = expense, negative = income
  note?: string
  recurring?: boolean
  importId?: string // batch tag for undoing imports
}

export interface IncomeSource {
  id: string
  name: string
  owner: string // person's name, or "Joint"
  amount: number // expected per month
}

export interface Goal {
  id: string
  name: string
  target: number
  saved: number
  color: string
  emoji?: string
  deadline?: string
}

export interface BudgetState {
  transactions: Transaction[]
  categories: Category[]
  goals: Goal[]
  incomes: IncomeSource[]
  monthlyIncome: number
}

export const BUCKET_LABELS: Record<Bucket, string> = {
  fixed: 'Fixed',
  flexible: 'Flexible',
  nonmonthly: 'Non-monthly',
}

export const BUCKET_DESCRIPTIONS: Record<Bucket, string> = {
  fixed: 'Rent, insurance, and predictable bills that stay the same each month.',
  flexible: 'Day-to-day spending you control: groceries, dining, fun.',
  nonmonthly: 'Irregular or annual costs worth smoothing across the year.',
}
