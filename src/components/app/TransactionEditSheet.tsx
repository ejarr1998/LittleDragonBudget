import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Check } from 'lucide-react'
import type { Transaction } from '@/types'
import { useBudget } from '@/lib/store'
import { fmt } from '@/lib/money'
import { CategoryPicker } from '@/components/app/CategoryPicker'

const ANTI_AUTOFILL = {
  autoComplete: 'off', autoCorrect: 'off', autoCapitalize: 'off', spellCheck: false,
  'data-1p-ignore': 'true', 'data-lpignore': 'true', 'data-bwignore': 'true', 'data-form-type': 'other',
} as const

/** Full-screen editor for a single transaction — big fields, easy on mobile. */
export function TransactionEditSheet({ transaction: t, onClose }: { transaction: Transaction | null; onClose: () => void }) {
  const { categories, updateTransaction } = useBudget()
  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('')
  const [income, setIncome] = useState(false)
  const [date, setDate] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!t) return
    setMerchant(t.merchant)
    setAmount(String(Math.abs(t.amount)))
    setIncome(t.amount < 0)
    setDate(t.date)
    setCategoryId(t.categoryId)
    setNote(t.note ?? '')
  }, [t])

  useEffect(() => {
    if (!t) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [t, onClose])

  if (!t) return null

  const save = () => {
    const v = parseFloat(amount)
    updateTransaction(t.id, {
      merchant: merchant.trim() || t.merchant,
      amount: isNaN(v) ? t.amount : Math.round(Math.abs(v) * 100) / 100 * (income ? -1 : 1),
      date: date || t.date,
      categoryId,
      note: note.trim() || undefined,
    })
    onClose()
  }

  const cat = categories.find((c) => c.id === categoryId)

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-[#0e1a1c]/45 backdrop-blur-[2px]" onClick={onClose} />
      <div
        data-animation="fade-in-up"
        className="relative w-full sm:max-w-md bg-[#f2f9fa] rounded-t-[28px] sm:rounded-[28px] shadow-2xl p-6 pb-8 max-h-[92dvh] overflow-y-auto"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl">Edit transaction</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[#ddedf0] text-[#3d4d50]" aria-label="Close editor">
            <X size={18} />
          </button>
        </div>

        <label className="block mt-5">
          <span className="text-[11px] uppercase tracking-[0.12em] text-[#3d4d50] font-semibold">Merchant</span>
          <input
            {...ANTI_AUTOFILL}
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            className="mt-1.5 w-full rounded-[14px] bg-white px-4 py-3.5 text-base font-medium outline-none focus:ring-2 ring-[#0f5257]"
            placeholder="Who was it?"
          />
          <span className="block mt-1 text-[11px] text-[#7a9aa0]">Trim the bank junk — e.g. just "Domino's" or "State Farm".</span>
        </label>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.12em] text-[#3d4d50] font-semibold">Amount</span>
            <div className="mt-1.5 flex items-center rounded-[14px] bg-white px-4 py-3.5 focus-within:ring-2 ring-[#0f5257]">
              <span className="text-[#3d4d50] mr-1.5">$</span>
              <input
                {...ANTI_AUTOFILL}
                type="number" min="0" step="0.01" inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-transparent text-base tnum outline-none"
              />
            </div>
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.12em] text-[#3d4d50] font-semibold">Date</span>
            <input
              {...ANTI_AUTOFILL}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1.5 w-full rounded-[14px] bg-white px-4 py-3.5 text-base outline-none focus:ring-2 ring-[#0f5257]"
            />
          </label>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => setIncome(false)}
            className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition-colors ${!income ? 'bg-[#0e1a1c] text-[#ddedf0]' : 'bg-white text-[#3d4d50]'}`}
          >
            Expense
          </button>
          <button
            onClick={() => setIncome(true)}
            className={`flex-1 rounded-full py-2.5 text-sm font-semibold transition-colors ${income ? 'bg-[#1f7a4d] text-white' : 'bg-white text-[#3d4d50]'}`}
          >
            Income
          </button>
        </div>

        {!income && (
          <div className="mt-4 flex items-center justify-between rounded-[14px] bg-white px-4 py-3">
            <span className="text-sm text-[#3d4d50]">Category</span>
            <CategoryPicker value={categoryId} onChange={setCategoryId} ariaLabel="Change category">
              <span className="flex items-center gap-2 text-sm font-medium text-[#0f5257] underline decoration-dotted underline-offset-2 cursor-pointer">
                <span className="w-2.5 h-2.5 rounded-[4px]" style={{ background: cat?.color ?? '#5f6b6d' }} />
                {cat?.name ?? 'Everything Else'}
              </span>
            </CategoryPicker>
          </div>
        )}

        <label className="block mt-4">
          <span className="text-[11px] uppercase tracking-[0.12em] text-[#3d4d50] font-semibold">Note <span className="normal-case font-normal">(optional)</span></span>
          <input
            {...ANTI_AUTOFILL}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-1.5 w-full rounded-[14px] bg-white px-4 py-3 text-sm outline-none focus:ring-2 ring-[#0f5257]"
            placeholder="Anything worth remembering?"
          />
        </label>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button onClick={onClose} className="rounded-full py-3 text-sm font-semibold bg-white text-[#3d4d50] hover:bg-[#ddedf0] transition-colors">
            Cancel
          </button>
          <button onClick={save} className="flex items-center justify-center gap-1.5 rounded-full py-3 text-sm font-semibold bg-[#0f5257] text-white hover:bg-[#0c4449] transition-colors">
            <Check size={15} /> Save {amount && !isNaN(parseFloat(amount)) ? `· ${fmt(parseFloat(amount))}` : ''}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
