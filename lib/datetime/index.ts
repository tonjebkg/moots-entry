/**
 * Moots Entry – Date/Time Doctrine
 *
 * Rules:
 * - US format only (MM/DD/YYYY)
 * - 12-hour time with AM/PM
 * - UI works with strings
 * - Backend always receives ISO UTC
 * - No locale-dependent parsing
 */

export type USDate = string; // MM/DD/YYYY
export type USTime = string; // hh:mm AM/PM

/**
 * Format a Date into MM/DD/YYYY (US only)
 */
export function formatUSDate(date: Date): USDate {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

/**
 * Format a Date into hh:mm AM/PM (12h)
 */
export function formatUSTime(date: Date): USTime {
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  hours = hours === 0 ? 12 : hours;

  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Parse MM/DD/YYYY + hh:mm AM/PM into a UTC ISO string
 *
 * This is the ONLY way dates go to the backend.
 */
export function combineToISO(date: USDate, time: USTime): string {
  const [mm, dd, yyyy] = date.split('/').map(Number);
  if (!mm || !dd || !yyyy) {
    throw new Error(`Invalid US date: ${date}`);
  }

  const timeMatch = time.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/);
  if (!timeMatch) {
    throw new Error(`Invalid US time: ${time}`);
  }

  let hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  const ampm = timeMatch[3];

  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  const localDate = new Date(
    Number(yyyy),
    Number(mm) - 1,
    Number(dd),
    hours,
    minutes,
    0,
    0
  );

  return localDate.toISOString();
}

/**
 * Split an ISO string into US date + time for editing
 */
export function splitFromISO(iso: string): { date: USDate; time: USTime } {
  const date = new Date(iso);
  return {
    date: formatUSDate(date),
    time: formatUSTime(date),
  };
}

/**
 * Canonical list of allowed times (30-minute increments)
 */
export const TIME_OPTIONS: USTime[] = (() => {
  const options: USTime[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const date = new Date(2000, 0, 1, h, m);
      options.push(formatUSTime(date));
    }
  }
  return options;
})();
