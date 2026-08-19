# Little Dragon Budget

A calm personal budgeting PWA: track spending against category limits, import bank
statements, split income between people, and save toward goals. Installable on
phones, works offline, optionally syncs across devices and between two people in a
household.

Live at [ejarr1998.github.io/LittleDragonBudget](https://ejarr1998.github.io/LittleDragonBudget/).

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npm test         # unit tests for the parsers
npm run build    # type-check + production build into dist/
```

Node 20 or newer.

## How it fits together

React 19 + TypeScript + Vite, Tailwind 3 with shadcn/ui primitives, Firebase Auth
and Firestore.

| Path | What lives there |
| --- | --- |
| `src/lib/store.tsx` | The whole app state, plus local persistence and sync |
| `src/lib/firebase.ts` | Auth, households, and the Firestore read/write layer |
| `src/lib/money.ts` | Formatting, month math, CSV parsing, auto-categorization |
| `src/lib/pdf.ts` | Bank statement PDF parsing (lazy loaded on first use) |
| `src/lib/backup.ts` | JSON export and restore |
| `src/sections/` | The five tabs: Dashboard, Budget, Transactions, Insights, Goals |
| `src/components/app/` | App-specific components |
| `src/components/ui/` | Vendored shadcn/ui primitives, mostly untouched |
| `public/sw.js` | Service worker; the cache name is stamped at build time |

### State and sync

There is one `BudgetState` object holding transactions, categories, goals, income
sources, and the monthly income figure. It is written to `localStorage` on every
change and debounced up to Firestore 600ms later.

Storage location depends on the account:

- signed out or anonymous: `users/{uid}/budget/state`
- in a household: `households/{hid}/budget/state`, shared with the other member

A live `onSnapshot` listener keeps both devices current. Each write is stamped
with a `writerId` so a client ignores the echo of its own save. If a snapshot
arrives while this device has unflushed edits, the id-bearing lists are unioned
so neither side's additions are lost.

**Known limitation:** the budget is a single document, so a delete on one device
racing an edit on the other inside the same second can still be resurrected by
the merge. The real fix is moving `transactions` into a subcollection with one
document per transaction, which also lifts the 1 MiB document ceiling. Worth
doing before this holds several years of imports.

### Households

The household id is the owner's uid, so there is one household per owner.
Membership lives in `households/{hid}/members/{uid}` and is what the security
rules check. Joining requires a live invite code, which the rules re-verify
server-side; a client cannot grant itself access by writing to its own profile.
Codes are 8 characters from `crypto.getRandomValues`, expire after 7 days, and
are deleted on redemption.

### Security rules

`firestore.rules` is the actual security boundary and is version controlled.
Deploy it whenever it changes:

```bash
npx firebase-tools deploy --only firestore:rules
```

The Firebase web config in `src/lib/firebase.ts` is not a secret; it identifies
the project rather than authorizing anything. The rules are what matter.

## Importing statements

CSV is far more reliable than PDF. The parser handles a `Date` / `Description` /
`Amount` layout, separate debit and credit columns, and a `Type` column marking
credits. Dates are parsed as local time on purpose: a bare ISO string like
`2026-01-02` is UTC midnight in JavaScript, which lands on the previous day in
US timezones. The tests in `src/lib/money.test.ts` guard that, and CI runs them
under `TZ=America/New_York` so a regression fails the build.

PDF parsing is best effort, tuned for Wells Fargo-style statements.

Imports are deduplicated per occurrence rather than per key, so two identical
coffees on the same day both survive. Every import gets a batch id and can be
undone in one click.

## Backups

Account and sharing sheet, "Backup and restore". Download a JSON file before any
large import. Restoring replaces everything, including the household copy.
