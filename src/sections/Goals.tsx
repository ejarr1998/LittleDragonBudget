import { useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { useBudget } from '@/lib/store'
import { fmt } from '@/lib/money'
import { SegBar } from '@/components/app/ui'

export function Goals() {
  const { goals, addGoal, contribute, deleteGoal } = useBudget()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [contribFor, setContribFor] = useState<string | null>(null)
  const [contribAmt, setContribAmt] = useState('')

  const totalSaved = goals.reduce((s, g) => s + g.saved, 0)
  const totalTarget = goals.reduce((s, g) => s + g.target, 0)

  const submitGoal = () => {
    const t = parseFloat(target)
    if (!name.trim() || !(t > 0)) return
    addGoal({ name: name.trim(), target: t, saved: 0, color: ['#0f5257', '#b7791f', '#7a5aa8', '#1f7a4d', '#c0564b'][goals.length % 5] })
    setName(''); setTarget(''); setAdding(false)
  }

  const submitContrib = (id: string, sign: 1 | -1) => {
    const v = parseFloat(contribAmt)
    if (!(v > 0)) return
    contribute(id, sign * v)
    setContribFor(null); setContribAmt('')
  }

  return (
    <div className="space-y-4">
      <div data-animation="fade-in-up" className="rounded-[20px] bg-white p-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.14em] text-[#3d4d50]">Saved toward goals</div>
          <div className="font-display text-4xl tnum mt-1">{fmt(totalSaved)} <span className="text-lg text-[#3d4d50]">of {fmt(totalTarget)}</span></div>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 rounded-full bg-[#0e1a1c] text-[#ddedf0] font-semibold text-sm px-5 py-3 hover:bg-[#0f5257] transition-colors"
        >
          <Plus size={16} /> New goal
        </button>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {goals.map((g, i) => {
          const pct = g.target ? g.saved / g.target : 0
          const done = g.saved >= g.target
          return (
            <div
              key={g.id}
              data-animation="fade-in-up"
              style={{ animationDelay: `${i * 70}ms` }}
              className={`rounded-[20px] p-6 ${done ? 'bg-[#1f7a4d] text-white' : 'bg-white'}`}
            >
              <div className="flex items-start justify-between">
                <h3 className="font-display text-xl">{g.name}</h3>
                <button onClick={() => deleteGoal(g.id)} className={`p-1.5 rounded-full transition-colors ${done ? 'hover:bg-white/20' : 'hover:bg-[#ddedf0] text-[#3d4d50]'}`} aria-label={`Delete ${g.name}`}>
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="font-display text-3xl tnum mt-3">{fmt(g.saved)}</div>
              <div className={`text-xs mt-0.5 ${done ? 'text-white/75' : 'text-[#3d4d50]'}`}>
                {done ? 'Fully funded — enjoy it.' : `${fmt(g.target - g.saved)} to go · ${Math.round(pct * 100)}%`}
              </div>
              <div className="mt-4">
                <SegBar pct={pct} color={done ? '#ffffff' : g.color} segments={18} />
              </div>
              {contribFor === g.id ? (
                <div className="mt-4 flex items-center gap-1.5">
                  <input autoComplete="off"
                    autoFocus type="number" min="0" value={contribAmt}
                    onChange={(e) => setContribAmt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitContrib(g.id, 1)}
                    placeholder="Amount"
                    className="w-full rounded-lg bg-[#ddedf0]/70 px-3 py-2 text-sm tnum outline-none focus:ring-2 ring-[#0f5257] text-[#0e1a1c]"
                  />
                  <button onClick={() => submitContrib(g.id, 1)} className="shrink-0 rounded-full bg-[#0f5257] text-white text-xs font-semibold px-3 py-2">Add</button>
                  <button onClick={() => submitContrib(g.id, -1)} className="shrink-0 rounded-full bg-[#ddedf0] text-[#0e1a1c] text-xs font-semibold px-3 py-2">Withdraw</button>
                  <button onClick={() => { setContribFor(null); setContribAmt('') }} className="p-1.5" aria-label="Cancel"><X size={14} /></button>
                </div>
              ) : (
                !done && (
                  <button
                    onClick={() => setContribFor(g.id)}
                    className="mt-4 text-xs font-semibold text-[#0f5257] underline underline-offset-4 hover:text-[#0e1a1c]"
                  >
                    add money
                  </button>
                )
              )}
            </div>
          )
        })}

        {adding && (
          <div data-animation="fade-in" className="rounded-[20px] bg-white p-6 border-2 border-dashed border-[#2a9aa2]">
            <h3 className="font-display text-xl">New goal</h3>
            <input autoComplete="off"
              autoFocus value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. House deposit"
              className="mt-4 w-full rounded-[14px] bg-[#ddedf0]/60 px-4 py-3 text-sm outline-none focus:ring-2 ring-[#0f5257]"
            />
            <input autoComplete="off"
              type="number" min="0" value={target} onChange={(e) => setTarget(e.target.value)}
              placeholder="Target amount"
              className="mt-2.5 w-full rounded-[14px] bg-[#ddedf0]/60 px-4 py-3 text-sm tnum outline-none focus:ring-2 ring-[#0f5257]"
            />
            <div className="mt-4 flex gap-2">
              <button onClick={submitGoal} className="flex-1 rounded-full bg-[#0f5257] text-white font-semibold text-sm py-2.5 hover:bg-[#0e1a1c] transition-colors">Create</button>
              <button onClick={() => setAdding(false)} className="rounded-full bg-[#ddedf0] text-sm font-medium px-5">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
