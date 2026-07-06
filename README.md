# Riaura Work OS

A Next.js (App Router) HR/Work-OS dashboard, originally generated from Figma Make (design: https://www.figma.com/design/jv57XB0In5cGPakoM3MQ9O/User-dashboard) and since backed by a real Prisma/SQLite database and API.

## Setup

1. `npm i` — installs dependencies (also runs `prisma generate` via `postinstall`).
2. Copy `.env` and set `DATABASE_URL` (defaults to a local SQLite file at `prisma/dev.db`) and `SESSION_SECRET`.
3. `npm run db:push` — creates/updates the SQLite schema from `prisma/schema.prisma`.
4. `npm run db:seed` — wipes and re-seeds the database with a full set of demo data (employees, departments, teams, projects, tasks, attendance, leave, payroll, performance, KPIs/OKRs, knowledge base, chat, notifications, billing, etc). Re-run any time you want a fresh dataset.
5. `npm run dev` — starts the dev server.

Run `npm run build` and `npm start` to build and serve a production build.

## Demo accounts

After seeding, sign in with any of the accounts shown on the login screen's "Demo Credentials" panel (one per role — Super Admin, HR Admin, Manager, Team Lead, Employee, etc). All other seeded employees use the password `Welcome@2026`.

## Backend

- `prisma/schema.prisma` — the full data model.
- `src/lib/` — shared server helpers (`auth.ts` session/auth, `prisma.ts` client singleton, `roles.ts` role↔permission mapping, `audit.ts` audit logging, `notify.ts` notifications).
- `src/app/api/**` — REST-style route handlers backing every page in the UI.
