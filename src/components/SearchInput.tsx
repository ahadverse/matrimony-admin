import { useEffect, useState } from 'react';
import { SearchIcon } from './icons';

interface SearchInputProps {
  initialValue?: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const DEBOUNCE_MS = 300;

/** Debounced search box — waits for typing to pause before calling `onSearch`. */
export function SearchInput({
  initialValue = '',
  onSearch,
  placeholder,
  className,
}: SearchInputProps) {
  const [term, setTerm] = useState(initialValue);

  useEffect(() => {
    const timeout = setTimeout(() => onSearch(term.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  return (
    <div className={`relative ${className ?? ''}`}>
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
      <input
        type="text"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder={placeholder ?? 'Search…'}
        className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text placeholder:text-text-faint focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}
