import {
  Home, Zap, Shield, Repeat, ShoppingCart, UtensilsCrossed, Coffee, Car,
  ShoppingBag, Ticket, Heart, Plane, MoreHorizontal, Banknote, Baby, PiggyBank, type LucideIcon,
} from 'lucide-react'
import { fmt } from '@/lib/money'

const ICONS: Record<string, LucideIcon> = {
  home: Home, zap: Zap, shield: Shield, repeat: Repeat, cart: ShoppingCart,
  utensils: UtensilsCrossed, coffee: Coffee, car: Car, bag: ShoppingBag,
  ticket: Ticket, heart: Heart, plane: Plane, dots: MoreHorizontal, income: Banknote,
  baby: Baby, piggy: PiggyBank,
}

export function CategoryIcon({ icon, color, size = 16 }: { icon: string; color?: string; size?: number }) {
  const I = ICONS[icon] ?? MoreHorizontal
  return <I size={size} strokeWidth={2} style={{ color }} />
}

/** Segmented horizontal progress bar. Segments give it texture, not a solid fill. */
export function SegBar({ pct, color, segments = 24 }: { pct: number; color: string; segments?: number }) {
  const filled = Math.round(Math.min(pct, 1) * segments)
  const over = pct > 1
  return (
    <div className="flex gap-[3px] h-2" role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100}>
      {Array.from({ length: segments }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-full transition-colors duration-500"
          style={{
            backgroundColor: i < filled ? (over ? '#c0564b' : color) : 'rgba(14,26,28,0.08)',
            transitionDelay: `${i * 18}ms`,
          }}
        />
      ))}
    </div>
  )
}

/** Donut chart of spending by category. */
export function Donut({ data, total, centerLabel = 'spent' }: { data: { label: string; value: number; color: string }[]; total: number; centerLabel?: string }) {
  const R = 42, C = 2 * Math.PI * R
  // Offsets are computed up front: mutating an accumulator while mapping is a
  // side effect during render, which breaks under the React Compiler.
  const slices = data
    .filter((d) => d.value > 0)
    .reduce<{ label: string; color: string; value: number; frac: number; offset: number }[]>((acc, d) => {
      const frac = d.value / Math.max(total, 0.01)
      const offset = acc.length ? acc[acc.length - 1].offset + acc[acc.length - 1].frac : 0
      acc.push({ ...d, frac, offset })
      return acc
    }, [])
  return (
    <div className="relative w-full aspect-square max-w-[220px] mx-auto">
      <svg viewBox="0 0 100 100" className="w-full -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(14,26,28,0.07)" strokeWidth="11" />
        {slices.map((s) => {
          const dash = s.frac * C
          return (
            <circle
              key={s.label} cx="50" cy="50" r={R} fill="none"
              stroke={s.color} strokeWidth="11" strokeLinecap="butt"
              strokeDasharray={`${Math.max(dash - 0.8, 0.4)} ${C - dash + 0.8}`}
              strokeDashoffset={-s.offset * C}
            >
              <title>{s.label}: {fmt(s.value)}</title>
            </circle>
          )
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[10px] uppercase tracking-[0.14em] text-[#3d4d50]">{centerLabel}</div>
        <div className="font-display text-2xl tnum">{fmt(total)}</div>
      </div>
    </div>
  )
}

/** Monthly spending trend bars (6 months). */
export function TrendBars({ data }: { data: { label: string; spent: number; earned: number; current?: boolean }[] }) {
  const max = Math.max(...data.map((d) => Math.max(d.spent, d.earned)), 1)
  return (
    <div className="flex items-end gap-3 h-40">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
          <div className="flex items-end gap-1 h-full w-full justify-center">
            <div
              className="cl-bar w-3.5 rounded-t-[4px]"
              style={{
                height: `${(d.earned / max) * 100}%`,
                background: d.current ? '#1f7a4d' : 'rgba(31,122,77,0.3)',
              }}
            />
            <div
              className="cl-bar w-3.5 rounded-t-[4px]"
              style={{
                height: `${(d.spent / max) * 100}%`,
                background: d.current ? '#0f5257' : 'rgba(15,82,87,0.28)',
              }}
            />
          </div>
          <div className={`text-[10px] uppercase tracking-wider ${d.current ? 'font-semibold text-[#0e1a1c]' : 'text-[#3d4d50]'}`}>
            {d.label}
          </div>
        </div>
      ))}
    </div>
  )
}

export function StatCard({
  label, value, sub, tone = 'paper', delay = 0,
}: { label: string; value: string; sub?: string; tone?: 'paper' | 'ink' | 'mint' | 'clay' | 'moss'; delay?: number }) {
  const tones: Record<string, string> = {
    paper: 'bg-white text-[#0e1a1c]',
    mint: 'bg-[#c4dbe0] text-[#0e1a1c]',
    ink: 'bg-[#0e1a1c] text-[#ddedf0]',
    clay: 'bg-[#c0564b] text-white',
    moss: 'bg-[#1f7a4d] text-white',
  }
  const subTones: Record<string, string> = {
    paper: 'text-[#3d4d50]', mint: 'text-[#0f5257]', ink: 'text-[#9fc3c9]', clay: 'text-white/70', moss: 'text-white/70',
  }
  return (
    <div
      data-animation="fade-in-up"
      style={{ animationDelay: `${delay}ms` }}
      className={`rounded-[20px] p-5 ${tones[tone]}`}
    >
      <div className="text-[11px] uppercase tracking-[0.14em] opacity-70">{label}</div>
      <div className="font-display text-[2rem] leading-tight tnum mt-1">{value}</div>
      {sub && <div className={`text-xs mt-1 ${subTones[tone]}`}>{sub}</div>}
    </div>
  )
}
