import { useState } from 'react'
import { Minus, Plus, Check, Pencil, Trash2, Users, User, X, Wallet } from 'lucide-react'
import { useBudget, useMonthSpend } from '@/lib/store'
import { fmt } from '@/lib/money'
import { CategoryIcon, Donut, SegBar } from '@/components/app/ui'
import { BUCKET_DESCRIPTIONS, BUCKET_LABELS, type Bucket } from '@/types'

/** Income sources — individual or joint. */
export function useExpectedIncome() {
  const { incomes } = useBudget()
  return incomes.reduce((s, i) => s + i.amount, 0)
}

function IncomeSection({ earned }: { earned: number }) {
  const { incomes, addIncome, deleteIncome } = useBudget()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [owner, setOwner] = useState('')
  const [amount, setAmount] = useState('')
  const expected = incomes.reduce((s, i) => s + i.amount, 0)
  const owners: string[] = Array.from(new Set(incomes.map((i: { owner: string }) => i.owner).filter((o: string) => o !== 'Joint')))

  const submit = () => {
    const a = parseFloat(amount)
    if (!name.trim() || !owner.trim() || !(a > 0)) return
    addIncome({ name: name.trim(), owner: owner.trim(), amount: a })
    setName(''); setOwner(''); setAmount(''); setAdding(false)
  }

  return (
    <div data-animation="fade-in-up" className="rounded-[20px] bg-white p-5 sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="p-2 rounded-full bg-[#1f7a4d]/10 text-[#1f7a4d]"><Wallet size={15} /></span>
        <div>
          <h3 className="font-display text-xl leading-tight">Income</h3>
          <p className="text-xs text-[#3d4d50]">Who brings in what — individual or joint.</p>
        </div>
      </div>

      {expected > 0 && (
        <div className="mt-4 rounded-[16px] bg-[#eef6f7] px-5 py-4">
          {earned > 0 ? (
            <>
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-display text-3xl tnum text-[#1f7a4d]">{fmt(earned)}</span>
                <span className="text-xs text-[#3d4d50]">received of</span>
                <span className="font-display text-lg tnum">{fmt(expected)}</span>
                <span className="text-xs text-[#3d4d50]">expected this month</span>
                <span className="ml-auto font-mono-num text-xs text-[#3d4d50]">{Math.round((earned / expected) * 100)}%</span>
              </div>
              <div className="mt-3">
                <SegBar pct={earned / expected} color="#1f7a4d" segments={30} />
              </div>
            </>
          ) : (
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="font-display text-3xl tnum">{fmt(expected)}</span>
              <span className="text-xs text-[#3d4d50]">expected this month</span>
            </div>
          )}
        </div>
      )}

      <div className="mt-2 divide-y divide-[#eef6f7]">
        {incomes.map((i) => (
          <div key={i.id} className="group flex items-center gap-3 py-3.5">
            <span className={`p-2.5 rounded-full shrink-0 ${i.owner === 'Joint' ? 'bg-[#7a5aa8]/10 text-[#7a5aa8]' : 'bg-[#1f7a4d]/10 text-[#1f7a4d]'}`}>
              {i.owner === 'Joint' ? <Users size={15} /> : <User size={15} />}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{i.name}</div>
              <div className="text-[11px] text-[#3d4d50] mt-0.5">
                <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${i.owner === 'Joint' ? 'bg-[#7a5aa8]/10 text-[#7a5aa8]' : 'bg-[#ddedf0] text-[#0f5257]'}`}>
                  {i.owner}
                </span>
              </div>
            </div>
            <span className="font-mono-num text-sm shrink-0">{fmt(i.amount)}<span className="text-[#7a9aa0] text-xs">/mo</span></span>
            <button
              onClick={() => deleteIncome(i.id)}
              className="sm:opacity-0 group-hover:opacity-100 p-1.5 rounded-full text-[#c0564b] hover:bg-[#c0564b]/10 transition-all shrink-0"
              aria-label={`Delete ${i.name}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {incomes.length === 0 && !adding && (
          <p className="py-4 text-sm text-[#3d4d50]">No income sources yet — add yours below.</p>
        )}
      </div>

      {adding ? (
        <div className="mt-3 rounded-[16px] bg-[#ddedf0]/50 p-4 space-y-2.5">
          <input
            autoFocus value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Source, e.g. Acme Corp — Salary"
            className="w-full rounded-[12px] bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 ring-[#0f5257]"
          />
          <div className="flex gap-2">
            <input
              value={owner} onChange={(e) => setOwner(e.target.value)}
              placeholder="Owner, e.g. Alex"
              className="flex-1 rounded-[12px] bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 ring-[#0f5257]"
            />
            <input
              type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="$ / month"
              className="w-32 rounded-[12px] bg-white px-4 py-2.5 text-sm tnum outline-none focus:ring-2 ring-[#0f5257]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[...owners, 'Joint'].map((o) => (
              <button
                key={o}
                onClick={() => setOwner(o)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  owner === o ? 'bg-[#0e1a1c] text-[#ddedf0] border-[#0e1a1c]' : 'border-[#c4dbe0] text-[#3d4d50] hover:border-[#0e1a1c]'
                }`}
              >
                {o}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={submit} className="rounded-full bg-[#0f5257] text-white text-sm font-semibold px-5 py-2 hover:bg-[#0e1a1c] transition-colors">Add income</button>
            <button onClick={() => setAdding(false)} className="rounded-full bg-white text-sm font-medium px-5 py-2"><X size={14} className="inline mr-1" />Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-3 flex items-center gap-2 rounded-full border border-dashed border-[#9fc3c9] text-sm font-semibold text-[#0f5257] px-4 py-2 hover:border-[#0f5257] hover:bg-[#ddedf0]/40 transition-colors"
        >
          <Plus size={15} /> add income source
        </button>
      )}
    </div>
  )
}

/** Accordion-style bucket groups with editable per-category limits. */
export function Budget({ month }: { month: string }) {
  const { categories, setLimit } = useBudget()
  const expectedIncome = useExpectedIncome()
  const { byCategory, spent, earned } = useMonthSpend(month)
  const [open, setOpen] = useState<Record<Bucket, boolean>>({ fixed: true, flexible: true, nonmonthly: true })
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const budgeted = categories.filter((c) => c.limit > 0)
  const totalLimit = budgeted.reduce((s, c) => s + c.limit, 0)

  const save = (id: string) => {
    const v = parseFloat(draft)
    if (!isNaN(v) && v >= 0) setLimit(id, Math.round(v))
    setEditing(null)
  }

  return (
    <div className="space-y-4">
      <IncomeSection earned={earned} />

      {/* Income pie — the whole circle is your monthly income; slivers are allocations */}
      {totalLimit > 0 && (() => {
        const leftover = Math.max(0, expectedIncome - totalLimit)
        const overBy = Math.max(0, totalLimit - expectedIncome)
        const pieTotal = Math.max(expectedIncome, totalLimit)
        const data = [
          ...budgeted.map((c) => ({ label: c.name, value: c.limit, color: c.color })),
          ...(expectedIncome > 0 && leftover > 0
            ? [{ label: 'Left over (unassigned)', value: leftover, color: 'rgba(14,26,28,0.14)' }]
            : []),
        ]
        return (
          <div data-animation="fade-in-up" style={{ animationDelay: '40ms' }} className="rounded-[20px] bg-white p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-display text-xl">Your income, divided up</h3>
                <p className="text-xs text-[#3d4d50] mt-0.5 max-w-md leading-relaxed">
                  {expectedIncome > 0
                    ? `The whole circle is your ${fmt(expectedIncome)} monthly income — each sliver is what you've assigned to a category.`
                    : 'Add income sources above and each sliver will show its share of your paycheck.'}
                </p>
              </div>
              {expectedIncome > 0 && leftover > 0 && (
                <span className="rounded-full bg-[#eef6f7] px-3.5 py-1.5 text-[11px] font-semibold text-[#0f5257]">
                  {fmt(leftover)} unassigned
                </span>
              )}
            </div>
            {overBy > 0 && (
              <p className="mt-3 rounded-[12px] bg-[#c0564b]/10 text-[#c0564b] text-xs font-medium px-4 py-2.5">
                Your budget assigns {fmt(overBy)} more than you make — trim a category or raise an income source.
              </p>
            )}
            <div className="mt-5 grid sm:grid-cols-2 gap-6 items-center">
              <Donut data={data} total={pieTotal} centerLabel={expectedIncome > 0 ? 'income' : 'planned'} />
              <div className="space-y-2.5">
                {[...budgeted].sort((a, b) => b.limit - a.limit).map((c) => (
                  <div key={c.id} className="flex items-center gap-2.5 text-sm">
                    <span className="w-2.5 h-2.5 rounded-[4px] shrink-0" style={{ background: c.color }} />
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="font-mono-num text-xs text-[#3d4d50]">{Math.round((c.limit / pieTotal) * 100)}%</span>
                    <span className="font-mono-num text-xs w-16 text-right">{fmt(c.limit)}</span>
                  </div>
                ))}
                {expectedIncome > 0 && leftover > 0 && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <span className="w-2.5 h-2.5 rounded-[4px] shrink-0" style={{ background: 'rgba(14,26,28,0.14)' }} />
                    <span className="flex-1 truncate text-[#3d4d50]">Left over (unassigned)</span>
                    <span className="font-mono-num text-xs text-[#3d4d50]">{Math.round((leftover / pieTotal) * 100)}%</span>
                    <span className="font-mono-num text-xs w-16 text-right">{fmt(leftover)}</span>
                  </div>
                )}
              </div>
            </div>
            {expectedIncome > 0 && leftover > 0 && (
              <p className="mt-4 text-[11px] text-[#3d4d50] leading-relaxed">
                Tip: give every dollar a job — sweep the left-over sliver into a Goal at the end of the month.
              </p>
            )}
          </div>
        )
      })()}

      {/* Total budget banner */}
      <div data-animation="fade-in-up" className="rounded-[20px] bg-[#0e1a1c] text-[#ddedf0] p-5 sm:p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-[#9fc3c9]">Total monthly budget</div>
            <div className="font-display text-4xl tnum mt-1.5">{fmt(totalLimit)}</div>
          </div>
          <img src="./dragon.png" alt="" className="w-11 h-11 object-contain opacity-90 hidden sm:block" />
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-[0.14em] text-[#9fc3c9]">Spent so far</div>
            <div className="font-display text-2xl tnum mt-1.5">{fmt(spent)}</div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1">
            <SegBar pct={totalLimit ? spent / totalLimit : 0} color="#2a9aa2" segments={40} />
          </div>
          <span className="font-mono-num text-xs text-[#9fc3c9] shrink-0">
            {totalLimit ? `${Math.round((spent / totalLimit) * 100)}%` : '—'}
          </span>
        </div>
      </div>

      {(['fixed', 'flexible', 'nonmonthly'] as Bucket[]).map((bucket, bi) => {
        const cats = categories.filter((c) => c.bucket === bucket && c.id !== 'income')
        const bucketSpent = cats.reduce((s, c) => s + (byCategory[c.id] ?? 0), 0)
        const bucketLimit = cats.reduce((s, c) => s + c.limit, 0)
        const isOpen = open[bucket]
        return (
          <div
            key={bucket}
            data-animation="fade-in-up"
            style={{ animationDelay: `${bi * 80}ms` }}
            className="rounded-[20px] bg-white overflow-hidden"
          >
            <button
              onClick={() => setOpen((o) => ({ ...o, [bucket]: !o[bucket] }))}
              className="w-full px-5 sm:px-6 py-5 text-left"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm leading-none shrink-0 transition-colors ${isOpen ? 'bg-[#0f5257] text-[#ddedf0]' : 'bg-[#ddedf0] text-[#0f5257]'}`}>
                  {isOpen ? '—' : '+'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-lg leading-tight">{BUCKET_LABELS[bucket]}</div>
                  <div className="text-xs text-[#3d4d50] mt-0.5 truncate">{BUCKET_DESCRIPTIONS[bucket]}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono-num text-sm">{fmt(bucketSpent)} <span className="text-[#3d4d50]">/ {fmt(bucketLimit)}</span></div>
                  <div className="text-[11px] text-[#3d4d50] mt-0.5">
                    {bucketLimit ? `${Math.round((bucketSpent / bucketLimit) * 100)}% used` : 'no limits set'}
                  </div>
                </div>
              </div>
              <div className="mt-3 ml-10">
                <SegBar pct={bucketLimit ? bucketSpent / bucketLimit : 0} color={bucketLimit && bucketSpent > bucketLimit ? '#c0564b' : '#0f5257'} segments={30} />
              </div>
            </button>

            {isOpen && (
              <div className="px-5 sm:px-6 pb-6 space-y-5">
                {cats.map((c) => {
                  const value = byCategory[c.id] ?? 0
                  const pct = c.limit ? value / c.limit : 0
                  const isEditing = editing === c.id
                  return (
                    <div key={c.id}>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="p-1.5 rounded-full shrink-0" style={{ background: `${c.color}1a` }}>
                          <CategoryIcon icon={c.icon} color={c.color} size={14} />
                        </span>
                        <span className="text-sm font-medium flex-1 truncate">{c.name}</span>
                        {isEditing ? (
                          <span className="flex items-center gap-1.5">
                            <input
                              autoFocus type="number" min="0" value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && save(c.id)}
                              className="w-24 rounded-lg bg-[#ddedf0]/70 px-2.5 py-1.5 text-sm tnum outline-none focus:ring-2 ring-[#0f5257]"
                            />
                            <button onClick={() => save(c.id)} className="p-1.5 rounded-full bg-[#0f5257] text-white" aria-label="Save limit">
                              <Check size={13} />
                            </button>
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-sm shrink-0">
                            <span className={`font-mono-num ${pct > 1 ? 'text-[#c0564b] font-semibold' : ''}`}>
                              {fmt(value)}
                            </span>
                            <span className="text-[#3d4d50] font-mono-num text-xs">/ {fmt(c.limit)}</span>
                            <button
                              onClick={() => { setEditing(c.id); setDraft(String(c.limit)) }}
                              className="p-1.5 rounded-full hover:bg-[#ddedf0] text-[#3d4d50] transition-colors"
                              aria-label={`Edit ${c.name} limit`}
                            >
                              <Pencil size={12} />
                            </button>
                          </span>
                        )}
                      </div>
                      <SegBar pct={pct} color={c.color} />
                      {pct > 1 && (
                        <p className="mt-1.5 text-[11px] text-[#c0564b] font-medium">
                          {fmt(value - c.limit)} over — consider moving money from a quieter category.
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      <p data-animation="fade-in" className="text-xs text-[#3d4d50] px-2 flex items-center gap-1.5">
        <Plus size={12} /> Tip: unspent money does not roll over here by default — sweep it into a Goal at month end.
        <Minus size={12} className="hidden" />
      </p>
    </div>
  )
}
