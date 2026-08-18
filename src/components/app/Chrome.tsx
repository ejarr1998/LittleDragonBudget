import { LayoutDashboard, Wallet, ArrowLeftRight, Sparkles, Target, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { monthLabel, shiftMonth, monthKey } from '@/lib/money'

export type View = 'dashboard' | 'budget' | 'transactions' | 'insights' | 'goals'

const NAV: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'budget', label: 'Budget', icon: Wallet },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'insights', label: 'Insights', icon: Sparkles },
  { id: 'goals', label: 'Goals', icon: Target },
]

export function Sidebar({ view, setView, onAdd }: { view: View; setView: (v: View) => void; onAdd: () => void }) {
  return (
    <aside className="hidden md:flex w-[240px] shrink-0 flex-col bg-[#0e1a1c] text-[#ddedf0] rounded-[20px] p-5 sticky top-6 h-[calc(100vh-3rem)]">
      <div className="flex items-center gap-2.5 px-1">
        <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
          <circle cx="9" cy="9" r="6.5" fill="#2a9aa2" />
          <circle cx="17" cy="9" r="6.5" fill="#2a9aa2" opacity="0.55" />
          <circle cx="9" cy="17" r="6.5" fill="#2a9aa2" opacity="0.55" />
          <circle cx="17" cy="17" r="6.5" fill="#c4dbe0" />
        </svg>
        <span className="font-display text-xl tracking-tight">Clover</span>
      </div>

      <nav className="mt-8 flex flex-col gap-1">
        {NAV.map((n) => {
          const active = view === n.id
          return (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-sm transition-colors duration-300 ${
                active ? 'bg-[#c4dbe0] text-[#0e1a1c] font-semibold' : 'text-[#9fc3c9] hover:text-[#ddedf0]'
              }`}
            >
              <n.icon size={17} strokeWidth={2.2} />
              {n.label}
            </button>
          )
        })}
      </nav>

      <button
        onClick={onAdd}
        className="mt-auto flex items-center justify-center gap-2 rounded-full bg-[#c4dbe0] text-[#0e1a1c] font-semibold text-sm px-4 py-3 hover:bg-[#ddedf0] transition-colors duration-300"
      >
        <Plus size={16} strokeWidth={2.5} /> Add transaction
      </button>
      <p className="mt-4 px-1 text-[10px] leading-relaxed text-[#5f7d82]">
        Data stays in this browser. Import a bank CSV from Transactions.
      </p>
    </aside>
  )
}

export function MobileNav({ view, setView }: { view: View; setView: (v: View) => void }) {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0e1a1c] flex justify-around px-2 py-2 rounded-t-[20px]">
      {NAV.map((n) => (
        <button
          key={n.id}
          onClick={() => setView(n.id)}
          className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-full text-[10px] ${
            view === n.id ? 'text-[#c4dbe0]' : 'text-[#5f7d82]'
          }`}
        >
          <n.icon size={18} strokeWidth={2.2} />
          {n.label}
        </button>
      ))}
    </nav>
  )
}

export function MonthSwitcher({ month, setMonth }: { month: string; setMonth: (m: string) => void }) {
  const isCurrent = month === monthKey(new Date())
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setMonth(shiftMonth(month, -1))}
        className="p-2 rounded-full hover:bg-[#c4dbe0] transition-colors"
        aria-label="Previous month"
      >
        <ChevronLeft size={18} />
      </button>
      <span className="font-display text-lg min-w-[150px] text-center">{monthLabel(month)}</span>
      <button
        onClick={() => setMonth(shiftMonth(month, 1))}
        disabled={isCurrent}
        className="p-2 rounded-full hover:bg-[#c4dbe0] transition-colors disabled:opacity-30"
        aria-label="Next month"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
