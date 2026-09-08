import { useCallback, useMemo, useState } from 'react';

export interface RowSelection {
  /** Selected ids that are on screen right now — the only ids a bulk action may touch. */
  selectedIds: string[];
  count: number;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  /** Selects every visible row, or clears them all when they are already selected. */
  toggleAll: () => void;
  clear: () => void;
  allSelected: boolean;
  someSelected: boolean;
}

/**
 * Checkbox selection for a paginated list.
 *
 * The selection is intersected with what is currently rendered rather than
 * pruned in an effect. Turning the page, changing a filter or refetching after
 * a delete therefore drops the rows that went away in the same render they
 * disappear — there is no window in which `count` claims rows the admin can no
 * longer see, and a bulk delete can never reach a row that scrolled off.
 *
 * That also means selection does not survive paging, which is the intended
 * behaviour here: "delete 40 selected" should mean the 40 on screen, not a
 * running total accumulated across pages the admin has stopped looking at.
 */
export function useRowSelection(visibleIds: string[]): RowSelection {
  const [selected, setSelected] = useState<string[]>([]);

  // `visibleIds` is rebuilt on every render by its caller, so the set is
  // memoised on the contents rather than on the array identity. Rebuilding it
  // from the joined key keeps that dependency honest — ids are UUIDs, so a
  // comma cannot appear inside one.
  const idKey = visibleIds.join(',');
  const visible = useMemo(
    () => new Set(idKey === '' ? [] : idKey.split(',')),
    [idKey],
  );

  const selectedVisible = useMemo(
    () => selected.filter((id) => visible.has(id)),
    [selected, visible],
  );

  const toggle = useCallback((id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const offScreen = prev.filter((id) => !visible.has(id));
      const everyVisibleSelected =
        visible.size > 0 && [...visible].every((id) => prev.includes(id));
      return everyVisibleSelected ? offScreen : [...offScreen, ...visible];
    });
  }, [visible]);

  const clear = useCallback(() => setSelected([]), []);

  const allSelected =
    visible.size > 0 && selectedVisible.length === visible.size;

  return {
    selectedIds: selectedVisible,
    count: selectedVisible.length,
    isSelected: (id: string) => visible.has(id) && selected.includes(id),
    toggle,
    toggleAll,
    clear,
    allSelected,
    someSelected: selectedVisible.length > 0 && !allSelected,
  };
}
