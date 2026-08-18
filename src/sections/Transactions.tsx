import { useMemo, useRef, useState } from 'react'
import { ArrowDownLeft, Trash2, Upload, Repeat } from 'lucide-react'
import { useBudget } from '@/lib/store'
import { fmt, monthKey, parseCSV } from '@/lib/money'
import { CategoryIcon } from '@/components/app/ui'

type Filter = 'all' | 'expense' | 'income'

export function Transactions({ month }: { month: string }) {
  const { transactions, categories, deleteTransaction, importTransactions } = useBudget()
  const [filter, setFilter] = useState<Filter>('all')
  const [categoryId, setCategoryId] = useState('all')
  const [query, setQuery] = useState('')
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const monthTxns = useMemo(() => transactions.filter((t) => monthKey(t.date) === month), [transactions, month])

  const visible = useMemo(() => monthTxns.filter((t) => {
    if (filter === 'expense' && t.amount < 0) return false
    if (filter === 'income' && t.amount > 0) return false
    if (categoryId !== 'all' && t.categoryId !== categoryId) return false
    if (query && !t.merchant.toLowerCase().includes(query.toLowerCase())) return false
    return true
  }), [monthTxns, filter, categoryId, query])

  const onFile = async (f: File) => {
    const text = await f.text()
    const { rows, skipped } = parseCSV(text)
    const added = importTransactions(rows)
    setImportMsg(`Imported ${added} new transaction${added === 1 ? '' : 's'}${skipped ? `, skipped ${skipped} unreadable row${skipped === 1 ? '' : 's'}` : ''}${rows.length - added > 0 ? `, ${rows.length - added} already existed` : ''}.`)
    setTimeout(() => setImportMsg(null), 8000)
  }

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? 'Uncategorized'
  const catColor = (id: string) => categories.find((c) => c.id === id)?.color ?? '#5f6b6d'
  const catIcon = (id: string) => categories.find((c) => c.id === id)?.icon ?? 'dots'

  return (
    <div className="space-y-4">
      {/* Bank connection notice + CSV import */}
      <div data-animation="fade-in-up" className="rounded-[20px] bg-[#0e1a1c] text-[#ddedf0] p-6 flex flex-wrap items-center gap-5">
        <div className="flex-1 min-w-[240px]">
          <h3 className="font-display text-xl">Connect your bank</h3>
          <p className="text-sm text-[#9fc3c9] mt-1.5 leading-relaxed max-w-lg">
            Live bank linking needs a licensed aggregator (Plaid, MX) with server-side credentials, so it isn't
            available in this app. The reliable path: export a CSV statement from your bank and drop it here —
            Clover auto-categorizes every row and skips duplicates.
          </p>
          {importMsg && <p className="mt-2 text-sm text-[#2a9aa2] font-medium">{importMsg}</p>}
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 rounded-full bg-[#c4dbe0] text-[#0e1a1c] font-semibold text-sm px-5 py-3 hover:bg-[#ddedf0] transition-colors"
        >
          <Upload size={16} /> Import bank CSV
        </button>
        <input
          ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }}
        />
      </div>

      {/* Filters */}
      <div data-animation="fade-in-up" style={{ animationDelay: '60ms' }} className="flex flex-wrap items-center gap-2">
        <div className="flex bg-white rounded-full p-1">
          {(['all', 'expense', 'income'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors duration-200 ${
                filter === f ? 'bg-[#0e1a1c] text-[#ddedf0]' : 'text-[#3d4d50]'
              }`}
            >
              {f === 'all' ? `All (${monthTxns.length})` : f === 'expense' ? 'Expenses' : 'Income'}
            </button>
          ))}
        </div>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-full bg-white px-4 py-2 text-xs font-medium outline-none cursor-pointer"
        >
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input
          value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search merchant…"
          className="flex-1 min-w-[160px] rounded-full bg-white px-4 py-2 text-xs outline-none focus:ring-2 ring-[#0f5257] placeholder:text-[#7a9aa0]"
        />
      </div>

      {/* List */}
      <div data-animation="fade-in-up" style={{ animationDelay: '120ms' }} className="rounded-[20px] bg-white overflow-hidden">
        {visible.length === 0 ? (
          <p className="py-14 text-center text-sm text-[#3d4d50]">Nothing matches — try widening the filters.</p>
        ) : (
          <div className="divide-y divide-[#eef6f7] max-h-[560px] overflow-y-auto cl-scroll">
            {visible.map((t) => {
              const income = t.amount < 0
              return (
                <div key={t.id} className="group flex items-center gap-3 px-5 py-3.5 hover:bg-[#f4fafb] transition-colors">
                  <span className={`p-2 rounded-full shrink-0 ${income ? 'bg-[#1f7a4d]/10' : 'bg-[#ddedf0]'}`}>
                    {income ? <ArrowDownLeft size={15} className="text-[#1f7a4d]" /> : <CategoryIcon icon={catIcon(t.categoryId)} color={catColor(t.categoryId)} size={15} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate flex items-center gap-1.5">
                      {t.merchant}
                      {t.recurring && <Repeat size={11} className="text-[#2a9aa2]" />}
                    </div>
                    <div className="text-[11px] text-[#3d4d50]">
                      {new Date(t.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {' · '}{catName(t.categoryId)}
                      {t.note ? ` · ${t.note}` : ''}
                    </div>
                  </div>
                  <span className={`font-mono-num text-sm shrink-0 ${income ? 'text-[#1f7a4d]' : ''}`}>
                    {income ? '+' : '−'}{fmt(Math.abs(t.amount))}
                  </span>
                  <button
                    onClick={() => deleteTransaction(t.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full text-[#c0564b] hover:bg-[#c0564b]/10 transition-all"
                    aria-label="Delete transaction"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
