# Contact Cadence Database Schema

Supabase Free hosts the PostgreSQL database and authentication service. Supabase Auth stores password hashes in its protected `auth` schema; the app never reads or stores passwords itself.

```text
auth.users 1 ── 1 public.users 1 ─── * contacts 1 ─── * interactions
                                  │        │
                                  │        * ─── * tags, through contact_tags
                                  └──────── * stars * ───────────── contacts
```

## Tables

- `public.users`: UUID primary key matching `auth.users.id`, normalized email, creation time. A database trigger creates this profile when an account is created.
- `contacts`: owner UUID, required name, organization, role, meeting context/date, notes, next follow-up, and timestamps.
- `interactions`: contact foreign key, allowed interaction type, non-future occurrence date, notes, and creation time.
- `stars`: owner UUID and contact foreign key, unique as a pair.
- `tags`: owner UUID and name, case-insensitively unique per user.
- `contact_tags`: contact/tag composite primary key for the many-to-many relationship.

Deleting a user cascades through their data. Deleting a contact cascades to interactions, stars, and tag assignments.

## Privacy rule

All six public tables have PostgreSQL Row Level Security enabled. Policies compare ownership with `auth.uid()`, the authenticated user ID derived from the signed Supabase access token. Nested interaction, star, and tag-assignment policies also verify ownership of the parent contact. The public anon key identifies the project; it does not bypass RLS.

The `set_contact_tags` database function runs with the caller's permissions and rejects contacts or tags not owned by that caller.
