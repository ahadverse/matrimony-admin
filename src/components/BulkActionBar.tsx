import { SelectCheckbox } from './SelectCheckbox';

interface BulkActionBarProps {
  count: number;
  /** Singular noun for the rows, e.g. "user" — pluralised with a trailing "s". */
  noun: string;
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: () => void;
  onClear: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

/**
 * The strip that appears above a list once anything is ticked.
 *
 * It is sticky because the selection it describes can be a hundred rows long:
 * an admin who scrolls to check the bottom of the page should not have to
 * scroll back up to find the button, nor lose sight of how many rows are about
 * to be deleted.
 */
export function BulkActionBar({
  count,
  noun,
  allSelected,
  someSelected,
  onToggleAll,
  onClear,
  onDelete,
  isDeleting,
}: BulkActionBarProps) {
  if (count === 0) return null;

  return (
    <div className="sticky top-2 z-20 mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 backdrop-blur">
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-text">
        <SelectCheckbox
          checked={allSelected}
          indeterminate={someSelected}
          onChange={onToggleAll}
          label={allSelected ? 'Clear selection' : 'Select all rows on this page'}
        />
        {count} {noun}
        {count === 1 ? '' : 's'} selected
      </label>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-muted hover:bg-surface-raised hover:text-text sm:py-1.5"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white hover:enabled:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-60 sm:py-1.5"
        >
          {isDeleting ? 'Deleting…' : `Delete ${count}`}
        </button>
      </div>
    </div>
  );
}
