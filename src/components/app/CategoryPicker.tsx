import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'
import { useBudget } from '@/lib/store'
import { CategoryIcon } from '@/components/app/ui'

/**
 * Category picker — trigger renders `children`; tapping opens a slide-up sheet
 * with a scrollable 4-column tile grid of categories.
 */
export function CategoryPicker({
  value,
  onChange,
  includeIncome = false,
  children,
  ariaLabel = 'Pick a category',
}: {
  value: string
  onChange: (categoryId: string) => void
  includeIncome?: boolean
  children: ReactNode
  ariaLabel?: string
}) {
  const { categories } = useBudget()
  const [open, setOpen] = useState(false)
  const cats = categories.filter((c) => includeIncome || c.id !== 'income')

  // Lock body scroll while the sheet is open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  const pick = (id: string) => { onChange(id); setOpen(false) }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={ariaLabel} className="text-left">
        {children}
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-[#0e1a1c]/45 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div
            data-animation="fade-in-up"
            className="relative w-full sm:max-w-md bg-[#f2f9fa] rounded-t-[24px] sm:rounded-[24px] shadow-2xl max-h-[72vh] flex flex-col"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="pt-3 pb-2 shrink-0">
              <div className="w-10 h-1 rounded-full bg-[#c4dbe0] mx-auto" />
              <h3 className="font-display text-lg text-center mt-2">Pick a category</h3>
            </div>
            <div className="overflow-y-auto cl-scroll px-4 pb-5">
              <div className="grid grid-cols-4 gap-2">
                {cats.map((c) => {
                  const active = c.id === value
                  return (
                    <button
                      key={c.id}
                      onClick={() => pick(c.id)}
                      className={`relative flex flex-col items-center gap-1.5 rounded-[16px] px-1 py-3 transition-colors ${
                        active ? 'bg-[#0e1a1c] text-[#ddedf0]' : 'bg-white hover:bg-[#ddedf0]/60'
                      }`}
                    >
                      <span
                        className="p-2 rounded-full"
                        style={{ background: `${c.color}1a` }}
                      >
                        <CategoryIcon icon={c.icon} color={c.color} size={16} />
                      </span>
                      <span className={`text-[10px] font-medium leading-tight text-center ${active ? '' : 'text-[#0e1a1c]'}`}>
                        {c.name}
                      </span>
                      {active && (
                        <span className="absolute top-1.5 right-1.5 text-[#2a9aa2]"><Check size={12} /></span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
