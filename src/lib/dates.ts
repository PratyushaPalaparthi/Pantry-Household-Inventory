/**
 * Expiration dates are *calendar dates*, not instants: "expires 3 Aug" means
 * all of 3 Aug, wherever you happen to be.
 *
 * The `<input type="date">` submits "YYYY-MM-DD", which `new Date(...)` parses
 * as UTC midnight. So every read and comparison has to be done in UTC too —
 * formatting with the server's local zone renders the day before for any
 * timezone behind UTC (a date set to 3 Aug displays as 2 Aug in California),
 * and comparing against `Date.now()` marks an item expired from 5pm the
 * previous local day.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Whole days from today until `date`. 0 = today, negative = already past. */
export function daysUntil(date: Date, now: Date = new Date()): number {
  return Math.round((startOfUtcDay(date) - startOfUtcDay(now)) / MS_PER_DAY);
}

/** Locale-formatted calendar date, pinned to UTC so the day never shifts. */
export function formatCalendarDate(date: Date): string {
  return date.toLocaleDateString(undefined, { timeZone: "UTC" });
}

/** Value for an `<input type="date">`. */
export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}
