import { useCallback, useState } from 'react';

/** The ladder every list's rows-per-page control offers. Mirrored by MAX_PAGE_SIZE on the API. */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

const DEFAULT_PAGE_SIZE = 25;
const STORAGE_PREFIX = 'admin.pageSize.';

function readStored(listKey: string): number {
  // Private windows and blocked site data make localStorage throw on access
  // rather than return null, so every read and write is guarded.
  try {
    const parsed = Number(window.localStorage.getItem(STORAGE_PREFIX + listKey));
    return (PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed)
      ? parsed
      : DEFAULT_PAGE_SIZE;
  } catch {
    return DEFAULT_PAGE_SIZE;
  }
}

/**
 * Rows-per-page for one list, remembered across visits.
 *
 * Stored per list rather than globally: an admin who wants 100 rows in the SMS
 * log rarely wants 100 profile cards on Approvals, where each row is a card
 * with photos. A stored value outside the ladder (an older build, a hand-edited
 * key) falls back to the default instead of being sent to the API.
 */
export function usePageSize(listKey: string): [number, (size: number) => void] {
  const [pageSize, setPageSizeState] = useState(() => readStored(listKey));

  const setPageSize = useCallback(
    (size: number) => {
      setPageSizeState(size);
      try {
        window.localStorage.setItem(STORAGE_PREFIX + listKey, String(size));
      } catch {
        // A remembered preference is not worth failing the interaction over.
      }
    },
    [listKey],
  );

  return [pageSize, setPageSize];
}
