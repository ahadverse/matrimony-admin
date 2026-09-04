import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XIcon } from './icons';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClassName?: string;
}

export function Modal({ title, onClose, children, footer, maxWidthClassName = 'max-w-md' }: ModalProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // The body scrolls behind a fixed overlay on touch devices otherwise.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 cursor-pointer bg-black/60 backdrop-blur-[2px] motion-safe:animate-[fadeIn_0.15s_ease-out]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex max-h-[92svh] w-full ${maxWidthClassName} flex-col rounded-xl border border-border bg-surface-raised p-4 shadow-2xl motion-safe:animate-[fadeIn_0.15s_ease-out] sm:max-h-[85svh] sm:p-5`}
      >
        <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
          <h2 className="min-w-0 break-words text-base font-semibold text-text">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md p-1.5 text-text-faint hover:bg-surface hover:text-text"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && (
          <div className="mt-5 flex shrink-0 flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
