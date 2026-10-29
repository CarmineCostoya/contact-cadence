# Contact Cadence — Solo App Plan

## 1. Pitch

I’m building Contact Cadence because I meet classmates, alumni, and professionals throughout the semester and need a simple way to remember who they are, what we discussed, and when I should reconnect. I expect to use it several times per week after meetings, events, and coffee chats.

## 2. Features

1. **Accounts and privacy:** As a new visitor, I want to sign up, log in, and log out so that my networking information is private and available across devices.
2. **Contact CRUD:** As a signed-in user, I want to add, list, open, edit, and delete contacts—with deletion confirmation—so that I can maintain my network.
3. **Interaction history:** As a user, I want to record dated meetings, calls, messages, and events for a contact so that I remember our relationship history.
4. **Validation:** As a user, I want friendly messages when required or invalid information is submitted so that I can correct mistakes.
5. **Stars:** As a user, I want to star important contacts and open a starred-only view so that I can focus on priority relationships.
6. **Find and organize:** As a user, I want to search names and organizations, filter by tags or follow-up status, and sort contacts so that I can quickly find people.
7. **Dashboard:** As a user, I want summary statistics and a monthly interaction chart so that I can understand my networking activity.
8. **Follow-up reminders — custom:** As a user, I want overdue, due-today, and upcoming follow-ups shown inside the app so that relationships do not go cold.
9. **Tags — custom:** As a user, I want to assign reusable tags such as “Haas,” “Alumni,” or “Product” so that I can group contacts flexibly.
10. **CSV export — custom:** As a user, I want to download my contact directory as CSV so that I have a portable copy of my data.

## 3. Database

```text
users 1 ─── * contacts 1 ─── * interactions
  │              │
  │              * ─── * tags, through contact_tags
  └────────────── * stars * ───────────── contacts
```

| Table | Columns |
|---|---|
| `users` | `id` integer primary key, `email` text unique required, `password_hash` text required, `created_at` timestamp |
| `contacts` | `id` integer primary key, `user_id` foreign key required, `name` text required, `organization` text, `role` text, `how_met` text, `met_on` date, `notes` text, `next_follow_up_on` date, `created_at` and `updated_at` timestamps |
| `interactions` | `id` integer primary key, `contact_id` foreign key required, `interaction_type` text required, `occurred_on` date required, `notes` text, `created_at` timestamp |
| `stars` | `id` integer primary key, `user_id` and `contact_id` foreign keys required, `created_at` timestamp; unique on user/contact |
| `tags` | `id` integer primary key, `user_id` foreign key required, `name` text required; case-insensitive unique name per user |
| `contact_tags` | `contact_id` and `tag_id` foreign keys forming a composite primary key |
| `user_sessions` | Session ID primary key, session data JSON, expiration timestamp; maintained by the session library |

Deleting a contact cascades to its interactions, stars, and tag assignments. Every contact query is restricted by the authenticated user ID.

## 4. Tests

- **Data isolation:** Given User A owns a contact and User B is logged in, when User B requests the contact list or User A’s contact URL, then the contact is absent and the direct request returns `404`.
- **Dashboard:** Given a user has two interactions in the current month and one in the previous month, when the dashboard summary is requested, then “Interactions this month” equals `2`.

## 5. Technologies

- **Coding agent:** Codex, used one feature prompt at a time so each change remains reviewable.
- **Frontend:** React, Vite, React Router, and beginner-readable JavaScript.
- **Backend:** Node.js and Express with a JSON REST API.
- **Database:** Replit-managed PostgreSQL through `DATABASE_URL`, using parameterized `pg` queries.
- **Authentication:** Email/password signup with `bcryptjs`, server-side sessions, PostgreSQL session storage, and secure HTTP-only cookies.
- **Charts:** Recharts for the monthly interactions bar chart.
- **Tests:** Vitest, Supertest, and an isolated in-memory PostgreSQL-compatible test database.
- **Hosting:** Replit deployment with production secrets and production PostgreSQL.
- **Repository:** Public GitHub repository with no secrets or real contact data committed.

## 6. Design

The interface uses a clean, neutral dashboard inspired by Notion and Linear: white and light-slate backgrounds, dark-slate text, restrained blue accents, generous spacing, and minimal decoration. Pages are responsive and keyboard-accessible, with visible focus states, labeled fields, sufficient color contrast, and text labels in addition to color.

## 7. Risks and Cuts

The highest risk is enforcing data isolation consistently across contacts, interactions, stars, and tags. A second risk is applying the same schema to development and production databases without copying test data. CSV export is the first feature to cut if time runs out; animations and advanced chart interactions are the first polish cuts. Email reminders and third-party integrations are outside version 1.

## 8. Plan vs. Reality

Do not rewrite the original plan. Complete this table after the final feature and stranger test.

| Planned feature | Shipped / Changed / Cut | Status (Done/Backlogged) | Learning | What changed and why |
|---|---|---|---|---|
| Accounts and privacy |  |  |  |  |
| Contact CRUD |  |  |  |  |
| Interaction history |  |  |  |  |
| Validation |  |  |  |  |
| Stars |  |  |  |  |
| Find and organize |  |  |  |  |
| Dashboard |  |  |  |  |
| Follow-up reminders |  |  |  |  |
| Tags |  |  |  |  |
| CSV export |  |  |  |  |
