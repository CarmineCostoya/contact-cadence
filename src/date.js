export function monthValue(value) {
  return value ? String(value).slice(0, 7) : '';
}

export function monthToStoredDate(month, originalDate = '') {
  if (!month) return '';
  const original = String(originalDate).slice(0, 10);
  return original.startsWith(`${month}-`) ? original : `${month}-01`;
}

export function formatMonthYear(value) {
  const month = monthValue(value);
  if (!/^\d{4}-\d{2}$/.test(month)) return 'Not set';
  return new Date(`${month}-01T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
