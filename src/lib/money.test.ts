import { describe, expect, it } from 'vitest'
import { categorize, cleanMerchant, dateKey, monthKey, parseCSV, parseDateCell, shiftMonth } from './money'
import { DEFAULT_CATEGORIES } from './store'

describe('parseDateCell', () => {
  it('keeps a bare ISO date on the same calendar day', () => {
    // The bug this guards: new Date('2026-01-02') is UTC midnight, which is
    // the previous day anywhere west of Greenwich.
    expect(dateKey(parseDateCell('2026-01-02'))).toBe('2026-01-02')
  })

  it('handles single-digit ISO components', () => {
    expect(dateKey(parseDateCell('2026-1-2'))).toBe('2026-01-02')
  })

  it('handles US slash dates', () => {
    expect(dateKey(parseDateCell('01/02/2026'))).toBe('2026-01-02')
  })

  it('returns an invalid date for junk', () => {
    expect(isNaN(parseDateCell('not a date').getTime())).toBe(true)
  })
})

describe('parseCSV', () => {
  it('reads a standard date/description/amount export', () => {
    const { rows, skipped } = parseCSV(
      ['Date,Description,Amount', '2026-01-02,WHOLE FOODS MKT,54.20', '2026-01-03,Starbucks,6.15'].join('\n'),
    )
    expect(skipped).toBe(0)
    expect(rows).toEqual([
      { date: '2026-01-02', merchant: 'WHOLE FOODS MKT', amount: 54.2 },
      { date: '2026-01-03', merchant: 'Starbucks', amount: 6.15 },
    ])
  })

  it('treats debit and credit columns as expense and income', () => {
    const { rows } = parseCSV(
      ['Date,Description,Debit,Credit', '2026-02-01,Rent,1650.00,', '2026-02-01,Payroll,,3450.00'].join('\n'),
    )
    expect(rows[0].amount).toBe(1650)
    expect(rows[1].amount).toBe(-3450)
  })

  it('flips the sign for rows marked as a credit', () => {
    const { rows } = parseCSV(
      ['Date,Description,Amount,Type', '2026-02-01,Refund,25.00,Credit'].join('\n'),
    )
    expect(rows[0].amount).toBe(-25)
  })

  it('keeps commas inside quoted fields', () => {
    const { rows } = parseCSV(['Date,Description,Amount', '2026-03-04,"NONNA\'S PIZZA, INC",31.00'].join('\n'))
    expect(rows[0].merchant).toBe("NONNA'S PIZZA, INC")
    expect(rows[0].amount).toBe(31)
  })

  it('counts unreadable rows instead of dropping them silently', () => {
    const { rows, skipped } = parseCSV(
      ['Date,Description,Amount', 'garbage,,', '2026-01-02,Target,20.00'].join('\n'),
    )
    expect(rows).toHaveLength(1)
    expect(skipped).toBe(1)
  })

  it('returns nothing for an empty file', () => {
    expect(parseCSV('').rows).toEqual([])
  })
})

describe('cleanMerchant', () => {
  const cases: [string, string][] = [
    ['SQ *COFFEE SHOP #1234 AUSTIN TX', 'Coffee Shop'],
    ['AMZN MKTP US*2K4X9', 'Amazon'],
    ['TRADER JOE\'S #182', "Trader Joe's"],
    ['CHECKCARD 0412 SHELL OIL 5732', 'Shell Oil'],
    ['Netflix', 'Netflix'],
  ]
  for (const [raw, expected] of cases) {
    it(`${raw} -> ${expected}`, () => expect(cleanMerchant(raw)).toBe(expected))
  }

  it('never returns an empty string', () => {
    expect(cleanMerchant('####')).not.toBe('')
  })
})

describe('categorize', () => {
  const cases: [string, string][] = [
    ['Whole Foods Market', 'groceries'],
    ['Starbucks', 'coffee'],
    ['Geico Auto Insurance', 'insurance'],
    ['Acme Corp — Salary', 'income'],
    ['KinderCare Learning', 'daycare'],
    ['Some Unknown Vendor', 'other'],
  ]
  for (const [merchant, expected] of cases) {
    it(`${merchant} -> ${expected}`, () => expect(categorize(merchant, DEFAULT_CATEGORIES)).toBe(expected))
  }
})

describe('month helpers', () => {
  it('derives the month key in local time', () => {
    expect(monthKey('2026-01-01')).toBe('2026-01')
  })

  it('wraps across year boundaries', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
  })
})
