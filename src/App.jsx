import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, exportContactsCsv } from './api.js';
import { formatMonthYear, monthToStoredDate, monthValue } from './date.js';

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const EMPTY_CONTACT = { name: '', organization: '', role: '', howMet: '', metOn: '', notes: '', nextFollowUpOn: '' };
const EMPTY_INTERACTION = { interactionType: 'Coffee chat', occurredOn: today(), notes: '' };

function formatDate(value) {
  if (!value) return 'Not set';
  const raw = String(value).slice(0, 10);
  return new Date(`${raw}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase();
}

function AuthPage({ mode, onAuthenticated }) {
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const isSignup = mode === 'signup';

  async function submit(event) {
    event.preventDefault();
    setErrors({}); setMessage(''); setBusy(true);
    try {
      const data = await api(`/auth/${mode}`, { method: 'POST', body: values });
      onAuthenticated(data.user);
      navigate('/dashboard');
    } catch (error) {
      setErrors(error.errors || {});
      setMessage(error.message);
    } finally { setBusy(false); }
  }

  return (
    <main className="auth-shell">
      <section className="auth-story" aria-label="About Contact Cadence">
        <Link className="brand brand-light" to="/"><span className="brand-mark">CC</span> Contact Cadence</Link>
        <div>
          <p className="eyebrow light">Relationships deserve attention</p>
          <h1>Remember the conversation.<br />Make the follow-up.</h1>
          <p>Keep the context from every coffee chat, class, and introduction in one private place.</p>
        </div>
        <p className="privacy-note">Private by default. Your contacts are visible only to you.</p>
      </section>
      <section className="auth-panel">
        <form className="auth-card" onSubmit={submit} noValidate>
          <p className="eyebrow">{isSignup ? 'Start your cadence' : 'Welcome back'}</p>
          <h2>{isSignup ? 'Create your account' : 'Log in'}</h2>
          <p className="muted">{isSignup ? 'A private workspace for your professional relationships.' : 'Pick up where you left off.'}</p>
          {message && <div className="alert error" role="alert">{message}</div>}
          <Field label="Email" error={errors.email}>
            <input type="email" autoComplete="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} required />
          </Field>
          <Field label="Password" error={errors.password} hint={isSignup ? 'At least 8 characters' : ''}>
            <input type="password" autoComplete={isSignup ? 'new-password' : 'current-password'} value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} required />
          </Field>
          <button className="button primary full" disabled={busy}>{busy ? 'Please wait…' : isSignup ? 'Create account' : 'Log in'}</button>
          <p className="auth-switch">{isSignup ? 'Already have an account?' : 'New to Contact Cadence?'}{' '}
            <Link to={isSignup ? '/login' : '/signup'}>{isSignup ? 'Log in' : 'Create one'}</Link>
          </p>
        </form>
      </section>
    </main>
  );
}

function Field({ label, error, hint, children, className = '' }) {
  return <label className={`field ${className}`}><span>{label}</span>{children}{error ? <small className="field-error">{error}</small> : hint ? <small>{hint}</small> : null}</label>;
}

function AppShell({ user, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  async function logout() { await api('/auth/logout', { method: 'POST' }); onLogout(); navigate('/login'); }
  const titles = location.pathname === '/contacts/new' ? ['Add a contact', 'Capture enough context to make the next conversation easier.']
    : location.pathname.startsWith('/contacts/') ? ['Contact details', 'Review the relationship and keep the next step clear.']
    : location.pathname === '/contacts' ? ['Contacts', 'Your private relationship directory.']
    : location.pathname === '/tags' ? ['Tags', 'Create reusable groups for your network.']
    : ['Dashboard', 'A quick view of your relationship rhythm.'];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to="/dashboard"><span className="brand-mark">CC</span><span>Contact Cadence</span></Link>
        <nav aria-label="Main navigation">
          <NavLink to="/dashboard">{({ isActive }) => <><span>⌂</span>Dashboard{isActive && <i />}</>}</NavLink>
          <NavLink to="/contacts">{({ isActive }) => <><span>◎</span>Contacts{isActive && <i />}</>}</NavLink>
          <NavLink to="/tags">{({ isActive }) => <><span>◇</span>Tags{isActive && <i />}</>}</NavLink>
        </nav>
        <div className="sidebar-user">
          <span className="avatar small">{user.email[0].toUpperCase()}</span>
          <div><strong>{user.email.split('@')[0]}</strong><small>{user.email}</small></div>
          <button className="icon-button" onClick={logout} title="Log out" aria-label="Log out">↪</button>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar"><div><h1>{titles[0]}</h1><p>{titles[1]}</p></div><Link className="button primary" to="/contacts/new">＋ Add contact</Link></header>
        <main className="page"><Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/contacts/new" element={<ContactEditor />} />
          <Route path="/contacts/:id" element={<ContactDetail />} />
          <Route path="/contacts/:id/edit" element={<ContactEditor />} />
          <Route path="/tags" element={<Tags />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes></main>
      </div>
    </div>
  );
}

function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/dashboard').then(setData).catch((e) => setError(e.message)); }, []);
  if (error) return <EmptyState title="Dashboard unavailable" body={error} />;
  if (!data) return <Loading />;
  return <div className="stack-xl">
    <section className="stat-grid">
      <Stat label="Total contacts" value={data.totalContacts} note="People in your network" tone="blue" />
      <Stat label="Interactions this month" value={data.interactionsThisMonth} note="Conversations recorded" tone="green" />
      <Stat label="Overdue follow-ups" value={data.overdueFollowUps} note={data.overdueFollowUps ? 'Ready for your attention' : 'You are all caught up'} tone={data.overdueFollowUps ? 'orange' : 'slate'} />
    </section>
    <div className="dashboard-grid">
      <section className="card chart-card"><CardHeading title="Your networking rhythm" subtitle="Interactions over the last six months" />
        <div className="chart-wrap" aria-label="Bar chart showing interactions by month">
          <ResponsiveContainer width="100%" height="100%"><BarChart data={data.monthlyInteractions} margin={{ top: 16, right: 6, left: -24, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" /><XAxis dataKey="month" axisLine={false} tickLine={false} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} /><Tooltip cursor={{ fill: '#f1f5f9' }} /><Bar dataKey="count" name="Interactions" fill="#2563eb" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
        </div>
      </section>
      <section className="card"><CardHeading title="Follow-up queue" subtitle="Overdue, today, and next 7 days" action={<Link to="/contacts?filter=upcoming">View contacts</Link>} />
        {data.dueContacts.length ? <div className="due-list">{data.dueContacts.map((contact) => <Link to={`/contacts/${contact.id}`} key={contact.id} className="due-row"><span className="avatar">{initials(contact.name)}</span><span><strong>{contact.name}</strong><small>{contact.organization || 'No organization'}</small></span><span className={`status ${contact.status}`}>{contact.status === 'today' ? 'Today' : contact.status === 'overdue' ? formatDate(contact.next_follow_up_on) : `Due ${formatDate(contact.next_follow_up_on)}`}</span></Link>)}</div>
          : <EmptyState compact title="No follow-ups due" body="Add a next follow-up date to a contact to build your queue." />}
      </section>
    </div>
    {data.totalContacts === 0 && <section className="welcome-card"><div><p className="eyebrow light">Start with one person</p><h2>Your network becomes useful when the context is easy to find.</h2><p>Add someone you met recently, then record the conversation and a next follow-up date.</p></div><Link className="button light" to="/contacts/new">Add your first contact</Link></section>}
  </div>;
}

function Stat({ label, value, note, tone }) { return <article className="stat-card"><span className={`stat-icon ${tone}`}>●</span><div><p>{label}</p><strong>{value}</strong><small>{note}</small></div></article>; }
function CardHeading({ title, subtitle, action }) { return <header className="card-heading"><div><h2>{title}</h2><p>{subtitle}</p></div>{action}</header>; }

function Contacts() {
  const location = useLocation();
  const initialFilter = new URLSearchParams(location.search).get('filter') || 'all';
  const [contacts, setContacts] = useState([]);
  const [tags, setTags] = useState([]);
  const [query, setQuery] = useState({ search: '', filter: initialFilter, tag: '', sort: 'recent' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(current = query) {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams(Object.entries(current).filter(([, value]) => value));
      const data = await api(`/contacts?${params}`);
      setContacts(data.contacts);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { api('/tags').then((data) => setTags(data.tags)); }, []);
  useEffect(() => { const timer = setTimeout(() => load(query), 220); return () => clearTimeout(timer); }, [query.search, query.filter, query.tag, query.sort]);

  async function toggleStar(contact) {
    await api(`/contacts/${contact.id}/star`, { method: contact.starred ? 'DELETE' : 'POST' });
    setContacts((items) => items.map((item) => item.id === contact.id ? { ...item, starred: !item.starred } : item));
  }

  return <div className="stack-lg">
    <section className="toolbar card">
      <label className="search"><span>⌕</span><input aria-label="Search contacts" placeholder="Search name or organization…" value={query.search} onChange={(e) => setQuery({ ...query, search: e.target.value })} /></label>
      <div className="toolbar-selects">
        <label><span>Show</span><select value={query.filter} onChange={(e) => setQuery({ ...query, filter: e.target.value })}><option value="all">All contacts</option><option value="starred">Starred</option><option value="overdue">Overdue</option><option value="today">Due today</option><option value="upcoming">Next 7 days</option></select></label>
        <label><span>Tag</span><select value={query.tag} onChange={(e) => setQuery({ ...query, tag: e.target.value })}><option value="">All tags</option>{tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}</select></label>
        <label><span>Sort</span><select value={query.sort} onChange={(e) => setQuery({ ...query, sort: e.target.value })}><option value="recent">Recently added</option><option value="name">Name A–Z</option><option value="lastInteraction">Last interaction</option><option value="followup">Next follow-up</option></select></label>
      </div>
      <button className="button secondary" type="button" onClick={() => exportContactsCsv().catch((e) => setError(e.message))}>⇩ Export CSV</button>
    </section>
    {error ? <EmptyState title="Could not load contacts" body={error} /> : loading ? <Loading /> : contacts.length ? <section className="contact-grid">{contacts.map((contact) => <ContactCard key={contact.id} contact={contact} onStar={() => toggleStar(contact)} />)}</section> : <EmptyState title={query.search || query.filter !== 'all' || query.tag ? 'No contacts match' : 'Your directory is empty'} body={query.search || query.filter !== 'all' || query.tag ? 'Try clearing a search or filter.' : 'Add your first contact to start remembering the details that matter.'} action={<Link className="button primary" to="/contacts/new">Add contact</Link>} />}
  </div>;
}

function ContactCard({ contact, onStar }) {
  const follow = contact.next_follow_up_on ? String(contact.next_follow_up_on).slice(0, 10) : null;
  const status = follow && follow < today() ? 'overdue' : follow === today() ? 'today' : 'upcoming';
  return <article className="contact-card">
    <div className="contact-card-top"><Link to={`/contacts/${contact.id}`} className="contact-person"><span className="avatar large">{initials(contact.name)}</span><span><h2>{contact.name}</h2><p>{[contact.role, contact.organization].filter(Boolean).join(' at ') || 'Add role or organization'}</p></span></Link><button className={`star ${contact.starred ? 'active' : ''}`} onClick={onStar} aria-label={`${contact.starred ? 'Unstar' : 'Star'} ${contact.name}`}>★</button></div>
    <div className="tag-row">{contact.tags.length ? contact.tags.map((tag) => <span className="tag" key={tag.id}>{tag.name}</span>) : <span className="muted small-text">No tags</span>}</div>
    <div className="contact-meta"><span><small>Last interaction</small><strong>{contact.last_interaction_on ? formatDate(contact.last_interaction_on) : 'None yet'}</strong></span><span><small>Next follow-up</small><strong className={follow && status === 'overdue' ? 'danger-text' : ''}>{follow ? formatDate(follow) : 'Not set'}</strong></span></div>
    <Link className="card-link" to={`/contacts/${contact.id}`}>View relationship <span>→</span></Link>
  </article>;
}

function ContactForm({ initial = EMPTY_CONTACT, tags = [], onSubmit, submitLabel, errors = {}, busy }) {
  const [values, setValues] = useState({
    ...EMPTY_CONTACT,
    ...initial,
    tagIds: initial.tagIds || initial.tags?.map((tag) => tag.id) || [],
  });
  function update(key, value) { setValues({ ...values, [key]: value }); }
  function toggleTag(tagId, checked) {
    const current = values.tagIds || [];
    update('tagIds', checked ? [...current, tagId] : current.filter((id) => id !== tagId));
  }
  return <form className="form-card card" onSubmit={(event) => { event.preventDefault(); onSubmit(values); }} noValidate>
    <div className="form-grid">
      <Field label="Name *" error={errors.name} className="wide"><input value={values.name} onChange={(e) => update('name', e.target.value)} maxLength="120" autoFocus required /></Field>
      <Field label="Organization"><input value={values.organization || ''} onChange={(e) => update('organization', e.target.value)} maxLength="160" /></Field>
      <Field label="Role"><input value={values.role || ''} onChange={(e) => update('role', e.target.value)} maxLength="160" /></Field>
      <Field label="How or where did you meet?" className="wide"><input value={values.howMet || ''} onChange={(e) => update('howMet', e.target.value)} maxLength="300" placeholder="Haas event, introduction, class…" /></Field>
      <Field label="Date met" error={errors.metOn} hint="Month and year"><input type="month" max={today().slice(0, 7)} value={monthValue(values.metOn)} onChange={(e) => update('metOn', e.target.value)} /></Field>
      <Field label="Next follow-up" error={errors.nextFollowUpOn}><input type="date" value={values.nextFollowUpOn || ''} onChange={(e) => update('nextFollowUpOn', e.target.value)} /></Field>
      <fieldset className="tag-picker wide">
        <legend>Tags</legend>
        <p>Select any groups that describe this relationship. You can change them later.</p>
        {tags.length ? <div className="tag-picker-options">{tags.map((tag) => <label key={tag.id}><input type="checkbox" checked={values.tagIds.includes(tag.id)} onChange={(event) => toggleTag(tag.id, event.target.checked)} /><span>{tag.name}</span></label>)}</div>
          : <p className="tag-picker-empty">No tags yet. <Link to="/tags">Create a reusable tag</Link> before adding this contact if you want to group it.</p>}
      </fieldset>
      <Field label="Relationship notes" className="wide" hint="Keep sensitive or confidential information out of demo entries."><textarea rows="6" maxLength="2000" value={values.notes || ''} onChange={(e) => update('notes', e.target.value)} placeholder="Context worth remembering for the next conversation…" /></Field>
    </div>
    <div className="form-actions"><Link className="button ghost" to={initial.id ? `/contacts/${initial.id}` : '/contacts'}>Cancel</Link><button className="button primary" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button></div>
  </form>;
}

function ContactEditor() {
  const { id } = useParams();
  const editing = Boolean(id);
  const [contact, setContact] = useState(null);
  const [tags, setTags] = useState([]);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    const contactRequest = editing ? api(`/contacts/${id}`) : Promise.resolve({ contact: EMPTY_CONTACT });
    Promise.all([contactRequest, api('/tags')]).then(([contactData, tagData]) => {
      const saved = contactData.contact;
      const storedMetOn = String(saved.met_on || saved.metOn || '').slice(0, 10);
      setContact({ ...saved, howMet: saved.how_met || saved.howMet, metOn: monthValue(storedMetOn), originalMetOn: storedMetOn, nextFollowUpOn: String(saved.next_follow_up_on || saved.nextFollowUpOn || '').slice(0, 10), tagIds: saved.tags?.map((tag) => tag.id) || [] });
      setTags(tagData.tags);
    }).catch((e) => setMessage(e.message));
  }, [id, editing]);
  async function save(values) {
    setErrors({}); setMessage(''); setBusy(true);
    try {
      const { tagIds = [], originalMetOn = '', ...contactValues } = values;
      contactValues.metOn = monthToStoredDate(contactValues.metOn, originalMetOn);
      const data = await api(editing ? `/contacts/${id}` : '/contacts', { method: editing ? 'PATCH' : 'POST', body: contactValues });
      await api(`/contacts/${data.contact.id}/tags`, { method: 'PUT', body: { tagIds } });
      navigate(`/contacts/${data.contact.id}`);
    }
    catch (e) { setErrors(e.errors || {}); setMessage(e.message); }
    finally { setBusy(false); }
  }
  if (!contact && !message) return <Loading />;
  return <div className="narrow stack-lg">{message && <div className="alert error">{message}</div>}{contact && <ContactForm initial={contact} tags={tags} onSubmit={save} errors={errors} busy={busy} submitLabel={editing ? 'Save changes' : 'Add contact'} />}</div>;
}

function ContactDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState(null);
  const [tags, setTags] = useState([]);
  const [interaction, setInteraction] = useState(EMPTY_INTERACTION);
  const [interactionErrors, setInteractionErrors] = useState({});
  const [message, setMessage] = useState('');
  const [showInteraction, setShowInteraction] = useState(false);
  async function load() {
    try { const [contactData, tagData] = await Promise.all([api(`/contacts/${id}`), api('/tags')]); setContact(contactData.contact); setTags(tagData.tags); }
    catch (e) { setMessage(e.message); }
  }
  useEffect(() => { load(); }, [id]);
  async function toggleStar() { await api(`/contacts/${id}/star`, { method: contact.starred ? 'DELETE' : 'POST' }); setContact({ ...contact, starred: !contact.starred }); }
  async function addInteraction(event) {
    event.preventDefault(); setInteractionErrors({}); setMessage('');
    try { await api(`/contacts/${id}/interactions`, { method: 'POST', body: interaction }); setInteraction(EMPTY_INTERACTION); setShowInteraction(false); await load(); }
    catch (e) { setInteractionErrors(e.errors || {}); setMessage(e.message); }
  }
  async function removeInteraction(interactionId) { if (window.confirm('Delete this interaction?')) { await api(`/contacts/${id}/interactions/${interactionId}`, { method: 'DELETE' }); await load(); } }
  async function assignTag(tagId, checked) {
    const current = contact.tags.map((tag) => tag.id);
    const tagIds = checked ? [...current, tagId] : current.filter((value) => value !== tagId);
    const data = await api(`/contacts/${id}/tags`, { method: 'PUT', body: { tagIds } });
    setContact({ ...contact, tags: data.tags });
  }
  async function removeContact() { if (window.confirm(`Delete ${contact.name}? This also deletes every interaction and cannot be undone.`)) { await api(`/contacts/${id}`, { method: 'DELETE' }); navigate('/contacts'); } }
  if (message && !contact) return <EmptyState title="Contact unavailable" body={message} />;
  if (!contact) return <Loading />;
  return <div className="stack-lg">
    {message && <div className="alert error">{message}</div>}
    <section className="profile-card card">
      <div className="profile-main"><span className="avatar xlarge">{initials(contact.name)}</span><div><div className="profile-title"><h2>{contact.name}</h2><button className={`star ${contact.starred ? 'active' : ''}`} onClick={toggleStar} aria-label={contact.starred ? 'Unstar contact' : 'Star contact'}>★</button></div><p>{[contact.role, contact.organization].filter(Boolean).join(' at ') || 'No role or organization yet'}</p><div className="tag-row">{contact.tags.map((tag) => <span className="tag" key={tag.id}>{tag.name}</span>)}</div></div></div>
      <div className="profile-actions"><Link className="button secondary" to={`/contacts/${id}/edit`}>Edit contact</Link><button className="button danger-ghost" onClick={removeContact}>Delete</button></div>
    </section>
    <div className="detail-grid">
      <div className="stack-lg">
        <section className="card"><CardHeading title="Relationship context" subtitle="The details to remember next time" />
          <dl className="detail-list"><div><dt>How you met</dt><dd>{contact.how_met || 'Not added'}</dd></div><div><dt>Date met</dt><dd>{formatMonthYear(contact.met_on)}</dd></div><div><dt>Next follow-up</dt><dd>{formatDate(contact.next_follow_up_on)}</dd></div><div className="wide"><dt>Notes</dt><dd className="notes">{contact.notes || 'No relationship notes yet.'}</dd></div></dl>
        </section>
        <section className="card"><CardHeading title="Interaction timeline" subtitle={`${contact.interactions.length} recorded ${contact.interactions.length === 1 ? 'interaction' : 'interactions'}`} action={<button className="button small primary" onClick={() => setShowInteraction(!showInteraction)}>＋ Log interaction</button>} />
          {showInteraction && <form className="inline-form" onSubmit={addInteraction}><Field label="Type" error={interactionErrors.interactionType}><select value={interaction.interactionType} onChange={(e) => setInteraction({ ...interaction, interactionType: e.target.value })}>{['Meeting','Coffee chat','Call','Message','Email','Event','Other'].map((type) => <option key={type}>{type}</option>)}</select></Field><Field label="Date" error={interactionErrors.occurredOn}><input type="date" max={today()} value={interaction.occurredOn} onChange={(e) => setInteraction({ ...interaction, occurredOn: e.target.value })} /></Field><Field label="Notes" className="wide"><textarea rows="3" maxLength="2000" value={interaction.notes} onChange={(e) => setInteraction({ ...interaction, notes: e.target.value })} /></Field><div className="wide form-actions"><button type="button" className="button ghost" onClick={() => setShowInteraction(false)}>Cancel</button><button className="button primary">Save interaction</button></div></form>}
          {contact.interactions.length ? <div className="timeline">{contact.interactions.map((item) => <article key={item.id}><span className="timeline-dot" /><div><header><strong>{item.interaction_type}</strong><time>{formatDate(item.occurred_on)}</time></header><p>{item.notes || 'No notes added.'}</p></div><button className="icon-button" onClick={() => removeInteraction(item.id)} aria-label={`Delete ${item.interaction_type}`}>×</button></article>)}</div> : <EmptyState compact title="No interactions yet" body="Log the first conversation to start the relationship timeline." />}
        </section>
      </div>
      <aside className="stack-lg"><section className="card"><CardHeading title="Tags" subtitle="Group this relationship" action={<Link to="/tags">Manage</Link>} />{tags.length ? <div className="check-list">{tags.map((tag) => <label key={tag.id}><input type="checkbox" checked={contact.tags.some((item) => item.id === tag.id)} onChange={(e) => assignTag(tag.id, e.target.checked)} /><span>{tag.name}</span></label>)}</div> : <p className="muted">Create a tag first to group this contact.</p>}</section>
        <section className="card next-step"><p className="eyebrow">Next step</p><strong>{contact.next_follow_up_on ? formatDate(contact.next_follow_up_on) : 'No follow-up scheduled'}</strong><p>{contact.next_follow_up_on ? 'This contact will appear in your dashboard queue when the date is close.' : 'Edit this contact to choose a date and build your follow-up queue.'}</p></section>
      </aside>
    </div>
  </div>;
}

function Tags() {
  const [tags, setTags] = useState([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  async function load() { const data = await api('/tags'); setTags(data.tags); }
  useEffect(() => { load(); }, []);
  async function add(event) { event.preventDefault(); setError(''); try { await api('/tags', { method: 'POST', body: { name } }); setName(''); await load(); } catch (e) { setError(e.errors?.name || e.message); } }
  async function rename(tag) { const next = window.prompt('Rename this tag:', tag.name); if (next && next !== tag.name) { try { await api(`/tags/${tag.id}`, { method: 'PATCH', body: { name: next } }); await load(); } catch (e) { setError(e.errors?.name || e.message); } } }
  async function remove(tag) { if (window.confirm(`Delete the “${tag.name}” tag? Contacts will remain in your directory.`)) { await api(`/tags/${tag.id}`, { method: 'DELETE' }); await load(); } }
  return <div className="narrow stack-lg"><section className="card"><CardHeading title="Create a tag" subtitle="Tags are private to your account and reusable across contacts." /><form className="tag-form" onSubmit={add}><input aria-label="New tag name" maxLength="30" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Haas, Alumni, Product" /><button className="button primary">Add tag</button></form>{error && <p className="field-error">{error}</p>}</section>
    <section className="card"><CardHeading title="Your tags" subtitle={`${tags.length} ${tags.length === 1 ? 'tag' : 'tags'}`} />{tags.length ? <div className="tag-manager">{tags.map((tag) => <div key={tag.id}><span className="tag">{tag.name}</span><span><button className="button ghost small" onClick={() => rename(tag)}>Rename</button><button className="button danger-ghost small" onClick={() => remove(tag)}>Delete</button></span></div>)}</div> : <EmptyState compact title="No tags yet" body="Create your first tag above." />}</section>
  </div>;
}

function EmptyState({ title, body, action, compact = false }) { return <div className={`empty-state ${compact ? 'compact' : 'card'}`}><span>◎</span><h3>{title}</h3><p>{body}</p>{action}</div>; }
function Loading() { return <div className="loading" role="status"><span /> Loading…</div>; }

export default function App() {
  const [user, setUser] = useState(undefined);
  useEffect(() => { api('/auth/me').then((data) => setUser(data.user)).catch(() => setUser(null)); }, []);
  if (user === undefined) return <div className="splash"><span className="brand-mark">CC</span><p>Contact Cadence</p></div>;
  return <Routes>
    <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage mode="login" onAuthenticated={setUser} />} />
    <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage mode="signup" onAuthenticated={setUser} />} />
    <Route path="/*" element={user ? <AppShell user={user} onLogout={() => setUser(null)} /> : <Navigate to="/login" replace />} />
  </Routes>;
}
