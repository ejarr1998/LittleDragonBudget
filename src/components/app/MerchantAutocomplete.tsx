import { useMemo, useRef, useState } from 'react'
import { useBudget } from '@/lib/store'
import { suggestPurchases, type Suggestion } from '@/lib/suggest'
import { CategoryIcon } from '@/components/app/ui'

/**
 * Merchant input with an autocomplete dropdown of common purchases.
 * Picking a suggestion fills the merchant and (via onPick) its category.
 */
export function MerchantAutocomplete({
  value,
  onChange,
  onPick,
  onEnter,
  placeholder = "Merchant — e.g. Trader Joe's",
  className = '',
  inputClassName = 'rounded-full bg-[#eef6f7] px-4 py-2.5 text-sm',
}: {
  value: string
  onChange: (v: string) => void
  onPick: (merchant: string, categoryId: string) => void
  onEnter?: () => void
  placeholder?: string
  className?: string
  inputClassName?: string
}) {
  const { transactions, categories } = useBudget()
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Unique merchants from the user's own history, newest first, with their category
  const history = useMemo(() => {
    const seen = new Map<string, string>()
    for (const t of transactions) {
      const k = t.merchant.toLowerCase()
      if (!seen.has(k)) seen.set(k, t.categoryId)
    }
    return [...seen.keys()]
  }, [transactions])

  const suggestions: Suggestion[] = useMemo(() => {
    if (!open) return []
    return suggestPurchases(value, history).map((s) =>
      s.categoryId ? s : { ...s, categoryId: categories.find((c) => c.id === historyCat(s.label))?.id ?? '' }
    )
    function historyCat(label: string) {
      const t = transactions.find((x) => x.merchant.toLowerCase() === label.toLowerCase())
      return t?.categoryId
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, open, history, transactions])

  const catOf = (id: string) => categories.find((c) => c.id === id)

  const pick = (s: Suggestion) => {
    onPick(s.label, s.categoryId)
    setOpen(false)
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <input
        autoComplete="off"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setHighlight(0) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => { if (!wrapRef.current?.contains(document.activeElement)) setOpen(false) }, 120)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => Math.min(h + 1, suggestions.length - 1)) }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)) }
          else if (e.key === 'Enter') {
            if (open && suggestions[highlight]) pick(suggestions[highlight])
            else onEnter?.()
          } else if (e.key === 'Escape') setOpen(false)
        }}
        placeholder={placeholder}
        className={`w-full outline-none focus:ring-2 ring-[#0f5257] placeholder:text-[#7a9aa0] ${inputClassName}`}
      />
      {open && suggestions.length > 0 && (
        <div
          className="absolute z-30 top-full mt-1.5 rounded-[16px] bg-white shadow-xl ring-1 ring-[#0e1a1c]/8 overflow-y-auto cl-scroll max-h-[264px]"
          style={{ left: 0, minWidth: 'min(320px, 78vw)', width: 'max(100%, 260px)' }}
        >
          {suggestions.map((s, i) => {
            const cat = catOf(s.categoryId)
            return (
              <button
                key={s.label}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
                onMouseEnter={() => setHighlight(i)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-left transition-colors ${i === highlight ? 'bg-[#eef6f7]' : ''}`}
              >
                {cat && (
                  <span className="p-1.5 rounded-full shrink-0" style={{ background: `${cat.color}1a` }}>
                    <CategoryIcon icon={cat.icon} color={cat.color} size={12} />
                  </span>
                )}
                <span className="flex-1 text-sm font-medium truncate">{s.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
