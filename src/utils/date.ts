const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Returns safe "Month Year" string (e.g. "November 2026")
 * without using Hermes Intl which can crash on certain Android devices.
 */
export const formatSafeMonthYear = (date: Date = new Date()): string => {
  try {
    return `${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
  } catch {
    return 'This Month';
  }
};

/**
 * Returns safe human-readable date string (e.g. "3 Nov 2026" or "3 November 2026")
 */
export const formatSafeDate = (
  input: string | number | Date | undefined,
  style: 'short' | 'long' = 'short',
): string => {
  if (!input) return '';
  try {
    const d = new Date(input);
    if (isNaN(d.getTime())) return '';
    const day = d.getDate();
    const month = style === 'long' ? MONTHS_LONG[d.getMonth()] : MONTHS_SHORT[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return '';
  }
};
