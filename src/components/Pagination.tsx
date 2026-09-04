interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border px-1 py-3">
      <p className="text-sm text-text-faint">
        {total === 0 ? 'No results' : `Showing ${start}–${end} of ${total}`}
      </p>
      <div className="flex flex-1 items-center justify-between gap-2 sm:flex-none sm:justify-end">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-muted hover:enabled:bg-surface-raised hover:enabled:text-text disabled:cursor-not-allowed disabled:opacity-40 sm:py-1.5"
        >
          Previous
        </button>
        <span className="whitespace-nowrap px-1 text-sm text-text-faint">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-muted hover:enabled:bg-surface-raised hover:enabled:text-text disabled:cursor-not-allowed disabled:opacity-40 sm:py-1.5"
        >
          Next
        </button>
      </div>
    </div>
  );
}
