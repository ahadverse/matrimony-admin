import type { ReactNode } from 'react';
import clsx from 'clsx';

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: 'primary' | 'gold' | 'success' | 'default';
}

const ACCENT_CLASSES: Record<NonNullable<StatCardProps['accent']>, string> = {
  primary: 'text-primary-light',
  gold: 'text-gold',
  success: 'text-success',
  default: 'text-text',
};

export function StatCard({ label, value, hint, accent = 'default' }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <p className="text-sm font-medium text-text-muted">{label}</p>
      <p
        className={clsx(
          'mt-2 break-words text-2xl font-semibold tracking-tight sm:text-3xl',
          ACCENT_CLASSES[accent],
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 break-words text-xs text-text-faint">{hint}</p>}
    </div>
  );
}
