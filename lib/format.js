// Shared formatting helpers.

export const TERM_LABELS = {
  'month-to-month': 'Month-to-month',
  'fixed-3': 'Fixed - 3 month',
  'fixed-6': 'Fixed - 6 month',
  'fixed-12': 'Fixed - 12 month',
};

export const TERM_MONTHS = {
  'fixed-3': 3,
  'fixed-6': 6,
  'fixed-12': 12,
};

export function money(v) {
  const n = Number(v);
  if (v === undefined || v === null || v === '' || isNaN(n)) return '$0.00';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Adds whole months to an ISO date string (YYYY-MM-DD), returns ISO date.
export function addMonths(isoDate, months) {
  if (!isoDate) return null;
  const d = new Date(isoDate + 'T00:00:00');
  d.setMonth(d.getMonth() + Number(months));
  // The agreement runs through the day before the anniversary.
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Adds days to an ISO date string.
export function addDays(isoDate, days) {
  if (!isoDate) return null;
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + Number(days));
  return d.toISOString().slice(0, 10);
}

export function daysUntil(isoDate) {
  if (!isoDate) return null;
  const end = new Date(isoDate + 'T00:00:00').getTime();
  const now = Date.now();
  return Math.ceil((end - now) / 86400000);
}

export function prettyDate(isoDate) {
  if (!isoDate) return '____________';
  const d = new Date(isoDate + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function threeDigits(n) {
  let out = '';
  if (n >= 100) { out += ONES[Math.floor(n / 100)] + ' Hundred'; n %= 100; if (n) out += ' '; }
  if (n >= 20) { out += TENS[Math.floor(n / 10)]; if (n % 10) out += '-' + ONES[n % 10]; }
  else if (n > 0) { out += ONES[n]; }
  return out;
}

// "1800" -> "One Thousand Eight Hundred and No/100 Dollars"
export function dollarsInWords(v) {
  let n = Math.round(Number(v) || 0);
  if (n === 0) return 'Zero and No/100 Dollars';
  const parts = [];
  const scales = [['Million', 1000000], ['Thousand', 1000]];
  for (const [name, size] of scales) {
    if (n >= size) { parts.push(threeDigits(Math.floor(n / size)) + ' ' + name); n %= size; }
  }
  if (n > 0) parts.push(threeDigits(n));
  return parts.join(' ') + ' and No/100 Dollars';
}
