import { useState } from 'react'
import { Minus, Plus, Check, Pencil } from 'lucide-react'
import { useBudget, useMonthSpend } from '@/lib/store'
import { fmt } from '@/lib/money'
import { CategoryIcon, SegBar } from '@/components/app/ui'
import { BUCKET_DESCRIPTIONS, BUCKET_LABELS, type Bucket } from '@/types'

/** Accordion-style bucket groups with editable per-category limits. */
export function Budget({ month }: { month: string }) {
  const { categories, setLimit } = useBudget()
  const { byCategory, spent } = useMonthSpend(month)
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
      <div data-animation="fade-in-up" className="rounded-[20px] bg-[#0e1a1c] text-[#ddedf0] p-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-[#9fc3c9]">Total monthly budget</div>
          <div className="font-display text-4xl tnum mt-1">{fmt(totalLimit)}</div>
        </div>
        <div className="text-right">
          <div className="text-[11px] uppercase tracking-[0.14em] text-[#9fc3c9]">Spent so far</div>
          <div className="font-display text-2xl tnum mt-1">{fmt(spent)}</div>
        </div>
        <div className="w-full">
          <SegBar pct={totalLimit ? spent / totalLimit : 0} color="#2a9aa2" segments={40} />
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
              className="w-full flex items-center gap-4 px-6 py-5 text-left"
            >
              <span className="text-lg leading-none text-[#0f5257] w-5">{isOpen ? '—' : '+'}</span>
              <div className="flex-1">
                <div className="font-display text-lg">{BUCKET_LABELS[bucket]}</div>
                <div className="text-xs text-[#3d4d50] mt-0.5">{BUCKET_DESCRIPTIONS[bucket]}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono-num text-sm">{fmt(bucketSpent)} <span className="text-[#3d4d50]">/ {fmt(bucketLimit)}</span></div>
                <div className="text-[11px] text-[#3d4d50] mt-0.5">
                  {bucketLimit ? `${Math.round((bucketSpent / bucketLimit) * 100)}% used` : 'no limits set'}
                </div>
              </div>
            </button>

            {isOpen && (
              <div className="px-6 pb-6 space-y-5">
                {cats.map((c) => {
                  const value = byCategory[c.id] ?? 0
                  const pct = c.limit ? value / c.limit : 0
                  const isEditing = editing === c.id
                  return (
                    <div key={c.id}>
                      <div className="flex items-center gap-3 mb-2">
                        <CategoryIcon icon={c.icon} color={c.color} />
                        <span className="text-sm font-medium flex-1">{c.name}</span>
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
                          <span className="flex items-center gap-2 text-sm">
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
