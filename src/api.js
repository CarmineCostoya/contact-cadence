import { isSupabaseConfigured, supabase } from './supabase.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const INTERACTION_TYPES = ['Meeting', 'Coffee chat', 'Call', 'Message', 'Email', 'Event', 'Other'];

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(value, days) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function apiError(message, errors = {}, status = 400) {
  const error = new Error(message);
  error.errors = errors;
  error.status = status;
  return error;
}

function ensureConfigured() {
  if (!isSupabaseConfigured) throw apiError('Supabase is not configured yet. Add the two VITE_SUPABASE variables.', {}, 503);
}

function check(result, friendly) {
  if (result.error) throw apiError(friendly || result.error.message);
  return result.data;
}

function validDate(value) {
  if (!value) return true;
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function optional(value, max) {
  const text = String(value || '').trim();
  return text ? text.slice(0, max) : null;
}

function contactValues(body) {
  const values = {
    name: String(body.name || '').trim(),
    organization: optional(body.organization, 160), role: optional(body.role, 160),
    how_met: optional(body.howMet, 300), met_on: optional(body.metOn, 10),
    notes: optional(body.notes, 2000), next_follow_up_on: optional(body.nextFollowUpOn, 10),
  };
  const errors = {};
  if (!values.name) errors.name = 'Name is required.';
  if (values.name.length > 120) errors.name = 'Name must be 120 characters or fewer.';
  if (!validDate(values.met_on)) errors.metOn = 'Enter a valid date.';
  if (values.met_on && values.met_on > today()) errors.metOn = 'The date you met cannot be in the future.';
  if (!validDate(values.next_follow_up_on)) errors.nextFollowUpOn = 'Enter a valid date.';
  if (Object.keys(errors).length) throw apiError('Please correct the highlighted fields.', errors);
  return values;
}

function interactionValues(body) {
  const values = { interaction_type: String(body.interactionType || ''), occurred_on: String(body.occurredOn || ''), notes: optional(body.notes, 2000) };
  const errors = {};
  if (!INTERACTION_TYPES.includes(values.interaction_type)) errors.interactionType = 'Choose an interaction type.';
  if (!validDate(values.occurred_on) || !values.occurred_on) errors.occurredOn = 'Enter a valid date.';
  if (values.occurred_on > today()) errors.occurredOn = 'Interaction date cannot be in the future.';
  if (Object.keys(errors).length) throw apiError('Please correct the highlighted fields.', errors);
  return values;
}

function decorate(contact) {
  const interactions = contact.interactions || [];
  const dates = interactions.map((item) => item.occurred_on).filter(Boolean).sort();
  const result = {
    ...contact,
    starred: Boolean(contact.stars?.length),
    tags: (contact.contact_tags || []).map((item) => item.tag).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name)),
    interaction_count: interactions.length,
    last_interaction_on: dates.at(-1) || null,
  };
  delete result.stars;
  delete result.contact_tags;
  return result;
}

const CONTACT_SELECT = `*, stars(id), contact_tags(tag:tags(id,name)), interactions(id,interaction_type,occurred_on,notes,created_at)`;

async function contacts() {
  return check(await supabase.from('contacts').select(CONTACT_SELECT)).map(decorate);
}

function sortContacts(items, sort) {
  return [...items].sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name);
    if (sort === 'followup') return (a.next_follow_up_on || '9999').localeCompare(b.next_follow_up_on || '9999') || a.name.localeCompare(b.name);
    if (sort === 'lastInteraction') return (b.last_interaction_on || '').localeCompare(a.last_interaction_on || '');
    return String(b.created_at).localeCompare(String(a.created_at));
  });
}

async function listContacts(path) {
  const params = new URLSearchParams(path.split('?')[1] || '');
  const search = (params.get('search') || '').toLowerCase();
  const filter = params.get('filter') || 'all';
  const tagId = Number(params.get('tag')) || null;
  const current = today();
  let items = await contacts();
  if (search) items = items.filter((item) => item.name.toLowerCase().includes(search) || (item.organization || '').toLowerCase().includes(search));
  if (filter === 'starred') items = items.filter((item) => item.starred);
  if (filter === 'overdue') items = items.filter((item) => item.next_follow_up_on && item.next_follow_up_on < current);
  if (filter === 'today') items = items.filter((item) => item.next_follow_up_on === current);
  if (filter === 'upcoming') items = items.filter((item) => item.next_follow_up_on > current && item.next_follow_up_on <= addDays(current, 7));
  if (tagId) items = items.filter((item) => item.tags.some((tag) => Number(tag.id) === tagId));
  return { contacts: sortContacts(items, params.get('sort') || 'recent') };
}

async function auth(path, options) {
  const body = options.body || {};
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (path === '/auth/me') {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    return { user: user ? { id: user.id, email: user.email, created_at: user.created_at } : null };
  }
  if (path === '/auth/logout') { check(await supabase.auth.signOut(), 'Could not log out.'); return null; }
  const errors = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Enter your password.';
  if (path === '/auth/signup' && password.length < 8) errors.password = 'Use at least 8 characters.';
  if (Object.keys(errors).length) throw apiError('Please correct the highlighted fields.', errors);
  const result = path === '/auth/signup' ? await supabase.auth.signUp({ email, password }) : await supabase.auth.signInWithPassword({ email, password });
  if (result.error) throw apiError(path === '/auth/login' ? 'Email or password is incorrect.' : result.error.message);
  if (path === '/auth/signup' && !result.data.session) throw apiError('Check your email to confirm the account, then log in.');
  const user = result.data.user;
  return { user: { id: user.id, email: user.email, created_at: user.created_at } };
}

export function dashboardSummary(items, currentDate = today()) {
  return {
    totalContacts: items.length,
    interactionsThisMonth: items.flatMap((item) => item.interactions || []).filter((item) => item.occurred_on.startsWith(currentDate.slice(0, 7))).length,
  };
}

async function dashboard() {
  const items = await contacts();
  const current = today();
  const allInteractions = items.flatMap((contact) => contact.interactions || []);
  const monthlyInteractions = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - offset);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyInteractions.push({ month: date.toLocaleString('en-US', { month: 'short' }), count: allInteractions.filter((item) => item.occurred_on.startsWith(key)).length });
  }
  const dueContacts = items.filter((item) => item.next_follow_up_on && item.next_follow_up_on <= addDays(current, 7))
    .sort((a, b) => a.next_follow_up_on.localeCompare(b.next_follow_up_on)).slice(0, 8)
    .map((item) => ({ ...item, status: item.next_follow_up_on < current ? 'overdue' : item.next_follow_up_on === current ? 'today' : 'upcoming' }));
  return {
    ...dashboardSummary(items, current),
    overdueFollowUps: items.filter((item) => item.next_follow_up_on && item.next_follow_up_on < current).length,
    monthlyInteractions, dueContacts,
  };
}

function safeCsv(value) {
  if (value === null || value === undefined) return '""';
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function exportContactsCsv() {
  ensureConfigured();
  const items = sortContacts(await contacts(), 'name');
  const headers = ['Name','Organization','Role','How met','Date met','Next follow-up','Notes','Tags','Starred','Interaction count','Last interaction'];
  const rows = items.map((item) => [item.name,item.organization,item.role,item.how_met,item.met_on,item.next_follow_up_on,item.notes,item.tags.map((tag) => tag.name).join('; '),item.starred ? 'Yes' : 'No',item.interaction_count,item.last_interaction_on].map(safeCsv).join(','));
  const blob = new Blob([[headers.map(safeCsv).join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = `contact-cadence-${today().replaceAll('-', '')}.csv`;
  link.click(); URL.revokeObjectURL(url);
}

export async function api(path, options = {}) {
  ensureConfigured();
  if (path.startsWith('/auth/')) return auth(path, options);
  if (path === '/dashboard') return dashboard();
  if (path.startsWith('/contacts?') || path === '/contacts') {
    if (!options.method || options.method === 'GET') return listContacts(path);
    const data = check(await supabase.from('contacts').insert(contactValues(options.body)).select(CONTACT_SELECT).single(), 'Could not add the contact.');
    return { contact: decorate(data) };
  }
  if (path === '/tags' && (!options.method || options.method === 'GET')) return { tags: check(await supabase.from('tags').select('id,name').order('name')) };
  if (path === '/tags' && options.method === 'POST') {
    const name = String(options.body.name || '').trim();
    if (!name || name.length > 30) throw apiError('Enter a tag name.', { name: 'Tag name must be 1–30 characters.' });
    const result = await supabase.from('tags').insert({ name }).select('id,name').single();
    if (result.error) throw apiError('Could not create tag.', { name: result.error.code === '23505' ? 'You already have this tag.' : result.error.message });
    return { tag: result.data };
  }
  if (path === '/export/contacts.csv') { await exportContactsCsv(); return null; }
  const interactionMatch = path.match(/^\/contacts\/(\d+)\/interactions(?:\/(\d+))?$/);
  if (interactionMatch) {
    const [, contactId, interactionId] = interactionMatch;
    if (options.method === 'POST') return { interaction: check(await supabase.from('interactions').insert({ contact_id: Number(contactId), ...interactionValues(options.body) }).select().single(), 'Could not save the interaction.') };
    if (options.method === 'PATCH') return { interaction: check(await supabase.from('interactions').update(interactionValues(options.body)).eq('id', Number(interactionId)).eq('contact_id', Number(contactId)).select().single(), 'Could not update the interaction.') };
    check(await supabase.from('interactions').delete().eq('id', Number(interactionId)).eq('contact_id', Number(contactId))); return null;
  }
  const starMatch = path.match(/^\/contacts\/(\d+)\/star$/);
  if (starMatch) {
    const contactId = Number(starMatch[1]);
    if (options.method === 'POST') { check(await supabase.from('stars').upsert({ contact_id: contactId }, { onConflict: 'user_id,contact_id' })); return { starred: true }; }
    check(await supabase.from('stars').delete().eq('contact_id', contactId)); return null;
  }
  const contactTagsMatch = path.match(/^\/contacts\/(\d+)\/tags$/);
  if (contactTagsMatch) return { tags: check(await supabase.rpc('set_contact_tags', { target_contact_id: Number(contactTagsMatch[1]), target_tag_ids: options.body.tagIds.map(Number) }), 'Could not update tags.') || [] };
  const tagMatch = path.match(/^\/tags\/(\d+)$/);
  if (tagMatch) {
    const id = Number(tagMatch[1]);
    if (options.method === 'PATCH') {
      const result = await supabase.from('tags').update({ name: String(options.body.name || '').trim() }).eq('id', id).select('id,name').single();
      if (result.error) throw apiError('Could not rename tag.', { name: result.error.code === '23505' ? 'You already have this tag.' : result.error.message });
      return { tag: result.data };
    }
    check(await supabase.from('tags').delete().eq('id', id)); return null;
  }
  const contactMatch = path.match(/^\/contacts\/(\d+)$/);
  if (contactMatch) {
    const id = Number(contactMatch[1]);
    if (!options.method || options.method === 'GET') {
      const result = await supabase.from('contacts').select(CONTACT_SELECT).eq('id', id).maybeSingle();
      if (result.error) throw apiError(result.error.message);
      if (!result.data) throw apiError('Contact not found.', {}, 404);
      const contact = decorate(result.data);
      contact.interactions = (contact.interactions || []).sort((a, b) => b.occurred_on.localeCompare(a.occurred_on) || b.id - a.id);
      return { contact };
    }
    if (options.method === 'PATCH') return { contact: decorate(check(await supabase.from('contacts').update(contactValues(options.body)).eq('id', id).select(CONTACT_SELECT).single(), 'Could not save the contact.')) };
    check(await supabase.from('contacts').delete().eq('id', id)); return null;
  }
  throw apiError('Unsupported request.', {}, 404);
}
