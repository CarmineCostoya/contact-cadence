const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const INTERACTION_TYPES = ['Meeting', 'Coffee chat', 'Call', 'Message', 'Email', 'Event', 'Other'];

function cleanOptional(value, max) {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value).trim();
  return text.slice(0, max);
}

function validDate(value) {
  if (!value) return true;
  if (!DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateAuth(body, isSignup = false) {
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const errors = {};
  if (!EMAIL_PATTERN.test(email) || email.length > 254) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Enter your password.';
  if (isSignup && password.length < 8) errors.password = 'Use at least 8 characters.';
  if (password.length > 200) errors.password = 'Password is too long.';
  return { values: { email, password }, errors };
}

export function validateContact(body) {
  const values = {
    name: String(body.name || '').trim().slice(0, 120),
    organization: cleanOptional(body.organization, 160),
    role: cleanOptional(body.role, 160),
    howMet: cleanOptional(body.howMet, 300),
    metOn: cleanOptional(body.metOn, 10),
    notes: cleanOptional(body.notes, 2000),
    nextFollowUpOn: cleanOptional(body.nextFollowUpOn, 10),
  };
  const errors = {};
  if (!values.name) errors.name = 'Name is required.';
  if (body.name && String(body.name).trim().length > 120) errors.name = 'Name must be 120 characters or fewer.';
  if (!validDate(values.metOn)) errors.metOn = 'Enter a valid date.';
  if (values.metOn && values.metOn > new Date().toISOString().slice(0, 10)) errors.metOn = 'The date you met cannot be in the future.';
  if (!validDate(values.nextFollowUpOn)) errors.nextFollowUpOn = 'Enter a valid date.';
  return { values, errors };
}

export function validateInteraction(body) {
  const values = {
    interactionType: String(body.interactionType || ''),
    occurredOn: String(body.occurredOn || ''),
    notes: cleanOptional(body.notes, 2000),
  };
  const errors = {};
  if (!INTERACTION_TYPES.includes(values.interactionType)) errors.interactionType = 'Choose an interaction type.';
  if (!validDate(values.occurredOn) || !values.occurredOn) errors.occurredOn = 'Enter a valid date.';
  if (values.occurredOn > new Date().toISOString().slice(0, 10)) errors.occurredOn = 'Interaction date cannot be in the future.';
  return { values, errors };
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
