# People

Mobile-first internal HR app: the one source of truth about the team.
Org chart and tenure, upcoming birthdays and anniversaries, profiles,
time off (team-facing requests, manager/admin approval), timestamped
performance notes and compensation history.

Standalone today; the data model matches the People module in
Recruiting OS so it can be merged in later.

## Stack

Next.js 15 (App Router), React 19, Prisma 6 + PostgreSQL, Tailwind 4, Vitest.

## Setup

```bash
cp .env.example .env         # set DATABASE_URL, AUTH_SECRET
npm install
npm run db:migrate           # apply migrations
npm run db:import -- path/to/employees.csv   # load the roster
npm run dev
```

The roster CSV (Notion "Employee Database" export) is not committed: it
contains phone numbers and emergency contacts. Emails are derived as
`first.last@elliot.ai` unless overridden in `prisma/import-employees.ts`.

With `DEV_AUTH_ENABLED=true`, `/login` offers an account picker; in
production configure Google OAuth and set `DEV_AUTH_ENABLED=false`.

## Access model

| Capability                      | Who                         |
| ------------------------------- | --------------------------- |
| Dashboard, org chart, directory | admins                      |
| View a profile                  | admin, self, direct manager |
| Performance notes               | admin, direct manager       |
| Compensation                    | admin                       |
| Submit / cancel own time off    | everyone                    |
| Approve / decline time off      | admin, direct manager       |

`ADMIN_EMAILS` promotes accounts to admin on sign-in.

## Checks

```bash
npm run format:check && npm run lint && npm run typecheck && npm test && npm run build
```

Tests use `TEST_DATABASE_URL` (default `.../people_test`).
