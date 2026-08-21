import type { Category, Transaction } from '@/types'

export const fmt = (n: number, opts?: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: Math.abs(n) % 1 < 0.005 ? 0 : 2,
    ...opts,
  }).format(n)

export const fmtSigned = (n: number) => (n < 0 ? `+${fmt(-n)}` : `−${fmt(n)}`)

export const monthKey = (d: string | Date) => {
  const dt = typeof d === 'string' ? new Date(d + 'T00:00:00') : d
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
}

export const monthLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export const shiftMonth = (key: string, delta: number) => {
  const [y, m] = key.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return monthKey(d)
}

export const todayKey = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

/** Keyword → category auto-categorization rules, checked against merchant name. */
const RULES: [RegExp, string][] = [
  [/salary|payroll|paycheck|deposit|acme corp|stripe payout/i, 'income'],
  [/landlord|rent|property mgmt/i, 'rent'],
  [/electric|power|utility|water|gas bill|pge|coned/i, 'utilities'],
  [/verizon|at&t|t-mobile|comcast|xfinity|internet|phone bill/i, 'utilities'],
  [/geico|progressive|insurance|allstate/i, 'insurance'],
  [/day ?care|child ?care|preschool|kindercare|bright horizons|montessori|kiddie/i, 'daycare'],
  [/savings|emergency fund|transfer to sav/i, 'savings'],
  [/spotify|netflix|hulu|disney|hbo|youtube|apple\.com\/bill|icloud|amazon prime|subscri/i, 'subscriptions'],
  [/gym|fitness|planet fitness|equinox|peloton/i, 'health'],
  [/cvs|walgreens|pharmacy|doctor|dental|hospital|therapy/i, 'health'],
  [/whole foods|trader joe|kroger|safeway|grocery|aldi|costco|market/i, 'groceries'],
  [/uber|lyft|shell|chevron|exxon|bp |amoco|parking|metro|transit|tesla|charging/i, 'transport'],
  [/starbucks|blue bottle|coffee|café|cafe/i, 'coffee'],
  [/mcdonald|chipotle|shake shack|pizza|burger|taco|sushi|restaurant|doordash|ubereats|grubhub|thai|ramen|deli|bakery|eatery/i, 'dining'],
  [/amzn|amazon|target|walmart|ebay|etsy|ikea|best buy/i, 'shopping'],
  [/amc|cinema|movie|concert|ticket|steam|nintendo|playstation|bowling/i, 'entertainment'],
  [/airline|delta|united|southwest|hotel|airbnb|expedia|flight/i, 'travel'],
]

export function categorize(merchant: string, categories: Category[]): string {
  for (const [re, id] of RULES) {
    if (re.test(merchant) && categories.some((c) => c.id === id)) return id
  }
  return 'other'
}

/** Parse a bank CSV export. Tolerates common column names. Returns parsed rows + skipped count. */
export function parseCSV(text: string): { rows: { date: string; merchant: string; amount: number }[]; skipped: number } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return { rows: [], skipped: 0 }
  const header = lines[0].toLowerCase().split(',').map((h) => h.replace(/["']/g, '').trim())
  const di = header.findIndex((h) => /date/.test(h))
  const ni = header.findIndex((h) => /description|merchant|name|payee|memo/.test(h))
  const ai = header.findIndex((h) => /^amount$/.test(h))
  const debitI = header.findIndex((h) => /debit|withdrawal/.test(h))
  const creditI = header.findIndex((h) => /credit|deposit/.test(h))
  const rows: { date: string; merchant: string; amount: number }[] = []
  let skipped = 0
  for (const line of lines.slice(1)) {
    // naive CSV with quote support
    const cells = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g)?.map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"').trim()) ?? []
    const rawDate = di >= 0 ? cells[di] : cells[0]
    const d = new Date(rawDate)
    if (isNaN(d.getTime())) { skipped++; continue }
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const merchant = (ni >= 0 ? cells[ni] : cells[1]) || 'Unknown'
    let amount = 0
    if (ai >= 0) {
      amount = Math.abs(parseFloat((cells[ai] || '').replace(/[$,]/g, '')) || 0)
      // positive amount column convention: expenses positive unless row says credit
      const type = (cells[header.findIndex((h) => /type/.test(h))] || '').toLowerCase()
      if (type.includes('credit') || type.includes('deposit') || type.includes('income')) amount = -amount
    } else if (debitI >= 0 || creditI >= 0) {
      const debit = parseFloat((cells[debitI] || '').replace(/[$,]/g, '')) || 0
      const credit = parseFloat((cells[creditI] || '').replace(/[$,]/g, '')) || 0
      amount = debit > 0 ? debit : -credit
    } else {
      skipped++; continue
    }
    if (!amount) { skipped++; continue }
    rows.push({ date, merchant, amount })
  }
  return { rows, skipped }
}

/** Clean bank-style merchant strings: 'SQ *COFFEE SHOP #1234 AUSTIN TX' → 'Coffee Shop'. */
export function cleanMerchant(raw: string): string {
  const t = raw.trim()
  if (/^AMZN|AMAZON\.COM/i.test(t)) return 'Amazon'
  // Person-to-person and ACH patterns seen in real bank exports
  const zelle = t.match(/^ZELLE (TO|FROM) (.+?) ON \d{2}\/\d{2}.*/i)
  if (zelle) {
    const who = zelle[2].toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
    return `Zelle ${zelle[1].toLowerCase()} ${who}`
  }
  if (/^VENMO/i.test(t)) return 'Venmo'
  if (/^VW CREDIT/i.test(t)) return 'VW Credit'
  if (/STATE ?FARM/i.test(t)) return 'State Farm'
  let m = t
  m = m.replace(/^BUSINESS TO BUSINESS (ACH )?/i, '')
  m = m.replace(/^(SQ \*|TST\*|SP \*|PP\*|PAYPAL ?\*?|INTUIT \*|AMZN MKTP( US)?|AMZNMKTPLACE|APL\*ITUNES|POS (PURCHASE )?|DEBIT CARD PURCHASE ?-? ?|CHECKCARD \d* ?|VISA (DDA|PURCHASE) ?|ACH (DEBIT|CREDIT) ?|PREAUTHORIZED )/i, '')
  m = m.replace(/^PURCHASE AUTHORIZED ON \d{2}\/\d{2}\s*/i, '') // card-network boilerplate
  m = m.replace(/\b\d{2}\/\d{2}(\/\d{2,4})?\b/g, ' ') // embedded dates
  m = m.replace(/\s+#\d+\b.*$/, '') // store number and everything after
  m = m.replace(/\*\S*$/, '') // trailing order code like *2K4X9
  m = m.replace(/\b\d{4,}\b/g, ' ') // long reference/phone digits anywhere
  m = m.replace(/\s+\d{4,}$/, '') // trailing reference digits
  m = m.replace(/\s+[A-Z]{2}$/, '') // trailing state code (all-caps strings)
  m = m.replace(/\b(CARD|X{2,}|#{2,})\b/gi, ' ') // card-reference filler
  m = m.replace(/\bWHSE\b|\bSTORE\b(?=\s*$)/gi, '') // warehouse/store filler words
  m = m.replace(/[*]+/g, ' ').replace(/\s{2,}/g, ' ').trim()
  if (m.length > 3 && m === m.toUpperCase() && /[A-Z]/.test(m)) {
    m = m.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) // title case
    m = m.replace(/'(S|T|Re|Ll|D)\b/g, (s) => s.toLowerCase()) // fix "Trader Joe'S" → "Trader Joe's"
  }
  m = m.replace(/\s*\S*\.(com|co|net|org|io)\S*$/i, '') // trailing domain junk like "Anthropic.Comca"
  m = m.replace(/\b(\w+)( \1\b)+/gi, '$1') // collapse repeated words: "Anthropic Anthropic" → "Anthropic"
  m = m.replace(/\s{2,}/g, ' ').trim()
  return m || raw
}

export const inMonth = (t: Transaction, key: string) => monthKey(t.date) === key

export const spent = (txns: Transaction[]) => txns.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
export const earned = (txns: Transaction[]) => txns.filter((t) => t.amount < 0).reduce((s, t) => s - t.amount, 0)
