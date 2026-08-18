import { useMemo } from 'react'
import { ArrowDownLeft, ArrowUpRight, CalendarDays } from 'lucide-react'
import { useBudget, useMonthSpend } from '@/lib/store'
import { fmt, monthKey, monthLabel, shiftMonth } from '@/lib/money'
import { CategoryIcon, Donut, SegBar, StatCard, TrendBars } from '@/components/app/ui'
import type { View } from '@/components/app/Chrome'

export function Dashboard({ month, go }: { month: string; go: (v: View) => void }) {
  const { categories, transactions: allTxns, resetDemo } = useBudget()
  const isEmpty = allTxns.length === 0
  const { txns, spent, earned, byCategory } = useMonthSpend(month)
  const isCurrent = month === monthKey(new Date())

  const budgeted = categories.filter((c) => c.limit > 0)
  const totalLimit = budgeted.reduce((s, c) => s + c.limit, 0)
  const left = earned - spent

  // Daily pace for the current month
  const pace = useMemo(() => {
    if (!isCurrent || totalLimit === 0) return null
    const now = new Date()
    const daysIn = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const elapsed = now.getDate() / daysIn
    const used = spent / totalLimit
    return { elapsed, used, ahead: used <= elapsed }
  }, [isCurrent, spent, totalLimit])

  const donutData = budgeted
    .map((c) => ({ label: c.name, value: byCategory[c.id] ?? 0, color: c.color }))
    .sort((a, b) => b.value - a.value)

  const trend = useMemo(() => {
    const arr: { label: string; spent: number; earned: number; current: boolean }[] = []
    for (let i = 5; i >= 0; i--) {
      const key = shiftMonth(month, -i)
      const [y, m] = key.split('-').map(Number)
      arr.push({
        label: new Date(y, m - 1).toLocaleDateString('en-US', { month: 'short' }),
        spent: 0, earned: 0, current: key === month,
      })
    }
    return arr
  }, [month])

  const { transactions } = useBudget()
  const trendData = useMemo(() => {
    const copy = trend.map((t) => ({ ...t }))
    transactions.forEach((t) => {
      const key = monthKey(t.date)
      const idx = [5, 4, 3, 2, 1, 0].map((i) => shiftMonth(month, -i)).indexOf(key)
      if (idx >= 0) {
        if (t.amount > 0) copy[idx].spent += t.amount
        else copy[idx].earned += -t.amount
      }
    })
    return copy
  }, [transactions, month, trend])

  const overBudget = budgeted.filter((c) => (byCategory[c.id] ?? 0) > c.limit)
  const nearLimit = budgeted.filter((c) => {
    const v = (byCategory[c.id] ?? 0) / c.limit
    return v >= 0.85 && v <= 1
  })
  const recent = txns.slice(0, 6)

  if (isEmpty) {
    return (
      <div data-animation="fade-in-up" className="rounded-[20px] bg-white p-10 text-center max-w-xl mx-auto mt-8">
        <img src="./dragon.png" alt="Little Dragon" className="w-20 h-20 object-contain mx-auto" />
        <h2 className="font-display text-3xl mt-4">A clean slate</h2>
        <p className="text-sm text-[#3d4d50] leading-relaxed mt-3 max-w-sm mx-auto">
          No transactions yet. Add your first one with the <strong>+ button</strong> above,
          import a bank CSV from <strong>Transactions</strong>, or load the demo data to explore.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <button
            onClick={() => go('transactions')}
            className="rounded-full bg-[#0f5257] text-white font-semibold text-sm px-6 py-3 hover:bg-[#0e1a1c] transition-colors"
          >
            Start tracking
          </button>
          <button
            onClick={resetDemo}
            className="rounded-full bg-[#ddedf0] text-[#0e1a1c] font-semibold text-sm px-6 py-3 hover:bg-[#c4dbe0] transition-colors"
          >
            Load demo data
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={`Income · ${monthLabel(month).split(' ')[0]}`} value={fmt(earned)} sub={`${txns.filter((t) => t.amount < 0).length} deposits`} delay={0} />
        <StatCard label="Spent" value={fmt(spent)} sub={`${txns.filter((t) => t.amount > 0).length} transactions`} tone="ink" delay={60} />
        <StatCard
          label={left >= 0 ? 'Left to spend' : 'Over by'}
          value={fmt(Math.abs(left))}
          sub={left >= 0 ? 'of this month’s income' : 'past this month’s income'}
          tone={left >= 0 ? 'moss' : 'clay'}
          delay={120}
        />
        <StatCard
          label="Budget used"
          value={totalLimit ? `${Math.round((spent / totalLimit) * 100)}%` : '—'}
          sub={pace ? (pace.ahead ? `On pace — day ${Math.round(pace.elapsed * 100)}% of month` : 'Running ahead of pace') : `${fmt(totalLimit)} total limits`}
          tone="mint"
          delay={180}
        />
      </div>

      {/* Alerts strip */}
      {(overBudget.length > 0 || nearLimit.length > 0) && (
        <div data-animation="fade-in" className="rounded-[20px] bg-white px-5 py-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          {overBudget.map((c) => (
            <span key={c.id} className="flex items-center gap-2 text-[#c0564b] font-medium">
              <CategoryIcon icon={c.icon} color="#c0564b" size={14} />
              {c.name} is {fmt((byCategory[c.id] ?? 0) - c.limit)} over budget
            </span>
          ))}
          {nearLimit.map((c) => (
            <span key={c.id} className="flex items-center gap-2 text-[#b7791f] font-medium">
              <CategoryIcon icon={c.icon} color="#b7791f" size={14} />
              {c.name} is at {Math.round(((byCategory[c.id] ?? 0) / c.limit) * 100)}% of its limit
            </span>
          ))}
        </div>
      )}

      {/* Donut + trend */}
      <div className="grid lg:grid-cols-5 gap-4">
        <div data-animation="fade-in-up" style={{ animationDelay: '240ms' }} className="lg:col-span-2 rounded-[20px] bg-white p-6">
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-xl">Where it went</h3>
            <button onClick={() => go('budget')} className="text-xs text-[#0f5257] font-medium underline underline-offset-4 hover:text-[#0e1a1c]">
              adjust budgets
            </button>
          </div>
          <div className="mt-4">
            <Donut data={donutData} total={spent} />
          </div>
          <div className="mt-4 space-y-2.5">
            {donutData.slice(0, 5).map((d) => (
              <div key={d.label} className="flex items-center gap-2.5 text-sm">
                <span className="w-2.5 h-2.5 rounded-[4px]" style={{ background: d.color }} />
                <span className="flex-1 truncate">{d.label}</span>
                <span className="font-mono-num text-xs">{fmt(d.value)}</span>
              </div>
            ))}
          </div>
        </div>

        <div data-animation="fade-in-up" style={{ animationDelay: '300ms' }} className="lg:col-span-3 rounded-[20px] bg-white p-6 flex flex-col">
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-xl">Cash flow</h3>
            <div className="flex gap-4 text-[11px] text-[#3d4d50]">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#1f7a4d]" /> Income</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#0f5257]" /> Spending</span>
            </div>
          </div>
          <div className="mt-6 flex-1">
            <TrendBars data={trendData} />
          </div>
          {pace && (
            <div className="mt-6 pt-5 border-t border-[#ddedf0]">
              <div className="flex justify-between text-xs text-[#3d4d50] mb-2">
                <span>Month elapsed · {Math.round(pace.elapsed * 100)}%</span>
                <span>Budget used · {Math.round(pace.used * 100)}%</span>
              </div>
              <div className="relative">
                <SegBar pct={pace.used} color={pace.ahead ? '#0f5257' : '#c0564b'} />
                <div
                  className="absolute -top-1 w-[2px] h-4 bg-[#0e1a1c]"
                  style={{ left: `${pace.elapsed * 100}%` }}
                  title="Today"
                />
              </div>
              <p className="mt-2.5 text-xs text-[#3d4d50]">
                {pace.ahead
                  ? 'You are spending slower than the month is passing — keep it up.'
                  : 'Spending is ahead of the calendar. Ease off flexible categories to land on budget.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div data-animation="fade-in-up" style={{ animationDelay: '360ms' }} className="rounded-[20px] bg-white p-6">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="font-display text-xl">Recent activity</h3>
          <button onClick={() => go('transactions')} className="text-xs text-[#0f5257] font-medium underline underline-offset-4 hover:text-[#0e1a1c]">
            view all
          </button>
        </div>
        <div className="divide-y divide-[#eef6f7]">
          {recent.map((t) => {
            const cat = categories.find((c) => c.id === t.categoryId)
            const income = t.amount < 0
            return (
              <div key={t.id} className="flex items-center gap-3 py-3">
                <span className={`p-2 rounded-full ${income ? 'bg-[#1f7a4d]/10' : 'bg-[#ddedf0]'}`}>
                  {income ? <ArrowDownLeft size={15} className="text-[#1f7a4d]" /> : <ArrowUpRight size={15} style={{ color: cat?.color }} />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{t.merchant}</div>
                  <div className="text-[11px] text-[#3d4d50] flex items-center gap-1.5">
                    <CalendarDays size={11} />
                    {new Date(t.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    <span>·</span>{cat?.name ?? 'Uncategorized'}
                  </div>
                </div>
                <span className={`font-mono-num text-sm ${income ? 'text-[#1f7a4d]' : ''}`}>
                  {income ? '+' : '−'}{fmt(Math.abs(t.amount))}
                </span>
              </div>
            )
          })}
          {recent.length === 0 && (
            <p className="py-8 text-center text-sm text-[#3d4d50]">No transactions this month yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
