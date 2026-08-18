import { useMemo, useRef, useState } from 'react'
import { ArrowDownLeft, Trash2, Upload, Repeat, Undo2, Info, Plus } from 'lucide-react'
import { useBudget } from '@/lib/store'
import { categorize, fmt, monthKey, parseCSV, todayKey } from '@/lib/money'
import { parseStatementPDF } from '@/lib/pdf'
import { CategoryIcon } from '@/components/app/ui'

type Filter = 'all' | 'expense' | 'income'

export function Transactions({ month }: { month: string }) {
  const { transactions, categories, addTransaction, deleteTransaction, recategorize, importTransactions, undoImport } = useBudget()
  const [filter, setFilter] = useState<Filter>('all')
  const [categoryId, setCategoryId] = useState('all')
  const [query, setQuery] = useState('')
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // --- Quick add -------------------------------------------------------------
  const [qMerchant, setQMerchant] = useState('')
  const [qAmount, setQAmount] = useState('')
  const [qIncome, setQIncome] = useState(false)
  const [qCat, setQCat] = useState<string | null>(null) // null = follow auto-detection
  const [qMsg, setQMsg] = useState<string | null>(null)
  const qAmountRef = useRef<HTMLInputElement>(null)

  const autoCat = qIncome ? 'income' : categorize(qMerchant, categories)
  const effectiveCat = qCat ?? autoCat
  const effectiveCatName = categories.find((c) => c.id === effectiveCat)?.name ?? 'Everything Else'
  const effectiveCatColor = categories.find((c) => c.id === effectiveCat)?.color ?? '#5f6b6d'

  const quickAdd = () => {
    const amt = parseFloat(qAmount.replace(/[$,]/g, ''))
    if (!qMerchant.trim()) { setQMsg('Give it a merchant or description.'); return }
    if (!amt || amt <= 0) { setQMsg('Enter an amount.'); return }
    addTransaction({
      date: todayKey(),
      merchant: qMerchant.trim(),
      amount: qIncome ? -amt : amt,
      categoryId: qIncome ? 'income' : effectiveCat,
    })
    setQMerchant(''); setQAmount(''); setQCat(null); setQMsg(null)
  }

  const monthTxns = useMemo(() => transactions.filter((t) => monthKey(t.date) === month), [transactions, month])

  const visible = useMemo(() => monthTxns.filter((t) => {
    if (filter === 'expense' && t.amount < 0) return false
    if (filter === 'income' && t.amount > 0) return false
    if (categoryId !== 'all' && t.categoryId !== categoryId) return false
    if (query && !t.merchant.toLowerCase().includes(query.toLowerCase())) return false
    return true
  }), [monthTxns, filter, categoryId, query])

  const [parsing, setParsing] = useState(false)
  const [lastImport, setLastImport] = useState<{ importId: string; added: number } | null>(null)

  const onFile = async (f: File) => {
    setParsing(true)
    try {
      let rows: { date: string; merchant: string; amount: number }[]
      let skipped = 0
      if (/\.pdf$/i.test(f.name) || f.type === 'application/pdf') {
        const res = await parseStatementPDF(f)
        rows = res.rows; skipped = res.skipped
      } else {
        const res = parseCSV(await f.text())
        rows = res.rows; skipped = res.skipped
      }
      const { added, importId } = importTransactions(rows)
      if (added > 0) setLastImport({ importId, added })
      setImportMsg(
        rows.length === 0
          ? 'No transactions could be read from that file — the CSV download (desktop browser) is far more reliable.'
          : `Imported ${added} new transaction${added === 1 ? '' : 's'}${skipped ? `, skipped ${skipped} unreadable row${skipped === 1 ? '' : 's'}` : ''}${rows.length - added > 0 ? `, ${rows.length - added} already existed` : ''}. Double-check the categories — or undo the whole import below.`
      )
    } catch {
      setImportMsg('Could not read that file. A CSV export from your bank is the most reliable option.')
    } finally {
      setParsing(false)
    }
  }

  const onUndoImport = () => {
    if (!lastImport) return
    undoImport(lastImport.importId)
    setImportMsg(`Removed all ${lastImport.added} transactions from that import.`)
    setLastImport(null)
  }

  const catIcon = (id: string) => categories.find((c) => c.id === id)?.icon ?? 'dots'

  return (
    <div className="space-y-4">
      {/* Quick add */}
      <div data-animation="fade-in-up" className="rounded-[20px] bg-white p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="p-1.5 rounded-full bg-[#0f5257] text-[#ddedf0]"><Plus size={14} /></span>
          <h3 className="font-display text-lg">Quick add</h3>
          <div className="ml-auto flex bg-[#eef6f7] rounded-full p-0.5">
            {([false, true] as const).map((inc) => (
              <button
                key={String(inc)}
                onClick={() => { setQIncome(inc); setQCat(null) }}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                  qIncome === inc ? 'bg-[#0e1a1c] text-[#ddedf0]' : 'text-[#3d4d50]'
                }`}
              >
                {inc ? 'Income' : 'Expense'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={qMerchant}
            onChange={(e) => { setQMerchant(e.target.value); setQCat(null) }}
            onKeyDown={(e) => { if (e.key === 'Enter') qAmountRef.current?.focus() }}
            placeholder="Merchant — e.g. Trader Joe's"
            className="flex-1 min-w-[150px] rounded-full bg-[#eef6f7] px-4 py-2.5 text-sm outline-none focus:ring-2 ring-[#0f5257] placeholder:text-[#7a9aa0]"
          />
          <div className="relative w-32">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#7a9aa0]">$</span>
            <input
              ref={qAmountRef}
              value={qAmount}
              onChange={(e) => setQAmount(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') quickAdd() }}
              inputMode="decimal"
              placeholder="0.00"
              className="w-full rounded-full bg-[#eef6f7] pl-8 pr-4 py-2.5 text-sm outline-none focus:ring-2 ring-[#0f5257] placeholder:text-[#7a9aa0] font-mono-num"
            />
          </div>
          {!qIncome && (
            <select
              value={effectiveCat}
              onChange={(e) => setQCat(e.target.value)}
              className="rounded-full px-3.5 py-2.5 text-xs font-semibold text-white outline-none cursor-pointer appearance-none text-center"
              style={{ backgroundColor: effectiveCatColor }}
            >
              {categories.filter((c) => c.id !== 'income').map((c) => (
                <option key={c.id} value={c.id} className="text-[#0e1a1c] bg-white">{c.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={quickAdd}
            className="rounded-full bg-[#0e1a1c] text-[#ddedf0] font-semibold text-sm px-5 py-2.5 hover:bg-[#0f5257] transition-colors"
          >
            Add
          </button>
        </div>
        <p className="mt-2 text-[11px] text-[#3d4d50]">
          {qMsg ? (
            <span className="text-[#c0564b] font-medium">{qMsg}</span>
          ) : qIncome ? (
            <>Files under <strong>Income</strong>.</>
          ) : qMerchant.trim() ? (
            <>Auto-filed as <strong style={{ color: effectiveCatColor }}>{effectiveCatName}</strong> — tap the pill to change it.</>
          ) : (
            <>Type a merchant and it auto-files into a category — change it with the colored pill.</>
          )}
        </p>
      </div>

      {/* Compact bank import strip */}
      <div data-animation="fade-in-up" style={{ animationDelay: '60ms' }} className="rounded-[20px] bg-[#0e1a1c] text-[#ddedf0] px-4 py-3 flex items-center gap-3">
        <img src="./dragon.png" alt="" className="w-8 h-8 object-contain shrink-0" />
        <p className="flex-1 text-xs text-[#9fc3c9] min-w-0">
          <strong className="text-[#ddedf0]">Import bank activity</strong> — CSV or PDF statement
        </p>
        <button
          onClick={() => setShowHelp((v) => !v)}
          className="p-2 rounded-full hover:bg-white/10 transition-colors shrink-0"
          aria-label="How to get the file"
        >
          <Info size={15} />
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={parsing}
          className="flex items-center gap-1.5 rounded-full bg-[#c4dbe0] text-[#0e1a1c] font-semibold text-xs px-4 py-2 hover:bg-[#ddedf0] transition-colors disabled:opacity-50 shrink-0"
        >
          <Upload size={13} /> {parsing ? 'Reading…' : 'Import'}
        </button>
        <input
          ref={fileRef} type="file" accept=".csv,.pdf,text/csv,application/pdf" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }}
        />
      </div>
      {showHelp && (
        <div className="rounded-[20px] bg-white p-4 text-xs leading-relaxed text-[#3d4d50]">
          <strong className="text-[#0e1a1c]">Best option — Wells Fargo CSV (desktop browser only, not the app):</strong>{' '}
          wellsfargo.com → open the account → <em>Download Account Activity</em> → pick a{' '}
          <strong className="text-[#0e1a1c]">custom date range (up to 18 months)</strong> → format{' '}
          <em>Comma Delimited</em>. One file can cover many months, and every row imports cleanly.
          PDF statements also work, but they're one month per file and parsing is best-effort.
        </div>
      )}
      {(importMsg || lastImport) && (
        <div className="flex flex-wrap items-center gap-3 px-1">
          {importMsg && <p className="text-xs text-[#0f5257] font-medium flex-1 min-w-[200px]">{importMsg}</p>}
          {lastImport && (
            <button
              onClick={onUndoImport}
              className="flex items-center gap-2 rounded-full bg-[#c0564b] text-white font-semibold text-xs px-4 py-2 hover:bg-[#a0402f] transition-colors"
            >
              <Undo2 size={13} /> Undo last import ({lastImport.added})
            </button>
          )}
        </div>
      )}

      {/* Filters */}
      <div data-animation="fade-in-up" style={{ animationDelay: '120ms' }} className="flex flex-wrap items-center gap-2">
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
      <div data-animation="fade-in-up" style={{ animationDelay: '180ms' }} className="rounded-[20px] bg-white overflow-hidden">
        {visible.length === 0 ? (
          <p className="py-14 text-center text-sm text-[#3d4d50]">Nothing matches — try widening the filters.</p>
        ) : (
          <div className="divide-y divide-[#eef6f7] max-h-[560px] overflow-y-auto cl-scroll">
            {visible.map((t) => {
              const income = t.amount < 0
              return (
                <div key={t.id} className="group flex items-center gap-3 px-5 py-3.5 hover:bg-[#f4fafb] transition-colors">
                  <span className={`p-2 rounded-full shrink-0 ${income ? 'bg-[#1f7a4d]/10' : 'bg-[#ddedf0]'}`}>
                    {income ? <ArrowDownLeft size={15} className="text-[#1f7a4d]" /> : <CategoryIcon icon={catIcon(t.categoryId)} color={categories.find((c) => c.id === t.categoryId)?.color ?? '#5f6b6d'} size={15} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate flex items-center gap-1.5">
                      {t.merchant}
                      {t.recurring && <Repeat size={11} className="text-[#2a9aa2]" />}
                    </div>
                    <div className="text-[11px] text-[#3d4d50] flex items-center gap-1 flex-wrap">
                      {new Date(t.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {' · '}
                      {income ? (
                        <span>Income</span>
                      ) : (
                        <select
                          value={t.categoryId}
                          onChange={(e) => recategorize(t.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-transparent text-[11px] font-medium text-[#0f5257] underline decoration-dotted underline-offset-2 outline-none cursor-pointer"
                        >
                          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      )}
                      {t.note ? ` · ${t.note}` : ''}
                    </div>
                  </div>
                  <span className={`font-mono-num text-sm shrink-0 ${income ? 'text-[#1f7a4d]' : ''}`}>
                    {income ? '+' : '−'}{fmt(Math.abs(t.amount))}
                  </span>
                  <button
                    onClick={() => deleteTransaction(t.id)}
                    className="sm:opacity-0 group-hover:opacity-100 p-1.5 rounded-full text-[#c0564b] hover:bg-[#c0564b]/10 transition-all"
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
