import { useEffect, useState } from 'react'
import { Plus, MoreVertical, Maximize, Minimize, CircleUserRound } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BudgetProvider } from '@/lib/store'
import { monthKey } from '@/lib/money'
import { MobileNav, MonthSwitcher, Sidebar, type View } from '@/components/app/Chrome'
import { AddTransaction } from '@/components/app/AddTransaction'
import { AccountSheet } from '@/components/app/AccountSheet'
import { DragonFlame } from '@/components/app/DragonFlame'
import { Dashboard } from '@/sections/Dashboard'
import { Budget } from '@/sections/Budget'
import { Transactions } from '@/sections/Transactions'
import { Insights } from '@/sections/Insights'
import { Goals } from '@/sections/Goals'

const TITLES: Record<View, string> = {
  dashboard: 'Overview',
  budget: 'Budget',
  transactions: 'Transactions',
  insights: 'Insights',
  goals: 'Goals',
}

function Shell() {
  const [view, setViewRaw] = useState<View>(() => {
    const h = location.hash.replace('#', '') as View
    return ['dashboard', 'budget', 'transactions', 'insights', 'goals'].includes(h) ? h : 'dashboard'
  })
  const setView = (v: View) => { setViewRaw(v); history.replaceState(null, '', `#${v}`) }
  const [month, setMonth] = useState(monthKey(new Date()))
  const [addOpen, setAddOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen()
  }

  return (
    <div className="min-h-screen p-4 md:p-6 md:pb-6" style={{ paddingBottom: 'calc(6.5rem + env(safe-area-inset-bottom))' }}>
      <div className="max-w-[1280px] mx-auto flex gap-6 items-start">
        <Sidebar view={view} setView={setView} onAdd={() => setAddOpen(true)} />

        <main className="flex-1 min-w-0">
          <header className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <DragonFlame size={40} className="md:hidden" />
              <h1 className="font-display text-3xl tracking-tight">{TITLES[view]}</h1>
            </div>
            <div className="flex items-center gap-2">
              {view !== 'goals' && <MonthSwitcher month={month} setMonth={setMonth} />}
              <button
                onClick={() => setAddOpen(true)}
                className="md:hidden p-2.5 rounded-full bg-[#0e1a1c] text-[#ddedf0]"
                aria-label="Add transaction"
              >
                <Plus size={18} />
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2.5 rounded-full hover:bg-[#c4dbe0] text-[#3d4d50] transition-colors"
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                aria-label="Toggle fullscreen"
              >
                {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-2.5 rounded-full hover:bg-[#c4dbe0] text-[#3d4d50] transition-colors"
                    aria-label="Data options"
                  >
                    <MoreVertical size={16} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-2xl">
                  <DropdownMenuItem onClick={() => setAccountOpen(true)} className="gap-2">
                    <CircleUserRound size={15} /> Account & sharing
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {view === 'dashboard' && <Dashboard month={month} go={setView} />}
          {view === 'budget' && <Budget month={month} />}
          {view === 'transactions' && <Transactions month={month} />}
          {view === 'insights' && <Insights month={month} />}
          {view === 'goals' && <Goals />}
        </main>
      </div>

      <MobileNav view={view} setView={setView} />
      <AddTransaction open={addOpen} onClose={() => setAddOpen(false)} />
      <AccountSheet open={accountOpen} onClose={() => setAccountOpen(false)} />
    </div>
  )
}

export default function Home() {
  return (
    <BudgetProvider>
      <Shell />
    </BudgetProvider>
  )
}
