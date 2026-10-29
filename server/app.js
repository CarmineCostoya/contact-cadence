import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import bcrypt from 'bcryptjs';
import helmet from 'helmet';
import { hasErrors, validateAuth, validateContact, validateInteraction } from './validation.js';

const PgSession = connectPgSimple(session);
const DAY_MS = 86_400_000;

function isoDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function databaseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function addDays(value, days) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Please log in to continue.' });
  next();
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

async function ownedContact(pool, contactId, userId) {
  const result = await pool.query('SELECT * FROM contacts WHERE id = $1 AND user_id = $2', [contactId, userId]);
  return result.rows[0] || null;
}

async function decorateContacts(pool, contacts, userId) {
  if (!contacts.length) return [];
  const ids = contacts.map((contact) => contact.id);
  const [stars, tags, interactions] = await Promise.all([
    pool.query('SELECT contact_id FROM stars WHERE user_id = $1 AND contact_id = ANY($2::int[])', [userId, ids]),
    pool.query(
      `SELECT ct.contact_id, t.id, t.name
       FROM contact_tags ct JOIN tags t ON t.id = ct.tag_id
       WHERE t.user_id = $1 AND ct.contact_id = ANY($2::int[])
       ORDER BY LOWER(t.name)`,
      [userId, ids],
    ),
    pool.query(
      `SELECT contact_id, COUNT(*)::int AS interaction_count, MAX(occurred_on) AS last_interaction_on
       FROM interactions WHERE contact_id = ANY($1::int[]) GROUP BY contact_id`,
      [ids],
    ),
  ]);
  const starred = new Set(stars.rows.map((row) => Number(row.contact_id)));
  const tagMap = new Map();
  for (const row of tags.rows) {
    const list = tagMap.get(Number(row.contact_id)) || [];
    list.push({ id: row.id, name: row.name });
    tagMap.set(Number(row.contact_id), list);
  }
  const interactionMap = new Map(interactions.rows.map((row) => [Number(row.contact_id), row]));
  return contacts.map((contact) => {
    const summary = interactionMap.get(Number(contact.id));
    return {
      ...contact,
      starred: starred.has(Number(contact.id)),
      tags: tagMap.get(Number(contact.id)) || [],
      interaction_count: summary?.interaction_count || 0,
      last_interaction_on: summary?.last_interaction_on || null,
    };
  });
}

function sessionStore(pool, suppliedStore) {
  if (suppliedStore) return suppliedStore;
  return new PgSession({ pool, tableName: 'user_sessions', createTableIfMissing: true });
}

export function createApp({ pool, store, sessionSecret = process.env.SESSION_SECRET || 'development-only-secret' }) {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({ limit: '100kb' }));
  app.use(session({
    store: sessionStore(pool, store),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: 'contact_cadence.sid',
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.post('/api/auth/signup', asyncRoute(async (req, res) => {
    const { values, errors } = validateAuth(req.body, true);
    if (hasErrors(errors)) return res.status(400).json({ errors });
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [values.email]);
    if (existing.rowCount) return res.status(400).json({ errors: { email: 'An account with this email already exists.' } });
    const passwordHash = await bcrypt.hash(values.password, 12);
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [values.email, passwordHash],
    );
    req.session.regenerate((error) => {
      if (error) return res.status(500).json({ error: 'Could not start your session.' });
      req.session.userId = result.rows[0].id;
      res.status(201).json({ user: result.rows[0] });
    });
  }));

  app.post('/api/auth/login', asyncRoute(async (req, res) => {
    const { values, errors } = validateAuth(req.body);
    if (hasErrors(errors)) return res.status(400).json({ errors });
    const result = await pool.query('SELECT id, email, password_hash, created_at FROM users WHERE email = $1', [values.email]);
    const user = result.rows[0];
    const matches = user ? await bcrypt.compare(values.password, user.password_hash) : false;
    if (!matches) return res.status(401).json({ error: 'Email or password is incorrect.' });
    req.session.regenerate((error) => {
      if (error) return res.status(500).json({ error: 'Could not start your session.' });
      req.session.userId = user.id;
      res.json({ user: { id: user.id, email: user.email, created_at: user.created_at } });
    });
  }));

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => {
      res.clearCookie('contact_cadence.sid');
      res.status(204).end();
    });
  });

  app.get('/api/auth/me', asyncRoute(async (req, res) => {
    if (!req.session.userId) return res.json({ user: null });
    const result = await pool.query('SELECT id, email, created_at FROM users WHERE id = $1', [req.session.userId]);
    res.json({ user: result.rows[0] || null });
  }));

  app.use('/api', requireAuth);

  app.get('/api/contacts', asyncRoute(async (req, res) => {
    const { search = '', filter = 'all', tag = '', sort = 'recent' } = req.query;
    const today = isoDate();
    const params = [req.session.userId];
    const where = ['c.user_id = $1'];
    if (search.trim()) {
      params.push(`%${search.trim()}%`);
      where.push(`(c.name ILIKE $${params.length} OR COALESCE(c.organization, '') ILIKE $${params.length})`);
    }
    if (filter === 'starred') where.push('EXISTS (SELECT 1 FROM stars s WHERE s.contact_id = c.id AND s.user_id = c.user_id)');
    if (filter === 'overdue') { params.push(today); where.push(`c.next_follow_up_on < $${params.length}`); }
    if (filter === 'today') { params.push(today); where.push(`c.next_follow_up_on = $${params.length}`); }
    if (filter === 'upcoming') {
      params.push(today, addDays(today, 7));
      where.push(`c.next_follow_up_on > $${params.length - 1} AND c.next_follow_up_on <= $${params.length}`);
    }
    if (tag) {
      params.push(Number(tag));
      where.push(`EXISTS (SELECT 1 FROM contact_tags ct JOIN tags t ON t.id = ct.tag_id WHERE ct.contact_id = c.id AND t.id = $${params.length} AND t.user_id = c.user_id)`);
    }
    const order = {
      name: 'LOWER(c.name) ASC',
      followup: 'c.next_follow_up_on ASC NULLS LAST, LOWER(c.name) ASC',
      lastInteraction: '(SELECT MAX(i.occurred_on) FROM interactions i WHERE i.contact_id = c.id) DESC NULLS LAST',
      recent: 'c.created_at DESC',
    }[sort] || 'c.created_at DESC';
    const result = await pool.query(`SELECT c.* FROM contacts c WHERE ${where.join(' AND ')} ORDER BY ${order}`, params);
    res.json({ contacts: await decorateContacts(pool, result.rows, req.session.userId) });
  }));

  app.post('/api/contacts', asyncRoute(async (req, res) => {
    const { values, errors } = validateContact(req.body);
    if (hasErrors(errors)) return res.status(400).json({ errors });
    const result = await pool.query(
      `INSERT INTO contacts (user_id, name, organization, role, how_met, met_on, notes, next_follow_up_on)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.session.userId, values.name, values.organization, values.role, values.howMet, values.metOn, values.notes, values.nextFollowUpOn],
    );
    res.status(201).json({ contact: (await decorateContacts(pool, result.rows, req.session.userId))[0] });
  }));

  app.get('/api/contacts/:id', asyncRoute(async (req, res) => {
    const contact = await ownedContact(pool, req.params.id, req.session.userId);
    if (!contact) return res.status(404).json({ error: 'Contact not found.' });
    const [decorated] = await decorateContacts(pool, [contact], req.session.userId);
    const interactions = await pool.query('SELECT * FROM interactions WHERE contact_id = $1 ORDER BY occurred_on DESC, id DESC', [contact.id]);
    res.json({ contact: { ...decorated, interactions: interactions.rows } });
  }));

  app.patch('/api/contacts/:id', asyncRoute(async (req, res) => {
    const contact = await ownedContact(pool, req.params.id, req.session.userId);
    if (!contact) return res.status(404).json({ error: 'Contact not found.' });
    const { values, errors } = validateContact(req.body);
    if (hasErrors(errors)) return res.status(400).json({ errors });
    const result = await pool.query(
      `UPDATE contacts SET name=$1, organization=$2, role=$3, how_met=$4, met_on=$5, notes=$6,
       next_follow_up_on=$7, updated_at=NOW() WHERE id=$8 AND user_id=$9 RETURNING *`,
      [values.name, values.organization, values.role, values.howMet, values.metOn, values.notes, values.nextFollowUpOn, contact.id, req.session.userId],
    );
    res.json({ contact: (await decorateContacts(pool, result.rows, req.session.userId))[0] });
  }));

  app.delete('/api/contacts/:id', asyncRoute(async (req, res) => {
    const result = await pool.query('DELETE FROM contacts WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.session.userId]);
    if (!result.rowCount) return res.status(404).json({ error: 'Contact not found.' });
    res.status(204).end();
  }));

  app.post('/api/contacts/:id/star', asyncRoute(async (req, res) => {
    const contact = await ownedContact(pool, req.params.id, req.session.userId);
    if (!contact) return res.status(404).json({ error: 'Contact not found.' });
    await pool.query('INSERT INTO stars (user_id, contact_id) VALUES ($1,$2) ON CONFLICT (user_id, contact_id) DO NOTHING', [req.session.userId, contact.id]);
    res.status(201).json({ starred: true });
  }));

  app.delete('/api/contacts/:id/star', asyncRoute(async (req, res) => {
    const contact = await ownedContact(pool, req.params.id, req.session.userId);
    if (!contact) return res.status(404).json({ error: 'Contact not found.' });
    await pool.query('DELETE FROM stars WHERE user_id = $1 AND contact_id = $2', [req.session.userId, contact.id]);
    res.status(204).end();
  }));

  app.post('/api/contacts/:id/interactions', asyncRoute(async (req, res) => {
    const contact = await ownedContact(pool, req.params.id, req.session.userId);
    if (!contact) return res.status(404).json({ error: 'Contact not found.' });
    const { values, errors } = validateInteraction(req.body);
    if (hasErrors(errors)) return res.status(400).json({ errors });
    const result = await pool.query(
      'INSERT INTO interactions (contact_id, interaction_type, occurred_on, notes) VALUES ($1,$2,$3,$4) RETURNING *',
      [contact.id, values.interactionType, values.occurredOn, values.notes],
    );
    res.status(201).json({ interaction: result.rows[0] });
  }));

  app.patch('/api/contacts/:id/interactions/:interactionId', asyncRoute(async (req, res) => {
    const contact = await ownedContact(pool, req.params.id, req.session.userId);
    if (!contact) return res.status(404).json({ error: 'Contact not found.' });
    const { values, errors } = validateInteraction(req.body);
    if (hasErrors(errors)) return res.status(400).json({ errors });
    const result = await pool.query(
      'UPDATE interactions SET interaction_type=$1, occurred_on=$2, notes=$3 WHERE id=$4 AND contact_id=$5 RETURNING *',
      [values.interactionType, values.occurredOn, values.notes, req.params.interactionId, contact.id],
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Interaction not found.' });
    res.json({ interaction: result.rows[0] });
  }));

  app.delete('/api/contacts/:id/interactions/:interactionId', asyncRoute(async (req, res) => {
    const contact = await ownedContact(pool, req.params.id, req.session.userId);
    if (!contact) return res.status(404).json({ error: 'Contact not found.' });
    const result = await pool.query('DELETE FROM interactions WHERE id=$1 AND contact_id=$2 RETURNING id', [req.params.interactionId, contact.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Interaction not found.' });
    res.status(204).end();
  }));

  app.get('/api/tags', asyncRoute(async (req, res) => {
    const result = await pool.query('SELECT id, name FROM tags WHERE user_id = $1 ORDER BY LOWER(name)', [req.session.userId]);
    res.json({ tags: result.rows });
  }));

  app.post('/api/tags', asyncRoute(async (req, res) => {
    const name = String(req.body.name || '').trim();
    if (!name || name.length > 30) return res.status(400).json({ errors: { name: 'Tag name must be 1–30 characters.' } });
    try {
      const result = await pool.query('INSERT INTO tags (user_id, name) VALUES ($1,$2) RETURNING id, name', [req.session.userId, name]);
      res.status(201).json({ tag: result.rows[0] });
    } catch (error) {
      if (error.code === '23505') return res.status(400).json({ errors: { name: 'You already have a tag with this name.' } });
      throw error;
    }
  }));

  app.patch('/api/tags/:id', asyncRoute(async (req, res) => {
    const name = String(req.body.name || '').trim();
    if (!name || name.length > 30) return res.status(400).json({ errors: { name: 'Tag name must be 1–30 characters.' } });
    try {
      const result = await pool.query('UPDATE tags SET name=$1 WHERE id=$2 AND user_id=$3 RETURNING id, name', [name, req.params.id, req.session.userId]);
      if (!result.rowCount) return res.status(404).json({ error: 'Tag not found.' });
      res.json({ tag: result.rows[0] });
    } catch (error) {
      if (error.code === '23505') return res.status(400).json({ errors: { name: 'You already have a tag with this name.' } });
      throw error;
    }
  }));

  app.delete('/api/tags/:id', asyncRoute(async (req, res) => {
    const result = await pool.query('DELETE FROM tags WHERE id=$1 AND user_id=$2 RETURNING id', [req.params.id, req.session.userId]);
    if (!result.rowCount) return res.status(404).json({ error: 'Tag not found.' });
    res.status(204).end();
  }));

  app.put('/api/contacts/:id/tags', asyncRoute(async (req, res) => {
    const contact = await ownedContact(pool, req.params.id, req.session.userId);
    if (!contact) return res.status(404).json({ error: 'Contact not found.' });
    const tagIds = [...new Set((Array.isArray(req.body.tagIds) ? req.body.tagIds : []).map(Number).filter(Number.isInteger))];
    if (tagIds.length) {
      const allowed = await pool.query('SELECT id FROM tags WHERE user_id=$1 AND id=ANY($2::int[])', [req.session.userId, tagIds]);
      if (allowed.rowCount !== tagIds.length) return res.status(400).json({ error: 'One or more tags are invalid.' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM contact_tags WHERE contact_id=$1', [contact.id]);
      for (const tagId of tagIds) await client.query('INSERT INTO contact_tags (contact_id, tag_id) VALUES ($1,$2)', [contact.id, tagId]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    const [decorated] = await decorateContacts(pool, [contact], req.session.userId);
    res.json({ tags: decorated.tags });
  }));

  app.get('/api/dashboard', asyncRoute(async (req, res) => {
    const today = isoDate();
    const monthStart = `${today.slice(0, 7)}-01`;
    const [contactRows, monthInteractions, allInteractions, dueContacts] = await Promise.all([
      pool.query(
        'SELECT next_follow_up_on FROM contacts WHERE user_id=$1',
        [req.session.userId],
      ),
      pool.query(
        `SELECT COUNT(*)::int AS interactions_this_month FROM interactions i
         JOIN contacts c ON c.id=i.contact_id WHERE c.user_id=$1 AND i.occurred_on >= $2 AND i.occurred_on <= $3`,
        [req.session.userId, monthStart, today],
      ),
      pool.query(
        `SELECT i.occurred_on FROM interactions i JOIN contacts c ON c.id=i.contact_id
         WHERE c.user_id=$1 AND i.occurred_on >= $2 ORDER BY i.occurred_on`,
        [req.session.userId, addDays(`${today.slice(0, 7)}-01`, -155)],
      ),
      pool.query(
        `SELECT id, name, organization, next_follow_up_on FROM contacts
         WHERE user_id=$1 AND next_follow_up_on IS NOT NULL AND next_follow_up_on <= $2
         ORDER BY next_follow_up_on ASC LIMIT 8`,
        [req.session.userId, addDays(today, 7)],
      ),
    ]);
    const monthly = [];
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - offset);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthly.push({ key, month: date.toLocaleString('en-US', { month: 'short' }), count: 0 });
    }
    for (const row of allInteractions.rows) {
      const key = databaseDate(row.occurred_on).slice(0, 7);
      const bucket = monthly.find((item) => item.key === key);
      if (bucket) bucket.count += 1;
    }
    const overdueFollowUps = contactRows.rows.filter((row) => row.next_follow_up_on && databaseDate(row.next_follow_up_on) < today).length;
    res.json({
      totalContacts: contactRows.rowCount,
      overdueFollowUps,
      interactionsThisMonth: monthInteractions.rows[0].interactions_this_month,
      monthlyInteractions: monthly.map(({ month, count }) => ({ month, count })),
      dueContacts: dueContacts.rows.map((contact) => ({
        ...contact,
        status: contact.next_follow_up_on < today ? 'overdue' : contact.next_follow_up_on === today ? 'today' : 'upcoming',
      })),
    });
  }));

  function safeCsv(value) {
    if (value === null || value === undefined) return '';
    let text = String(value);
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  }

  app.get('/api/export/contacts.csv', asyncRoute(async (req, res) => {
    const result = await pool.query('SELECT * FROM contacts WHERE user_id=$1 ORDER BY LOWER(name)', [req.session.userId]);
    const contacts = await decorateContacts(pool, result.rows, req.session.userId);
    const headers = ['Name', 'Organization', 'Role', 'How met', 'Date met', 'Next follow-up', 'Notes', 'Tags', 'Starred', 'Interaction count', 'Last interaction'];
    const rows = contacts.map((contact) => [
      contact.name, contact.organization, contact.role, contact.how_met, contact.met_on,
      contact.next_follow_up_on, contact.notes, contact.tags.map((tag) => tag.name).join('; '),
      contact.starred ? 'Yes' : 'No', contact.interaction_count, contact.last_interaction_on,
    ].map(safeCsv).join(','));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="contact-cadence-${todayForFilename()}.csv"`);
    res.send([headers.map(safeCsv).join(','), ...rows].join('\n'));
  }));

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });

  return app;
}

function todayForFilename() {
  return isoDate().replaceAll('-', '');
}

export { isoDate, addDays, DAY_MS };
