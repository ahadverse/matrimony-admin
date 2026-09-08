import toast from 'react-hot-toast';
import type { BulkDeleteResult } from '../api/admin';

/**
 * Turns a bulk-delete response into one honest toast.
 *
 * The server deletes what it can and reports the rest, so "Deleted 50" would be
 * a lie whenever a row had already gone. Partial results say so explicitly
 * rather than quietly rounding up to success.
 */
export function reportBulkDelete(result: BulkDeleteResult, noun: string): void {
  const { deleted, requested, skipped } = result;
  const plural = (n: number) => (n === 1 ? noun : `${noun}s`);

  if (deleted === 0) {
    toast.error(
      skipped[0]?.reason
        ? `Nothing was deleted — ${skipped[0].reason.toLowerCase()}`
        : 'Nothing was deleted',
    );
    return;
  }

  if (deleted < requested) {
    toast.success(
      `Deleted ${deleted} of ${requested} ${plural(requested)} — ${
        requested - deleted
      } could not be removed`,
    );
    return;
  }

  toast.success(`Deleted ${deleted} ${plural(deleted)}`);
}
