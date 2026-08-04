import type { ReactNode } from 'react';
import clsx from 'clsx';
import { ChevronDownIcon, SortIcon } from './icons';
import type { SortOrder } from '../api/types';

interface SortableThProps {
  label: ReactNode;
  sortKey: string;
  activeSortBy: string;
  sortOrder: SortOrder;
  onSort: (sortKey: string) => void;
  align?: 'left' | 'right';
}

export function SortableTh({
  label,
  sortKey,
  activeSortBy,
  sortOrder,
  onSort,
  align = 'left',
}: SortableThProps) {
  const isActive = activeSortBy === sortKey;

  return (
    <th className={clsx('px-4 py-3 font-medium', align === 'right' && 'text-right')}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={clsx(
          'inline-flex items-center gap-1 hover:text-text',
          isActive ? 'text-text' : 'text-text-faint',
          align === 'right' && 'flex-row-reverse',
        )}
      >
        {label}
        {isActive ? (
          <ChevronDownIcon
            className={clsx('h-3.5 w-3.5', sortOrder === 'ASC' && 'rotate-180')}
          />
        ) : (
          <SortIcon className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>
    </th>
  );
}
