# APMC Accounts — Mandi Samiti Accounting Dashboard

Accounting and finance management system for an Agricultural Produce Market
Committee (APMC / Mandi Samiti) office in Uttar Pradesh. Built with Next.js
and PostgreSQL.

**Live app:** https://apmc-accounts.vercel.app

## What it does

This is a bookkeeping system for a Mandi Samiti's day-to-day accounts —
cashbook, banking, bills, staff payments, TDS and revenue tracking — with
Hindi labels alongside English throughout.

| Module | Route | Purpose |
|---|---|---|
| Dashboard | `/` | Cash/bank balances, income & expense totals, recent entries at a glance |
| Cashbook | `/cashbook` | Daily receipts & payments (cash, bank, cheque), voucher-numbered |
| Ledger | `/ledger` | Running ledger by account head |
| Bank Accounts | `/bank-accounts` | Bank account register with opening balances |
| Cheque Register | `/cheques` | Issued/received cheques — pending, cleared, bounced, cancelled |
| Cash Deposits | `/deposits` | Cash-to-bank deposit slips, allocated against cashbook receipts |
| BRS | `/brs` | Monthly Bank Reconciliation Statement |
| Bill & Budget | `/bills-budget` | Budget allocation per ledger head per financial year; bills raised/approved/paid against it |
| Shop Rent & Premium | `/shop-rent` | Shops/godowns/canteens allotted to occupants; monthly rent & premium collection |
| Staff & Payments | `/staff-payments` | Employee master and salary/allowance/arrear/advance payments with TDS |
| TDS Returns | `/tds-returns` | Quarterly 24Q/26Q/27Q filing register |
| Revenue Progress | `/revenue-progress` | Income targets vs actuals per ledger head |
| Reports | `/reports` | Income & expense reporting |
| Settings | `/settings` | APMC profile, party directory, chart of accounts (ledger heads) |

## Tech stack

- **Framework:** Next.js 16 (App Router, Server Actions), React 19
- **Database:** PostgreSQL, via [Drizzle ORM](https://orm.drizzle.team/) (`drizzle-orm` + `pg`)
- **Styling:** Tailwind CSS 4
- **Auth:** custom cookie-session login (see [Authentication](#authentication) below) — no third-party auth service
- **Hosting:** Vercel (Hobby/free tier)
- **Database hosting:** [Neon](https://neon.tech) (free tier serverless Postgres)

## Project structure

```
src/
  app/                 Next.js App Router pages (one folder per module)
    login/             Login page + login/logout server actions
    api/health/         DB health check endpoint (used by uptime checks)
  components/          Shared UI (Sidebar, AppShell, form components)
  db/
    schema.ts          Drizzle table definitions — the source of truth for the DB schema
    index.ts           Postgres connection pool + Drizzle client
  lib/
    actions.ts         All server actions (create/update/delete for every module)
    auth.ts            Session token signing/verification (HMAC via Web Crypto)
    format.ts, words.ts  Currency/date formatting, number-to-words for printed vouchers
  proxy.ts             Route guard — redirects unauthenticated requests to /login
database/
  ledger-heads-template.sql   Starter chart of accounts (income/expense/asset/liability heads)
.github/workflows/
  backup.yml           Nightly automated database backup (see below)
```

## Authentication

The app is protected by a single shared login (username + password), suited
to a small office where the whole staff shares one accounts terminal — not
per-user accounts with an audit trail.

- Credentials are checked against the `AUTH_USERNAME` / `AUTH_PASSWORD`
  environment variables.
- On successful login, a session token is signed with `AUTH_SECRET`
  (HMAC-SHA256, via the Web Crypto API) and stored in an HTTP-only cookie
  for 7 days.
- [`src/proxy.ts`](src/proxy.ts) checks that cookie on every request except
  `/login` and `/api/health`, redirecting anyone without a valid session to
  the login page.

There's currently no in-app "change password" screen — to change the
password, update `AUTH_PASSWORD` in Vercel's Environment Variables and
redeploy.

## Running it locally

**Requirements:** Node.js 20+, and a PostgreSQL database (a free
[Neon](https://neon.tech) project works well and avoids installing Postgres
locally).

1. Copy `.env.example` to `.env` and fill in real values:
   ```
   DATABASE_URL=<your Postgres connection string>
   AUTH_USERNAME=admin
   AUTH_PASSWORD=<a real password>
   AUTH_SECRET=<a long random string>
   ```
   Generate `AUTH_SECRET` with:
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Install dependencies and push the schema:
   ```
   npm install
   npx drizzle-kit push
   ```
3. Seed the chart of accounts — run `database/ledger-heads-template.sql`
   against your database (e.g. via Neon's SQL Editor, or `psql -f`).
4. Start the app:
   ```
   npm run dev
   ```
   Open http://localhost:3000 and log in with the credentials from `.env`.

## Deployment

Deployed on Vercel, connected to this GitHub repo — every push to `master`
auto-deploys. Production environment variables (`DATABASE_URL`,
`AUTH_USERNAME`, `AUTH_PASSWORD`, `AUTH_SECRET`) are set in the Vercel
project's **Settings → Environment Variables**, not committed to the repo.

Database schema changes are applied by running `npx drizzle-kit push`
locally against the production `DATABASE_URL` after editing
[`src/db/schema.ts`](src/db/schema.ts) — there's no automatic migration step
in the deploy pipeline.

## Daily backups

[`.github/workflows/backup.yml`](.github/workflows/backup.yml) runs every
night (free on GitHub Actions), dumps the production database with
`pg_dump`, gzips it, and commits it into the `backups/` folder of this repo
(pruning anything older than 90 days). It needs a `DATABASE_URL` repository
secret (Settings → Secrets and variables → Actions) pointing at the same
production database.

## Notes on the free-tier setup

- **Neon free tier** suspends the database compute after a period of
  inactivity; it wakes automatically on the next request within a few
  seconds — this is normal, not an outage.
- **Vercel Hobby plan** is intended for personal/non-commercial use; if this
  grows into heavier institutional use, Vercel's Pro plan may become
  necessary.
