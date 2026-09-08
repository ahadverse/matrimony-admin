import clsx from 'clsx';
import { PAGE_SIZE_OPTIONS } from '../hooks/usePageSize';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Omit to render without the rows-per-page control. */
  onPageSizeChange?: (pageSize: number) => void;
  /** Distinguishes this list's control from any other on the page. */
  idPrefix?: string;
}

const GAP = '…';

/**
 * The page numbers to render, with gaps collapsed: always the first and last
 * page plus a window around the current one, so a 400-page SMS log stays a
 * single row of buttons.
 */
function pageItems(page: number, totalPages: number): (number | typeof GAP)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const window = new Set([1, totalPages, page, page - 1, page + 1]);
  // Keep the row a constant width near the ends, where the window would
  // otherwise be clipped by the edge and the control would visibly shrink.
  if (page <= 3) [2, 3, 4].forEach((p) => window.add(p));
  if (page >= totalPages - 2)
    [totalPages - 1, totalPages - 2, totalPages - 3].forEach((p) =>
      window.add(p),
    );

  const pages = [...window]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const items: (number | typeof GAP)[] = [];
  let previous = 0;
  for (const p of pages) {
    if (previous && p - previous > 1) items.push(GAP);
    items.push(p);
    previous = p;
  }
  return items;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  idPrefix = 'list',
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  const items = pageItems(page, totalPages);

  const stepClass =
    'rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-muted hover:enabled:bg-surface-raised hover:enabled:text-text disabled:cursor-not-allowed disabled:opacity-40 sm:py-1.5';

  return (
    <div className="flex flex-col gap-3 border-t border-border px-1 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-sm text-text-faint">
          {total === 0 ? 'No results' : `Showing ${start}–${end} of ${total}`}
        </p>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <label
              htmlFor={`${idPrefix}-page-size`}
              className="whitespace-nowrap text-sm text-text-faint"
            >
              Rows per page
            </label>
            <select
              id={`${idPrefix}-page-size`}
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 lg:justify-end">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={stepClass}
        >
          Previous
        </button>

        {/* The numbered pages are the widest part of the control; on a phone the
            Previous/Next pair plus the "Page x of y" summary is enough. */}
        <div className="hidden items-center gap-1 sm:flex">
          {items.map((item, i) =>
            item === GAP ? (
              <span
                key={`gap-${i}`}
                className="px-1.5 text-sm text-text-faint"
                aria-hidden
              >
                {GAP}
              </span>
            ) : (
              <button
                key={item}
                type="button"
                aria-label={`Page ${item}`}
                aria-current={item === page ? 'page' : undefined}
                onClick={() => onPageChange(item)}
                className={clsx(
                  'min-w-9 rounded-lg px-2.5 py-1.5 text-sm font-medium',
                  item === page
                    ? 'bg-primary text-white'
                    : 'border border-border text-text-muted hover:bg-surface-raised hover:text-text',
                )}
              >
                {item}
              </button>
            ),
          )}
        </div>

        <span className="whitespace-nowrap px-1 text-sm text-text-faint sm:hidden">
          Page {page} of {totalPages}
        </span>

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className={stepClass}
        >
          Next
        </button>
      </div>
    </div>
  );
}
