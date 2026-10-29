import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dashboardSummary } from '../src/api.js';

const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');

describe('data isolation schema', () => {
  it('enables row-level security and ties every private table to auth.uid()', () => {
    for (const table of ['users', 'contacts', 'interactions', 'stars', 'tags', 'contact_tags']) {
      expect(schema).toContain(`alter table public.${table} enable row level security`);
    }
    expect(schema).toContain('user_id = auth.uid()');
    expect(schema).toContain('id = auth.uid()');
    expect(schema).toContain('users own contacts');
    expect(schema).toContain('users own interactions');
    expect(schema).toContain('users own stars');
    expect(schema).toContain('users own tags');
    expect(schema).toContain('users own contact tags');
  });
});

describe('dashboard summary', () => {
  it('counts only interactions in the current month', () => {
    const contacts = [{
      id: 1,
      interactions: [
        { occurred_on: '2026-10-02' },
        { occurred_on: '2026-10-28' },
        { occurred_on: '2026-09-30' },
      ],
    }];

    expect(dashboardSummary(contacts, '2026-10-29').interactionsThisMonth).toBe(2);
  });
});
