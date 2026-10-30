# Contact Cadence

Contact Cadence is a private relationship tracker for remembering professional contacts, recording interactions, and planning thoughtful follow-ups.

**Live app:** https://carminecostoya.github.io/contact-cadence/

## What it does

- Email/password signup, login, logout, and account-specific data
- Contact create, list, detail, edit, and confirmed deletion
- Dated interaction history for meetings, coffee chats, calls, messages, emails, and events
- Stars, search, follow-up filters, tag filters, and sorting
- Dashboard statistics and a six-month interaction chart
- In-app overdue, due-today, and upcoming follow-up queue
- Reusable tags and spreadsheet-safe CSV export

## Free architecture

The app is a static React/Vite site hosted on GitHub Pages. Supabase Free provides authentication and PostgreSQL. Row Level Security (RLS) policies in [`supabase/schema.sql`](./supabase/schema.sql) ensure each signed-in user can access only their own data. There is no paid Replit deployment or always-running server.

GitHub Pages and Supabase both have free-plan usage limits. Supabase may pause an inactive free project, so open the app and wake the project before a class demo.

## Configure Supabase

1. Create a Supabase Free project.
2. Open its SQL Editor and run all of [`supabase/schema.sql`](./supabase/schema.sql).
3. In Authentication settings, disable email confirmation for the classroom demo, or keep it enabled and confirm each signup by email.
4. Copy `.env.example` to `.env` and add the project URL and public anon key.
5. Never add a service-role key to this frontend or to the repository.

## Run locally

```bash
pnpm install
pnpm dev
```

Open the URL Vite prints, normally `http://localhost:5173/contact-cadence/`.

## Test and build

```bash
pnpm test
pnpm build
```

The automated tests check the dashboard month calculation and verify that all private database tables have RLS ownership policies. Before submission, also complete the two-account isolation test against the deployed Supabase project.

## Deploy free on GitHub Pages

1. In the GitHub repository, add Actions variables named `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. In **Settings → Pages**, choose **GitHub Actions** as the source.
3. Merge through a pull request into `main`. The included workflow tests, builds, and deploys the site.
4. Test signup, refresh persistence, logout, and two-account data isolation on the live URL.

## Project documentation

- [`PLAN.md`](./PLAN.md) preserves the original blueprint and records the hosting change in Plan vs. Reality.
- [`schema.md`](./schema.md) explains the database and privacy rules.
- [`prompts/`](./prompts/) records feature prompts used with the coding agent.
- [`TEST_EVIDENCE.md`](./TEST_EVIDENCE.md) documents the required test evidence.
- [`REFLECTION.md`](./REFLECTION.md) contains the final implementation and stranger-test reflections.

Real contact data is entered only through the deployed interface and is never committed to this public repository.
