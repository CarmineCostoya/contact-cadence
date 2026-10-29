# Contact Cadence

Contact Cadence is a private relationship tracker for remembering professional contacts, recording interactions, and planning thoughtful follow-ups.

**Live app:** Add the Replit deployment URL after publishing.

## What it does

- Email/password signup, login, logout, and account-specific data
- Contact create, list, detail, edit, and confirmed deletion
- Dated interaction timeline for meetings, coffee chats, calls, messages, emails, and events
- Stars and a starred-only view
- Search, follow-up filters, tag filters, and sorting
- Dashboard with three summary statistics and a six-month chart
- In-app overdue, due-today, and upcoming follow-up queue
- Reusable tags and safe CSV export

## Technology

The React/Vite frontend calls an Express JSON API. Express stores data in PostgreSQL using parameterized SQL. Passwords are hashed with bcrypt, and login sessions use secure HTTP-only cookies backed by PostgreSQL. Recharts renders the dashboard chart. Vitest and Supertest exercise the API.

## Run locally

1. Install Node.js 20 or newer and PostgreSQL.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` and a long random `SESSION_SECRET`.
3. Run `npm install`.
4. Run `npm run db:migrate`.
5. Run `npm run dev`.
6. Open `http://localhost:5173`.

## Test and build

```bash
npm test
npm run build
```

The two required tests prove that one user cannot access another user's contact and that the dashboard counts current-month interactions correctly.

## Deploy on Replit

1. Import this GitHub repository into a new Replit App.
2. Open the Replit Database tool and provision PostgreSQL.
3. Add `SESSION_SECRET` in Replit Secrets. Replit supplies `DATABASE_URL`.
4. Run `npm run db:migrate` against the development database.
5. Confirm the development app works, then publish with build command `npm run build` and run command `npm start`.
6. Run the migration against the production database before the first production smoke test.
7. Add the deployed URL above and test signup, refresh persistence, logout, and a second user's data isolation.

## Project documentation

- [`PLAN.md`](./PLAN.md) contains the original blueprint and Plan vs. Reality table.
- [`schema.md`](./schema.md) explains every table and relationship.
- [`prompts/`](./prompts/) records the feature prompts used with the coding agent.
- [`TEST_EVIDENCE.md`](./TEST_EVIDENCE.md) explains the required tests and the red/green evidence still needed in the pull request descriptions.

Real contact data is entered only through the deployed interface. It is never stored in this public repository.
