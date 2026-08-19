import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { LogIn, LogOut, Users, Copy, Check, X, UploadCloud, Download, FileUp } from 'lucide-react'
import { useBudget } from '@/lib/store'
import { getLastAuthError, getAuthLog, getRedirectPatchStatus } from '@/lib/firebase'
import { exportBackup, readBackup } from '@/lib/backup'

/** Account & sharing sheet — Google sign-in, household invite codes, local import. */
export function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    account, syncStatus, signInGoogle, signOut, createInvite, joinInvite, leaveHousehold,
    importLocal, restoreBackup, transactions, categories, goals, incomes, monthlyIncome,
  } = useBudget()
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [imported, setImported] = useState(false)
  const [authDebug, setAuthDebug] = useState<string | null>(() => getLastAuthError())

  const [authLog, setAuthLog] = useState<string[]>([])
  const isInstalledApp =
    (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches) ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true

  const [handoffBlocked, setHandoffBlocked] = useState(false)

  // Refresh diagnostics every time the sheet opens
  useEffect(() => {
    if (open) {
      const err = getLastAuthError()
      setAuthDebug(err)
      setAuthLog(getAuthLog())
      setHandoffBlocked(!!err && (err.includes('handoff-blocked') || err.includes('missing-redirect-event')))
    }
  }, [open])

  if (!open) return null

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label); setErr(null)
    try { await fn() } catch (e) {
      const c = (e as { code?: string; message?: string })
      if (c.message === 'redirecting' || c.message === 'cancelled') return
      setErr(
        c.code === 'auth/operation-not-allowed'
          ? 'Google sign-in is not enabled yet — turn on the Google provider in the Firebase console (Authentication → Sign-in method).'
          : c.code === 'auth/unauthorized-domain'
            ? 'This domain is not authorized in Firebase — add it under Authentication → Settings → Authorized domains.'
            : c.code === 'auth/account-exists-with-different-credential'
              ? 'That email is already linked to another sign-in method.'
            : c.message === 'bad-code'
              ? 'That code did not match any household, or it has already been used. Ask for a fresh one.'
            : c.message === 'expired-code'
              ? 'That invite code has expired. Invite codes last 7 days — generate a new one.'
            : /database is closing/i.test(c.message ?? '')
              ? "Sign-in almost completed but the browser closed its storage mid-handoff. This is usually a one-off — tap Sign in again."
              : `Sign-in failed (${c.code ?? c.message ?? 'unknown error'}). Tell me this code and I can pin it down.`
      )
    } finally { setBusy(null); setAuthDebug(getLastAuthError()) }
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
                {handoffBlocked && (
                  <div className="mt-3 rounded-[12px] bg-[#fdf3e7] border border-[#ecd9b8] p-3">
                    <p className="text-[11px] font-semibold text-[#8a6d1a]">Sign-in didn't come back</p>
                    <p className="text-[11px] text-[#6b5716] mt-1 leading-relaxed">
                      Google finished, but the result never reached the app. Try these in order:
                    </p>
                    <ol className="text-[11px] text-[#6b5716] mt-1.5 ml-4 list-decimal space-y-1 leading-relaxed">
                      <li>Tap <b>Sign in</b> again — a popup window should appear over the app now. If it does, this is fixed.</li>
                      <li>Open the site in <b>Chrome itself</b> rather than the installed app, sign in there, then reopen the app.</li>
                      <li>Still stuck? Sign in on a computer, tap <b>Create invite code</b> there, and use <b>Join with a code</b> here.</li>
                    </ol>
                    <p className="text-[11px] text-[#6b5716] mt-1.5 leading-relaxed">
                      Third-party cookie settings are not the cause; you can leave those alone.
                    </p>
                  </div>
                )}
                {isInstalledApp && !handoffBlocked && (
                  <div className="mt-3 rounded-[12px] bg-[#eef6f7] p-3">
                    <p className="text-[11px] text-[#3d4d50] leading-relaxed">
                      You're in the installed app. If sign-in keeps bouncing you back here, your browser may be swallowing the result. Try opening the site in your normal browser, sign in there, then join this device with an invite code.
                    </p>
                    <button
                      onClick={() => { navigator.clipboard?.writeText('https://ejarr1998.github.io/LittleDragonBudget/'); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
                      className="mt-2 flex items-center gap-1.5 rounded-full border border-[#c4dbe0] px-3.5 py-1.5 text-xs font-medium text-[#3d4d50] hover:border-[#0f5257] transition-colors"
                    >
                      {copied ? <Check size={12} className="text-[#1f7a4d]" /> : <Copy size={12} />} {copied ? 'Link copied' : 'Copy site link'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sign-in status & diagnostics — always visible so we can see what's happening */}
          <div className={`rounded-[16px] border p-3.5 ${authDebug ? 'bg-[#fdf3e7] border-[#ecd9b8]' : 'bg-white border-[#e2eef1]'}`}>
            <div className={`text-[11px] font-semibold ${authDebug ? 'text-[#8a6d1a]' : 'text-[#3d4d50]'}`}>
              Sign-in status: {account?.isGoogle ? `signed in as ${account.email}` : account ? 'anonymous session (not signed in)' : 'starting…'} · {syncStatus}
            </div>
            {authDebug && (
              <p className="text-[11px] text-[#8a3c33] mt-1 leading-relaxed break-words font-mono-num">Error: {authDebug}</p>
            )}
            {authLog.length > 0 && (
              <div className="mt-1.5 space-y-0.5">
                {authLog.map((l, i) => (
                  <p key={i} className="text-[10px] text-[#5b7076] leading-snug break-words font-mono-num">{l}</p>
                ))}
              </div>
            )}
            <p className="text-[10px] text-[#7a9aa0] mt-1 leading-snug font-mono-num">
              mode: {isInstalledApp ? 'installed app' : 'browser'} · redirect patch: {getRedirectPatchStatus()}
            </p>
            <p className={`text-[10px] mt-1.5 leading-relaxed ${authDebug ? 'text-[#6b5716]' : 'text-[#7a9aa0]'}`}>
              If sign-in isn't sticking, send me a screenshot of this box — it records exactly what happened.
            </p>
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
                    Invite code: <span className="font-mono-num font-semibold text-[#0e1a1c]">{code ?? 'ask the household creator'}</span>
                  </p>
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

          {/* Backup & restore — works signed in or not, and never leaves the device */}
          <div className="rounded-[16px] bg-white p-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-full bg-[#0f5257]/10 text-[#0f5257]"><Download size={15} /></span>
              <div className="text-sm font-medium">Backup &amp; restore</div>
            </div>
            <p className="text-[11px] text-[#3d4d50] mt-2 leading-relaxed">
              Saves everything ({transactions.length} transactions, limits, income, goals) to a JSON file you keep.
              Worth doing before any big import.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  exportBackup({ transactions, categories, goals, incomes, monthlyIncome })
                  setRestoreMsg('Backup downloaded.')
                }}
                className="flex items-center gap-1.5 rounded-full bg-[#0e1a1c] text-[#ddedf0] text-xs font-semibold px-4 py-2 hover:bg-[#0f5257] transition-colors"
              >
                <Download size={13} /> Download backup
              </button>
              <label className="flex items-center gap-1.5 rounded-full border border-[#c4dbe0] px-4 py-2 text-xs font-medium text-[#3d4d50] hover:border-[#0f5257] transition-colors cursor-pointer">
                <FileUp size={13} /> Restore from file
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    if (!f) return
                    try {
                      const restored = await readBackup(f)
                      restoreBackup(restored)
                      setRestoreMsg(`Restored ${restored.transactions.length} transactions from that backup.`)
                    } catch (ex) {
                      setRestoreMsg((ex as Error).message)
                    }
                  }}
                />
              </label>
            </div>
            {restoreMsg && <p className="text-[11px] text-[#3d4d50] mt-2 leading-relaxed">{restoreMsg}</p>}
            <p className="text-[11px] text-[#8a6d1a] mt-2 leading-relaxed">
              Restoring replaces everything currently in the app{account?.householdId ? ' and in your household' : ''}.
            </p>
          </div>

          {err && <p className="text-xs text-[#c0564b] font-medium leading-relaxed">{err}</p>}
        </div>
      </div>
    </div>
  )
  return createPortal(sheet, document.body)
}
