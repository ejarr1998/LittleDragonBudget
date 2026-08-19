import { useState } from 'react'
import { X, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import { useBudget } from '@/lib/store'
import { todayKey } from '@/lib/money'
import { MerchantAutocomplete } from '@/components/app/MerchantAutocomplete'

/** Full-height slide-left drawer for adding a transaction. */
export function AddTransaction({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { categories, addTransaction } = useBudget()
  const [kind, setKind] = useState<'expense' | 'income'>('expense')
  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayKey())
  const [categoryId, setCategoryId] = useState('')
  const [note, setNote] = useState('')

  const visible = categories.filter((c) => (kind === 'income' ? c.id === 'income' : c.id !== 'income'))
  const valid = merchant.trim() && parseFloat(amount) > 0 && date

  const submit = () => {
    if (!valid) return
    addTransaction({
      merchant: merchant.trim(),
      amount: kind === 'expense' ? Math.abs(parseFloat(amount)) : -Math.abs(parseFloat(amount)),
      date,
      note: note.trim() || undefined,
      categoryId: categoryId || undefined, // undefined → auto-categorize
    })
    onClose()
  }

  return (
    <>
      <div
        className={`cl-backdrop fixed inset-0 z-40 bg-[#0e1a1c]/50 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div
        className={`cl-drawer fixed right-0 top-0 z-50 h-full w-full sm:w-[440px] bg-white flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog" aria-label="Add transaction"
      >
        <div className="flex items-center justify-between px-7 pt-7">
          <h2 className="font-display text-2xl flex items-center gap-2.5">
            <img src="./dragon.png" alt="" className="w-9 h-9 object-contain" />
            Add transaction
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[#ddedf0] transition-colors" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto cl-scroll px-7 py-6 space-y-6">
          {/* Expense / Income pill toggle */}
          <div className="flex bg-[#ddedf0] rounded-full p-1">
            {(['expense', 'income'] as const).map((k) => (
              <button
                key={k}
                onClick={() => { setKind(k); setCategoryId('') }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-medium transition-colors duration-300 ${
                  kind === k ? 'bg-[#0e1a1c] text-[#ddedf0]' : 'text-[#3d4d50]'
                }`}
              >
                {k === 'expense' ? <ArrowUpRight size={15} /> : <ArrowDownLeft size={15} />}
                {k === 'expense' ? 'Expense' : 'Income'}
              </button>
            ))}
          </div>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.14em] text-[#3d4d50]">Amount</span>
            <div className="mt-2 flex items-baseline gap-1 border-b-2 border-[#0e1a1c] pb-2">
              <span className="font-display text-3xl text-[#3d4d50]">$</span>
              <input autoComplete="off"
                type="number" min="0" step="0.01" value={amount} autoFocus
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent font-display text-4xl tnum outline-none placeholder:text-[#b8cdd2]"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.14em] text-[#3d4d50]">
              {kind === 'expense' ? 'Merchant' : 'Source'}
            </span>
            <div className="mt-2">
              <MerchantAutocomplete
                value={merchant}
                onChange={(v) => { setMerchant(v); setCategoryId('') }}
                onPick={(m, cat) => { setMerchant(m); if (cat && kind === 'expense') setCategoryId(cat) }}
                placeholder={kind === 'expense' ? 'e.g. Trader Joe’s' : 'e.g. Acme Corp — Salary'}
                inputClassName="rounded-[14px] bg-[#ddedf0]/60 px-4 py-3 text-sm"
              />
            </div>
            {kind === 'expense' && !categoryId && (
              <p className="mt-1.5 text-[11px] text-[#3d4d50]">Leave category blank and the dragon will auto-assign it from the name.</p>
            )}
          </label>

          <div>
            <span className="text-[11px] uppercase tracking-[0.14em] text-[#3d4d50]">Category</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {visible.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(categoryId === c.id ? '' : c.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors duration-200 ${
                    categoryId === c.id
                      ? 'bg-[#0e1a1c] text-[#ddedf0] border-[#0e1a1c]'
                      : 'border-[#c4dbe0] text-[#3d4d50] hover:border-[#0e1a1c]'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.14em] text-[#3d4d50]">Date</span>
            <input autoComplete="off"
              type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="mt-2 w-full rounded-[14px] bg-[#ddedf0]/60 px-4 py-3 text-sm outline-none focus:ring-2 ring-[#0f5257]"
            />
          </label>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.14em] text-[#3d4d50]">Note (optional)</span>
            <input autoComplete="off"
              value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Dinner with Sam"
              className="mt-2 w-full rounded-[14px] bg-[#ddedf0]/60 px-4 py-3 text-sm outline-none focus:ring-2 ring-[#0f5257] placeholder:text-[#7a9aa0]"
            />
          </label>
        </div>

        <div className="px-7 pb-7 pt-3">
          <button
            onClick={submit} disabled={!valid}
            className="w-full rounded-full bg-[#0f5257] text-white font-semibold py-3.5 text-sm hover:bg-[#0e1a1c] transition-colors duration-300 disabled:opacity-40"
          >
            Save transaction
          </button>
        </div>
      </div>
    </>
  )
}
