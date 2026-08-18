import { useMemo } from 'react'
import { Repeat, TrendingDown, TrendingUp, Store, Lightbulb } from 'lucide-react'
import { useBudget, useMonthSpend } from '@/lib/store'
import { fmt, monthKey, shiftMonth } from '@/lib/money'
import { CategoryIcon, SegBar } from '@/components/app/ui'

export function Insights({ month }: { month: string }) {
  const { transactions, categories } = useBudget()
  const { txns, spent, byCategory } = useMonthSpend(month)
  const prev = useMonthSpend(shiftMonth(month, -1))

  const topMerchants = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>()
    txns.filter((t) => t.amount > 0).forEach((t) => {
      const m = map.get(t.merchant) ?? { total: 0, count: 0 }
      m.total += t.amount; m.count++
      map.set(t.merchant, m)
    })
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 6)
  }, [txns])
  const maxMerchant = topMerchants[0]?.[1].total ?? 1

  const recurring = useMemo(() => {
    const map = new Map<string, number>()
    transactions.filter((t) => t.recurring && t.amount > 0).forEach((t) => {
      if (map.has(t.merchant)) return
      const lastThree = [0, 1, 2].some((i) =>
        transactions.some((o) => o.merchant === t.merchant && monthKey(o.date) === shiftMonth(month, -i)))
      if (lastThree) map.set(t.merchant, t.amount)
    })
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [transactions, month])
  const recurringTotal = recurring.reduce((s, [, v]) => s + v, 0)

  // Biggest category movers vs previous month
  const movers = useMemo(() => {
    return categories
      .filter((c) => c.id !== 'income')
      .map((c) => ({ c, now: byCategory[c.id] ?? 0, before: prev.byCategory[c.id] ?? 0 }))
      .filter((m) => m.now > 20 || m.before > 20)
      .map((m) => ({ ...m, delta: m.now - m.before, pct: m.before ? (m.now - m.before) / m.before : 1 }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 4)
  }, [categories, byCategory, prev.byCategory])

  const tips = useMemo(() => {
    const out: string[] = []
    if (recurringTotal > 0) out.push(`Recurring charges total ${fmt(recurringTotal)} this month — about ${fmt(recurringTotal * 12)} a year. Worth a yearly audit.`)
    const coffeeCat = byCategory['coffee'] ?? 0
    if (coffeeCat > 60) out.push(`Coffee is at ${fmt(coffeeCat)}. Brewing at home two days a week would save roughly ${fmt(coffeeCat * 0.4)} a month.`)
    const dining = byCategory['dining'] ?? 0
    const groceries = byCategory['groceries'] ?? 0
    if (dining > groceries * 0.6 && dining > 100) out.push(`Dining out (${fmt(dining)}) is closing in on groceries (${fmt(groceries)}). One swapped meal a week ≈ ${fmt(dining * 0.2)} saved.`)
    if (prev.spent > 0) {
      const d = (spent - prev.spent) / prev.spent
      out.push(d > 0.05
        ? `Spending is up ${Math.round(d * 100)}% versus last month.`
        : d < -0.05
          ? `Spending is down ${Math.round(-d * 100)}% versus last month — nice.`
          : 'Spending is roughly flat versus last month.')
    }
    return out.slice(0, 4)
  }, [byCategory, recurringTotal, spent, prev.spent])

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {/* Top merchants */}
      <div data-animation="fade-in-up" className="rounded-[20px] bg-white p-6">
        <h3 className="font-display text-xl flex items-center gap-2"><Store size={18} className="text-[#0f5257]" /> Top merchants</h3>
        <div className="mt-5 space-y-4">
          {topMerchants.map(([name, m], i) => (
            <div key={name}>
              <div className="flex items-baseline justify-between text-sm mb-1.5">
                <span className="font-medium truncate">
                  <span className="font-mono-num text-[11px] text-[#3d4d50] mr-2">{String(i + 1).padStart(2, '0')}</span>
                  {name}
                </span>
                <span className="font-mono-num text-xs shrink-0">{fmt(m.total)} <span className="text-[#3d4d50]">· {m.count}×</span></span>
              </div>
              <SegBar pct={m.total / maxMerchant} color="#0f5257" />
            </div>
          ))}
          {topMerchants.length === 0 && <p className="text-sm text-[#3d4d50]">No spending recorded this month.</p>}
        </div>
      </div>

      {/* Recurring / subscriptions */}
      <div data-animation="fade-in-up" style={{ animationDelay: '80ms' }} className="rounded-[20px] bg-white p-6">
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-xl flex items-center gap-2"><Repeat size={18} className="text-[#0f5257]" /> Recurring charges</h3>
          <span className="font-mono-num text-sm">{fmt(recurringTotal)}/mo</span>
        </div>
        <div className="mt-5 divide-y divide-[#eef6f7]">
          {recurring.map(([name, amt]) => (
            <div key={name} className="flex items-center justify-between py-3 text-sm">
              <span className="font-medium">{name}</span>
              <span className="font-mono-num text-xs">{fmt(amt)}</span>
            </div>
          ))}
          {recurring.length === 0 && <p className="py-6 text-sm text-[#3d4d50]">No recurring charges detected.</p>}
        </div>
        <p className="mt-4 text-[11px] text-[#3d4d50] leading-relaxed">
          Detected from charges that repeat month over month. Cancel one and it disappears here next month.
        </p>
      </div>

      {/* Movers */}
      <div data-animation="fade-in-up" style={{ animationDelay: '160ms' }} className="rounded-[20px] bg-white p-6">
        <h3 className="font-display text-xl">Vs. last month</h3>
        <div className="mt-5 space-y-3">
          {movers.map((m) => (
            <div key={m.c.id} className="flex items-center gap-3">
              <CategoryIcon icon={m.c.icon} color={m.c.color} />
              <span className="text-sm font-medium flex-1">{m.c.name}</span>
              <span className={`flex items-center gap-1 font-mono-num text-xs ${m.delta > 0 ? 'text-[#c0564b]' : 'text-[#1f7a4d]'}`}>
                {m.delta > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {m.delta > 0 ? '+' : ''}{fmt(m.delta)}
              </span>
            </div>
          ))}
          {movers.length === 0 && <p className="text-sm text-[#3d4d50]">Not enough data to compare yet.</p>}
        </div>
      </div>

      {/* Tips */}
      <div data-animation="fade-in-up" style={{ animationDelay: '240ms' }} className="rounded-[20px] bg-[#c4dbe0] p-6">
        <h3 className="font-display text-xl flex items-center gap-2"><Lightbulb size={18} className="text-[#0f5257]" /> Clover noticed</h3>
        <ul className="mt-5 space-y-3.5">
          {tips.map((t) => (
            <li key={t} className="flex gap-3 text-sm leading-relaxed">
              <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[#0f5257] shrink-0" />
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
