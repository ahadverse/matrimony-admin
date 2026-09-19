/**
 * An inclusive span of calendar days, as `YYYY-MM-DD` strings.
 *
 * Both ends empty means no restriction; `from === to` is a single day. There is
 * deliberately no open-ended case — the picker is a calendar, and you cannot
 * click "no end date" on one.
 */
export interface DateRange {
  from: string;
  to: string;
}

export const EMPTY_DATE_RANGE: DateRange = { from: '', to: '' };

const MONTHS = [
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

const pad = (n: number) => String(n).padStart(2, '0');

/** A local `Date` as `YYYY-MM-DD` — never `toISOString()`, which shifts to UTC. */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `YYYY-MM-DD` as a local midnight `Date`, or null if it is not a date. */
export function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

/**
 * `date` shifted by whole days, as `YYYY-MM-DD`. Handles month and year ends.
 *
 * Stepped from midday rather than midnight so a timezone whose clocks jump at
 * midnight cannot land the result on the wrong calendar day.
 */
export function addDays(date: string, days: number): string {
  const parsed = parseIsoDate(date);
  if (!parsed) return date;
  parsed.setHours(12, 0, 0, 0);
  parsed.setDate(parsed.getDate() + days);
  return toIsoDate(parsed);
}

export function isEmptyRange(range: DateRange): boolean {
  return !range.from && !range.to;
}

/** Orders two picked days into a range, whichever way round they were clicked. */
export function orderRange(a: string, b: string): DateRange {
  return a <= b ? { from: a, to: b } : { from: b, to: a };
}

/**
 * Turns `YYYY-MM-DD` into the instant that day begins — or, with `edge: 'end'`,
 * the last instant it contains — in the admin's own timezone.
 *
 * Built by hand rather than with `new Date('2026-09-19')`, which JavaScript
 * reads as UTC midnight. The Users table renders join dates in local time, so
 * bounds resolved in UTC would disagree with the column an admin is reading by
 * the length of their offset — six hours in Bangladesh, enough to file an
 * evening signup under the following day.
 */
function dayBoundary(date: string, edge: 'start' | 'end'): string | undefined {
  const parsed = parseIsoDate(date);
  if (!parsed) return undefined;
  if (edge === 'end') parsed.setHours(23, 59, 59, 999);
  return parsed.toISOString();
}

/** The `joinedFrom` / `joinedTo` instants the API takes. */
export function toJoinedRange(range: DateRange): {
  joinedFrom?: string;
  joinedTo?: string;
} {
  return {
    joinedFrom: dayBoundary(range.from, 'start'),
    joinedTo: dayBoundary(range.to, 'end'),
  };
}

/** `19 Sep 2026`. */
export function formatDay(date: string): string {
  const parsed = parseIsoDate(date);
  if (!parsed) return date;
  return `${parsed.getDate()} ${MONTHS[parsed.getMonth()]} ${parsed.getFullYear()}`;
}

/**
 * What the picker's button reads: `Any date`, `19 Sep 2026`, or a range with
 * the parts the two ends share written once — `1 – 19 Sep 2026` rather than
 * `1 Sep 2026 – 19 Sep 2026`, which crowds the filter bar for no extra meaning.
 */
export function formatRangeLabel(range: DateRange): string {
  if (isEmptyRange(range)) return 'Any date';
  if (!range.from || !range.to) return formatDay(range.from || range.to);
  if (range.from === range.to) return formatDay(range.from);

  const start = parseIsoDate(range.from);
  const end = parseIsoDate(range.to);
  if (!start || !end) return `${range.from} – ${range.to}`;

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${start.getDate()} – ${formatDay(range.to)}`;
  }
  if (sameYear) {
    return `${start.getDate()} ${MONTHS[start.getMonth()]} – ${formatDay(range.to)}`;
  }
  return `${formatDay(range.from)} – ${formatDay(range.to)}`;
}

/** Names the CSV after the local dates the admin picked, e.g. `users-2026-09-19.csv`. */
export function rangeExportFilename(prefix: string, range: DateRange): string {
  if (isEmptyRange(range)) return `${prefix}-${todayIso()}.csv`;
  if (range.from === range.to) return `${prefix}-${range.from}.csv`;
  return `${prefix}-${range.from}_to_${range.to}.csv`;
}

/** The shortcuts offered beside the calendar, newest-first as admins think of them. */
export function dateRangePresets(): { label: string; range: DateRange }[] {
  const today = todayIso();
  const yesterday = addDays(today, -1);
  const startOfMonth = today.slice(0, 8) + '01';
  return [
    { label: 'Today', range: { from: today, to: today } },
    { label: 'Yesterday', range: { from: yesterday, to: yesterday } },
    { label: 'Last 7 days', range: { from: addDays(today, -6), to: today } },
    { label: 'Last 30 days', range: { from: addDays(today, -29), to: today } },
    { label: 'This month', range: { from: startOfMonth, to: today } },
  ];
}
