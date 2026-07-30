import type { ReactNode } from 'react';
import clsx from 'clsx';

export type BadgeTone = 'success' | 'danger' | 'gold' | 'neutral' | 'primary';

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: 'bg-success/15 text-success',
  danger: 'bg-danger/15 text-danger',
  gold: 'bg-gold/15 text-gold',
  neutral: 'bg-text-faint/15 text-text-muted',
  primary: 'bg-primary/15 text-primary-light',
};

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize',
        TONE_CLASSES[tone],
      )}
    >
      {children}
    </span>
  );
}
