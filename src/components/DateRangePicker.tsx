import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
} from './icons';
import {
  EMPTY_DATE_RANGE,
  dateRangePresets,
  formatRangeLabel,
  isEmptyRange,
  orderRange,
  parseIsoDate,
  toIsoDate,
  todayIso,
} from '../lib/dateRange';
import type { DateRange } from '../lib/dateRange';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
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

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  /** Prefixed to the button text, e.g. "Joined". */
  label: string;
  /** Latest selectable day; later ones render disabled. Defaults to today. */
  maxDate?: string;
}

/**
 * The 42 cells of a six-week grid, so the calendar never changes height.
 *
 * Built at midday: stepping from midnight would let a timezone that shifts its
 * clocks at midnight produce a cell on the wrong calendar day.
 */
function monthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1, 12);
  const start = new Date(year, month, 1 - firstOfMonth.getDay(), 12);
  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    return day;
  });
}

/**
 * One calendar that picks either a single day or a span of days.
 *
 * Both cases are the same gesture: the first click picks a day and is already a
 * complete, valid selection, and a second click extends it into a range. That
 * is why there is no "single day or range?" mode to choose up front — the
 * earlier two-dropdowns-and-two-fields version made the admin declare their
 * intent before the calendar would let them express it.
 */
export function DateRangePicker({
  value,
  onChange,
  label,
  maxDate = todayIso(),
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  // The first end of a range still being drawn. Non-null means the next click
  // completes the span rather than starting a new one.
  const [anchor, setAnchor] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const start = parseIsoDate(value.from) ?? new Date();
    return new Date(start.getFullYear(), start.getMonth(), 1);
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Closing must also abandon a half-drawn range, or reopening the picker would
  // treat the next click as the end of a span the admin has forgotten starting.
  function close() {
    setOpen(false);
    setAnchor(null);
    setHovered(null);
  }

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!containerRef.current?.contains(event.target as Node)) close();
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  // Reopening on the month of the current selection, rather than wherever the
  // admin last browsed to, keeps the picker showing what it says it shows.
  // Done here rather than in an effect on `value`, which would also fire on the
  // first click of a range and yank the calendar out from under the second.
  function openPicker() {
    const start = parseIsoDate(value.from) ?? new Date();
    setVisibleMonth(new Date(start.getFullYear(), start.getMonth(), 1));
    setOpen(true);
  }

  const days = useMemo(
    () => monthGrid(visibleMonth.getFullYear(), visibleMonth.getMonth()),
    [visibleMonth],
  );

  // While a range is being drawn, the hovered day stands in for its far end so
  // the highlight previews what a second click would actually select.
  const preview =
    anchor !== null && hovered ? orderRange(anchor, hovered) : value;

  function handleDayClick(iso: string) {
    if (anchor === null) {
      setAnchor(iso);
      onChange({ from: iso, to: iso });
      return;
    }
    onChange(orderRange(anchor, iso));
    close();
  }

  function applyPreset(range: DateRange) {
    onChange(range);
    close();
  }

  const selectionIsSingleDay = !isEmptyRange(value) && value.from === value.to;

  return (
    <div ref={containerRef} className="relative w-full sm:w-auto">
      <button
        type="button"
        onClick={() => (open ? close() : openPicker())}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={clsx(
          'flex min-h-10 w-full items-center gap-2 rounded-lg border bg-surface px-3 py-2.5 text-sm text-text sm:w-auto sm:min-h-0 sm:py-2',
          isEmptyRange(value) ? 'border-border' : 'border-primary',
        )}
      >
        <CalendarIcon className="h-4 w-4 shrink-0 text-text-faint" />
        <span className="text-text-faint">{label}:</span>
        <span className="font-medium">{formatRangeLabel(value)}</span>
        {!isEmptyRange(value) && (
          // A span, not a button: a button nested inside the trigger button is
          // invalid HTML, and the click is stopped from opening the popover.
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear date filter"
            onClick={(e) => {
              e.stopPropagation();
              onChange(EMPTY_DATE_RANGE);
              close();
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter' && e.key !== ' ') return;
              e.preventDefault();
              e.stopPropagation();
              onChange(EMPTY_DATE_RANGE);
              close();
            }}
            className="-mr-1 ml-auto rounded p-0.5 text-text-faint hover:bg-surface-raised hover:text-text sm:ml-0"
          >
            <XIcon className="h-3.5 w-3.5" />
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`${label} date filter`}
          className="absolute left-0 z-40 mt-2 w-[19rem] rounded-xl border border-border bg-surface-raised p-3 shadow-2xl"
        >
          <div className="mb-3 flex flex-wrap gap-1.5">
            {dateRangePresets().map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset.range)}
                className={clsx(
                  'rounded-md border px-2 py-1 text-xs font-medium',
                  preset.range.from === value.from && preset.range.to === value.to
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border text-text-muted hover:bg-surface hover:text-text',
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() =>
                setVisibleMonth(
                  (m) => new Date(m.getFullYear(), m.getMonth() - 1, 1),
                )
              }
              className="rounded-md p-1.5 text-text-muted hover:bg-surface hover:text-text"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-text">
              {MONTH_NAMES[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() =>
                setVisibleMonth(
                  (m) => new Date(m.getFullYear(), m.getMonth() + 1, 1),
                )
              }
              className="rounded-md p-1.5 text-text-muted hover:bg-surface hover:text-text"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 text-center text-[0.65rem] uppercase tracking-wide text-text-faint">
            {WEEKDAYS.map((day) => (
              <span key={day} className="py-1">
                {day}
              </span>
            ))}
          </div>

          <div
            className="grid grid-cols-7 gap-y-0.5"
            onMouseLeave={() => setHovered(null)}
          >
            {days.map((day) => {
              const iso = toIsoDate(day);
              const inMonth = day.getMonth() === visibleMonth.getMonth();
              const disabled = iso > maxDate;
              const isStart = iso === preview.from;
              const isEnd = iso === preview.to;
              const inRange =
                Boolean(preview.from) &&
                iso >= preview.from &&
                iso <= preview.to;
              const isToday = iso === todayIso();

              return (
                <button
                  key={iso}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleDayClick(iso)}
                  // Only tracked mid-range, where it drives the preview —
                  // otherwise every hover would re-render the whole grid.
                  onMouseEnter={() => anchor !== null && setHovered(iso)}
                  aria-label={iso}
                  aria-pressed={inRange}
                  className={clsx(
                    'relative h-8 text-sm transition-colors',
                    // The ends get the pill; the days between get a flat band,
                    // so a range reads as one continuous shape.
                    inRange && !isStart && !isEnd && 'bg-primary/15 text-text',
                    isStart && isEnd && 'rounded-lg bg-primary text-white',
                    isStart && !isEnd && 'rounded-l-lg bg-primary text-white',
                    isEnd && !isStart && 'rounded-r-lg bg-primary text-white',
                    !inRange && 'rounded-lg hover:bg-surface',
                    !inRange && (inMonth ? 'text-text' : 'text-text-faint'),
                    !inRange && isToday && 'font-semibold text-primary',
                    disabled && 'cursor-not-allowed opacity-30 hover:bg-transparent',
                  )}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
            <p className="text-xs text-text-faint">
              {anchor !== null
                ? 'Pick an end date, or press Done for one day.'
                : selectionIsSingleDay
                  ? 'Click a second date to make it a range.'
                  : 'Click a date to start.'}
            </p>
            <div className="flex shrink-0 gap-2">
              {!isEmptyRange(value) && (
                <button
                  type="button"
                  onClick={() => applyPreset(EMPTY_DATE_RANGE)}
                  className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-text-muted hover:bg-surface hover:text-text"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={close}
                className="rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-white hover:bg-primary-light"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
