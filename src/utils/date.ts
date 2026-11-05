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

/**
 * Returns safe day and short month (e.g. "12 Jun", "3 Nov")
 */
export const formatDayMonth = (input: string | number | Date | undefined): string => {
  if (!input) return '';
  try {
    const d = new Date(input);
    if (isNaN(d.getTime())) return '';
    return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  } catch {
    return '';
  }
};

/**
 * Accurately calculates calendar days remaining until an end date (e.g. trial or subscription period).
 * Compares calendar day boundaries so:
 * - On registration day (Day 1): returns 14
 * - On the next calendar day (yesterday registration -> today): returns 13
 * - On the final day: returns 1
 * - On expiry day: returns 0
 */
export const calculateDaysRemaining = (
  targetDateInput: string | number | Date | undefined,
  currentDateInput: Date = new Date(),
): number => {
  if (!targetDateInput) return 0;
  try {
    const target = new Date(targetDateInput);
    if (isNaN(target.getTime())) return 0;

    const targetMidnight = new Date(
      target.getFullYear(),
      target.getMonth(),
      target.getDate(),
    ).getTime();
    const currentMidnight = new Date(
      currentDateInput.getFullYear(),
      currentDateInput.getMonth(),
      currentDateInput.getDate(),
    ).getTime();

    const diffDays = Math.round((targetMidnight - currentMidnight) / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  } catch {
    return 0;
  }
};
