import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { TriangleAlert } from 'lucide-react'

export type ConfirmRequest = { title: string; body: string; onConfirm: () => void } | null

/** Small centered confirmation dialog — portals to body so transforms never clip it. */
export function ConfirmDialog({ request, onClose }: { request: ConfirmRequest; onClose: () => void }) {
  useEffect(() => {
    if (!request) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [request, onClose])

  if (!request) return null
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[#0e1a1c]/45 backdrop-blur-[2px]" onClick={onClose} />
      <div
        data-animation="fade-in-up"
        className="relative w-full max-w-xs bg-[#f2f9fa] rounded-[24px] shadow-2xl p-5 text-center"
      >
        <div className="mx-auto w-11 h-11 rounded-full bg-[#f6e3df] text-[#c0564b] flex items-center justify-center">
          <TriangleAlert size={20} />
        </div>
        <h3 className="mt-3 text-[15px] font-bold text-[#16323a]">{request.title}</h3>
        <p className="mt-1 text-xs text-[#3d4d50] leading-relaxed">{request.body}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={onClose}
            className="py-2.5 rounded-2xl bg-[#ddedf0] text-[#16323a] text-sm font-semibold hover:bg-[#cfe3e7] transition-colors"
          >
            Keep it
          </button>
          <button
            onClick={() => { request.onConfirm(); onClose() }}
            className="py-2.5 rounded-2xl bg-[#c0564b] text-white text-sm font-semibold hover:bg-[#a94a40] transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

/** Tiny hook: const [confirm, askConfirm] = useConfirm(); askConfirm({...}) */
export function useConfirm(): [ConfirmRequest, (r: ConfirmRequest) => void, () => void] {
  const [req, setReq] = useState<ConfirmRequest>(null)
  return [req, setReq, () => setReq(null)]
}
