import { useEffect, useRef } from 'react';
import clsx from 'clsx';

interface SelectCheckboxProps {
  checked: boolean;
  onChange: () => void;
  /** Renders the dash state used by a "select all" box when only some rows are selected. */
  indeterminate?: boolean;
  label: string;
  className?: string;
}

/**
 * The row/select-all checkbox shared by every admin list.
 *
 * `indeterminate` has no HTML attribute — it exists only as a DOM property — so
 * it has to be assigned through a ref rather than passed as a prop.
 */
export function SelectCheckbox({
  checked,
  onChange,
  indeterminate = false,
  label,
  className,
}: SelectCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked;
  }, [indeterminate, checked]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={label}
      // Stops a click inside a clickable card or row from also triggering the
      // card's own open/expand handler.
      onClick={(e) => e.stopPropagation()}
      className={clsx(
        'h-4 w-4 shrink-0 cursor-pointer rounded border-border accent-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
        className,
      )}
    />
  );
}
