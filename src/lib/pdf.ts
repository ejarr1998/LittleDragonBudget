import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export interface ParsedRow { date: string; merchant: string; amount: number }

/**
 * Best-effort bank statement PDF parser (tuned for Wells Fargo-style layouts).
 * Extracts text line by line, tracks Deposits/Withdrawals sections, and pulls
 * lines shaped like:  MM/DD  Description text  123.45
 */
export async function parseStatementPDF(file: File): Promise<{ rows: ParsedRow[]; skipped: number }> {
  const buf = await file.arrayBuffer()
  const pdf = await pdfjs.getDocument({ data: buf }).promise

  const lines: string[] = []
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    // Group text items into visual lines by their Y coordinate
    const byY = new Map<number, { x: number; s: string }[]>()
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue
      const y = Math.round(item.transform[5])
      const x = item.transform[4]
      const bucket = [...byY.keys()].find((k) => Math.abs(k - y) <= 2)
      const key = bucket ?? y
      if (!byY.has(key)) byY.set(key, [])
      byY.get(key)!.push({ x, s: item.str })
    }
    const sorted = [...byY.entries()].sort((a, b) => b[0] - a[0]) // top to bottom
    for (const [, items] of sorted) {
      lines.push(items.sort((a, b) => a.x - b.x).map((i) => i.s).join(' ').replace(/\s+/g, ' ').trim())
    }
  }

  // Try to find the statement year
  let year = new Date().getFullYear()
  for (const l of lines.slice(0, 60)) {
    const m = l.match(/\b(19|20)\d{2}\b/)
    if (m) { year = parseInt(m[0]); break }
  }

  const rows: ParsedRow[] = []
  let skipped = 0
  let section: 'deposits' | 'withdrawals' | null = null

  const txRe = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+(.+?)\s+(-?\$?[\d,]+\.\d{2})\s*$/

  for (const raw of lines) {
    const l = raw.trim()
    if (/^(deposits|credits|money in)\b/i.test(l)) { section = 'deposits'; continue }
    if (/^(withdrawals|debits|purchases|money out|checks paid|electronic withdrawals)\b/i.test(l)) { section = 'withdrawals'; continue }
    if (/^(totals?|ending balance|beginning balance|summary|page \d)/i.test(l)) continue

    const m = l.match(txRe)
    if (!m) continue
    const [, mm, dd, yy, desc, amtRaw] = m
    const y = yy ? (yy.length === 2 ? 2000 + parseInt(yy) : parseInt(yy)) : year
    const amount = Math.abs(parseFloat(amtRaw.replace(/[$,]/g, '')))
    if (!amount || amount > 1_000_000) { skipped++; continue }
    const merchant = desc.replace(/\s+/g, ' ').trim().slice(0, 60) || 'Unknown'
    if (/^(balance|total|date|description)/i.test(merchant)) { skipped++; continue }
    const date = `${y}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
    // Convention: expenses positive, income negative. Section header wins;
    // otherwise explicit minus sign in the statement means money in.
    const isDeposit = section === 'deposits' || amtRaw.startsWith('-')
    rows.push({ date, merchant, amount: isDeposit ? -amount : amount })
  }

  return { rows, skipped }
}
