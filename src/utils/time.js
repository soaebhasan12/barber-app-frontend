// src/utils/time.js
// Display-only helpers. API keeps "HH:mm" (24h) and "YYYY-MM-DD" strings.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "14:30" -> "2:30 PM", "00:05" -> "12:05 AM", "12:00" -> "12:00 PM"
export const formatTime12h = (hhmm) => {
  if (typeof hhmm !== 'string') return '';
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(hhmm.trim());
  if (!m) return hhmm; // unknown shape: show as-is instead of crashing
  const h = parseInt(m[1], 10);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m[2]} ${h >= 12 ? 'PM' : 'AM'}`;
};

// "2026-09-27" -> "27 Sep 2026". Pure string split: NO new Date(), so no timezone shift.
export const formatSlotDate = (ymd) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(typeof ymd === 'string' ? ymd : '');
  if (!m) return typeof ymd === 'string' ? ymd : '';
  return `${parseInt(m[3], 10)} ${MONTHS[parseInt(m[2], 10) - 1]} ${m[1]}`;
};