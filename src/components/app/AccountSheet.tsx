import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { LogIn, LogOut, Users, Copy, Check, X, UploadCloud } from 'lucide-react'
import { useBudget } from '@/lib/store'
import { getAuthLog, getLastAuthError } from '@/lib/firebase'

const isIOSStandalone = () =>
  (/iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) &&
  ((typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true)

/** Account & sharing sheet — Google sign-in, household invite codes, local import. */
export function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { account, syncStatus, signInGoogle, signOut, createInvite, getMyInviteCode, joinInvite, leaveHousehold, importLocal, transactions } = useBudget()
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [imported, setImported] = useState(false)

  // Recover the household's invite code when the sheet opens (e.g. after app restart).
  useEffect(() => {
    if (open && account?.householdId && !code) {
      getMyInviteCode().then((c) => { if (c) setCode(c) }).catch(() => {})
    }
  }, [open, account?.householdId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label); setErr(null)
    try { await fn() } catch (e) {
      const c = (e as { code?: string; message?: string })
      if (c.message === 'redirecting' || c.message === 'cancelled') return
      const rulesHelp = `Your Firestore security rules are blocking this. In the Firebase console → Firestore → Rules, paste this and Publish:\n\nmatch /households/{id} { allow read, write: if request.auth != null; match /{doc=**} { allow read, write: if request.auth != null; } }\nmatch /invites/{code} { allow read, create, delete: if request.auth != null; }`
      setErr(
        (c.code === 'permission-denied' || c.message === 'permission-denied' || (c.message ?? '').includes('permission-denied') || (c.message ?? '').includes('Missing or insufficient permissions'))
          ? rulesHelp
          : c.code === 'auth/operation-not-allowed'
          ? 'Google sign-in is not enabled yet — turn on the Google provider in the Firebase console (Authentication → Sign-in method).'
          : c.code === 'auth/unauthorized-domain'
            ? 'This domain is not authorized in Firebase — add it under Authentication → Settings → Authorized domains.'
            : c.code === 'auth/account-exists-with-different-credential'
              ? 'That email is already linked to another sign-in method.'
            : c.message === 'bad-code'
              ? 'That code did not match any household. Check the letters and try again.'
            : c.message === 'expired-code'
              ? 'That code has expired (codes last 7 days) — ask for a fresh one.'
            : c.message === 'own-code'
              ? "That's your own household's code — share it with your partner instead."

              : `Sign-in failed (${c.code ?? c.message ?? 'unknown error'}). Tell me this code and I can pin it down.`
      )
    } finally { setBusy(null) }
  }

  const sheet = (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-[#0e1a1c]/45 backdrop-blur-[2px]" onClick={onClose} />
      <div
        data-animation="fade-in-up"
        className="relative w-full sm:max-w-md bg-[#f2f9fa] rounded-t-[24px] sm:rounded-[24px] shadow-2xl max-h-[85vh] overflow-y-auto cl-scroll"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#c4dbe0] mx-auto" />
        </div>
        <div className="px-5 pb-6 pt-2 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-2xl">Account & sharing</h3>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-[#ddedf0] transition-colors" aria-label="Close">
              <X size={16} />
            </button>
          </div>

          {/* Sign-in */}
          <div className="rounded-[16px] bg-white p-4">
            {account?.isGoogle ? (
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-full bg-[#0f5257]/10 text-[#0f5257]"><LogIn size={15} /></span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{account.email}</div>
                  <div className="text-[11px] text-[#3d4d50]">Signed in with Google · {syncStatus === 'synced' ? 'syncing to the cloud' : syncStatus}</div>
                </div>
                <button
                  onClick={() => run('out', signOut)}
                  disabled={busy !== null}
                  className="flex items-center gap-1.5 rounded-full border border-[#c4dbe0] px-3.5 py-1.5 text-xs font-medium text-[#3d4d50] hover:border-[#c0564b] hover:text-[#c0564b] transition-colors disabled:opacity-50"
                >
                  <LogOut size={12} /> Sign out
                </button>
              </div>
            ) : (
              <>
                <div className="text-sm font-medium">Sign in with Google</div>
                <p className="text-[11px] text-[#3d4d50] mt-1 leading-relaxed">
                  Right now this budget is tied to an anonymous session on this device. Sign in to attach it to your Google account — then you can share it.
                </p>
                <button
                  onClick={() => run('in', signInGoogle)}
                  disabled={busy !== null}
                  className="mt-3 flex items-center gap-2 rounded-full bg-[#0e1a1c] text-[#ddedf0] text-sm font-semibold px-5 py-2.5 hover:bg-[#0f5257] transition-colors disabled:opacity-50"
                >
                  <LogIn size={14} /> {busy === 'in' ? 'Signing in…' : 'Sign in with Google'}
                </button>
                {isIOSStandalone() && (
                  <p className="mt-3 rounded-[12px] bg-[#eef6f7] text-[#0f5257] text-[11px] font-medium px-3.5 py-2.5 leading-relaxed">
                    iPhone tip: if sign-in keeps asking again inside the installed app, open this site in <span className="font-semibold">Safari</span> instead and sign in there — Apple limits how installed apps receive the sign-in.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Household sharing — anyone can join with a code; creating needs Google */}
          {account && (
            <div className="rounded-[16px] bg-white p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-full bg-[#7a5aa8]/10 text-[#7a5aa8]"><Users size={15} /></span>
                <div className="text-sm font-medium">Share with your partner</div>
              </div>
              {account.householdId ? (
                <>
                  <p className="text-[11px] text-[#3d4d50] leading-relaxed">
                    You're sharing a household budget — both of you see and edit the same numbers.
                  </p>
                  {code ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono-num text-2xl tracking-[0.2em] font-semibold bg-[#eef6f7] rounded-[12px] px-4 py-2">{code}</span>
                      <button
                        onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
                        className="p-2 rounded-full hover:bg-[#ddedf0] transition-colors"
                        aria-label="Copy code"
                      >
                        {copied ? <Check size={15} className="text-[#1f7a4d]" /> : <Copy size={15} />}
                      </button>
                    </div>
                  ) : account.isGoogle ? (
                    <button
                      onClick={() => run('create', async () => setCode(await createInvite()))}
                      disabled={busy !== null}
                      className="rounded-full bg-[#0f5257] text-white text-xs font-semibold px-4 py-2 hover:bg-[#0e1a1c] transition-colors disabled:opacity-50"
                    >
                      {busy === 'create' ? 'Generating…' : 'Show invite code'}
                    </button>
                  ) : (
                    <p className="text-[11px] text-[#7a9aa0] leading-relaxed">Ask the household creator for the invite code.</p>
                  )}
                  <button
                    onClick={() => run('leave', leaveHousehold)}
                    disabled={busy !== null}
                    className="rounded-full border border-[#c4dbe0] px-3.5 py-1.5 text-xs font-medium text-[#3d4d50] hover:border-[#c0564b] hover:text-[#c0564b] transition-colors disabled:opacity-50"
                  >
                    Leave household
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[11px] text-[#3d4d50] leading-relaxed">
                    One of you creates an invite code; the other signs in on their device and joins with it. From then on you share one budget.
                  </p>
                  {code ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono-num text-2xl tracking-[0.2em] font-semibold bg-[#eef6f7] rounded-[12px] px-4 py-2">{code}</span>
                      <button
                        onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
                        className="p-2 rounded-full hover:bg-[#ddedf0] transition-colors"
                        aria-label="Copy code"
                      >
                        {copied ? <Check size={15} className="text-[#1f7a4d]" /> : <Copy size={15} />}
                      </button>
                    </div>
                  ) : !account.isGoogle ? (
                    <p className="text-[11px] text-[#7a9aa0] leading-relaxed">
                      To create a household, sign in with Google above. To join one your partner already created, enter their code below.
                    </p>
                  ) : (
                    <button
                      onClick={() => run('create', async () => setCode(await createInvite()))}
                      disabled={busy !== null}
                      className="rounded-full bg-[#0f5257] text-white text-xs font-semibold px-4 py-2 hover:bg-[#0e1a1c] transition-colors disabled:opacity-50"
                    >
                      {busy === 'create' ? 'Creating…' : 'Create invite code'}
                    </button>
                  )}
                  <div className="flex gap-2">
                    <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true" data-bwignore="true" data-form-type="other"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      maxLength={6}
                      className="flex-1 rounded-full bg-[#eef6f7] px-4 py-2 text-sm font-mono-num tracking-[0.15em] uppercase outline-none focus:ring-2 ring-[#0f5257] placeholder:normal-case placeholder:tracking-normal placeholder:text-[#7a9aa0]"
                    />
                    <button
                      onClick={() => run('join', () => joinInvite(joinCode))}
                      disabled={busy !== null || joinCode.trim().length < 6}
                      className="rounded-full bg-[#0e1a1c] text-[#ddedf0] text-xs font-semibold px-4 py-2 hover:bg-[#0f5257] transition-colors disabled:opacity-50"
                    >
                      {busy === 'join' ? 'Joining…' : 'Join'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Import this device's budget */}
          {account?.isGoogle && (
            <div className="rounded-[16px] bg-white p-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-full bg-[#b7791f]/10 text-[#b7791f]"><UploadCloud size={15} /></span>
                <div className="text-sm font-medium">Import this device's budget</div>
              </div>
              <p className="text-[11px] text-[#3d4d50] mt-2 leading-relaxed">
                Copies everything currently on this device ({transactions.length} transactions, income sources, limits, goals) into your signed-in account
                {account.householdId ? ' / household' : ''}. Use this on the tablet that already has your full setup.
              </p>
              <button
                onClick={() => run('import', async () => { await importLocal(); setImported(true) })}
                disabled={busy !== null}
                className="mt-3 rounded-full bg-[#0e1a1c] text-[#ddedf0] text-xs font-semibold px-4 py-2 hover:bg-[#0f5257] transition-colors disabled:opacity-50"
              >
                {busy === 'import' ? 'Importing…' : imported ? 'Imported ✓' : 'Import now'}
              </button>
            </div>
          )}

          {err && <p className="text-xs text-[#c0564b] font-medium leading-relaxed whitespace-pre-line">{err}</p>}

          {/* Troubleshooting — collapsed by default */}
          <details className="rounded-[16px] bg-white p-4">
            <summary className="text-xs font-semibold text-[#3d4d50] cursor-pointer select-none">Troubleshooting</summary>
            <TroubleshootingPanel />
          </details>
        </div>
      </div>
    </div>
  )
  return createPortal(sheet, document.body)
}

function TroubleshootingPanel() {
  const lastErr = getLastAuthError()
  const log = getAuthLog()
  const copyAll = () => {
    const text = `Last error: ${lastErr ?? 'none'}\n${log.join('\n')}`
    navigator.clipboard?.writeText(text).catch(() => {})
  }
  return (
    <div className="mt-3 space-y-2">
      {lastErr && <p className="text-[11px] text-[#c0564b] leading-relaxed">Last error: {lastErr}</p>}
      <div className="max-h-36 overflow-y-auto rounded-[10px] bg-[#0e1a1c] p-3 font-mono-num text-[10px] leading-relaxed text-[#9fc3c9]">
        {log.length === 0 ? 'No activity yet.' : log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
      <button onClick={copyAll} className="rounded-full bg-[#eef6f7] px-3.5 py-1.5 text-[11px] font-semibold text-[#0f5257] hover:bg-[#ddedf0] transition-colors">
        Copy diagnostics
      </button>
    </div>
  )
}
