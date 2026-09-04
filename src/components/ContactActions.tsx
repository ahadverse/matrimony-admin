import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CopyIcon, MailIcon, PhoneIcon, SmsIcon, WhatsappIcon } from './icons';

// `min-h-9` keeps these dense secondary actions tappable on phones; desktop keeps the compact height.
const ACTION_CLASS =
  'inline-flex min-h-9 items-center gap-1 whitespace-nowrap rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text-muted transition-colors hover:border-primary/40 hover:bg-surface-raised hover:text-text sm:min-h-0 sm:px-2';

/** wa.me and tel: want bare digits; stored numbers are E.164 (`+8801…`). */
export function toDialDigits(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 ? digits : null;
}

export async function copyToClipboard(value: string, label: string): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
    } else {
      // Clipboard API needs a secure context; fall back for plain-HTTP admin hosts.
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    toast.success(`${label} copied`);
  } catch {
    toast.error(`Could not copy ${label.toLowerCase()}`);
  }
}

function ActionLink({
  href,
  external,
  children,
}: {
  href: string;
  external?: boolean;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
      className={ACTION_CLASS}
    >
      {children}
    </a>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  return (
    <button type="button" onClick={() => void copyToClipboard(value, label)} className={ACTION_CLASS}>
      <CopyIcon className="h-3.5 w-3.5" />
      Copy
    </button>
  );
}

function ChannelRow({
  label,
  value,
  badge,
  actions,
}: {
  label: string;
  value: string;
  badge?: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <div className="w-full min-w-0 sm:w-auto">
        <span className="block break-words text-xs text-text-faint">{label}</span>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="select-all break-all text-sm font-medium text-text">{value}</span>
          {badge}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">{actions}</div>
    </div>
  );
}

export function PhoneChannel({
  label,
  phone,
  message,
  badge,
}: {
  label: string;
  phone: string;
  /** Pre-filled WhatsApp text so the admin does not retype the same intro. */
  message?: string;
  badge?: ReactNode;
}) {
  const digits = toDialDigits(phone);
  const waText = message ? `?text=${encodeURIComponent(message)}` : '';

  return (
    <ChannelRow
      label={label}
      value={phone}
      badge={badge}
      actions={
        <>
          <ActionLink href={`tel:${phone}`}>
            <PhoneIcon className="h-3.5 w-3.5" />
            Call
          </ActionLink>
          {digits && (
            <ActionLink href={`https://wa.me/${digits}${waText}`} external>
              <WhatsappIcon className="h-3.5 w-3.5" />
              WhatsApp
            </ActionLink>
          )}
          <ActionLink href={`sms:${phone}`}>
            <SmsIcon className="h-3.5 w-3.5" />
            SMS
          </ActionLink>
          <Link to={`/sms?phone=${encodeURIComponent(phone)}`} className={ACTION_CLASS}>
            <SmsIcon className="h-3.5 w-3.5" />
            SMS via panel
          </Link>
          <CopyButton value={phone} label="Phone number" />
        </>
      }
    />
  );
}

export function EmailChannel({
  label,
  email,
  subject,
  body,
  badge,
}: {
  label: string;
  email: string;
  subject?: string;
  body?: string;
  badge?: ReactNode;
}) {
  const params = [
    subject ? `subject=${encodeURIComponent(subject)}` : null,
    body ? `body=${encodeURIComponent(body)}` : null,
  ].filter(Boolean);

  return (
    <ChannelRow
      label={label}
      value={email}
      badge={badge}
      actions={
        <>
          <ActionLink href={`mailto:${email}${params.length ? `?${params.join('&')}` : ''}`}>
            <MailIcon className="h-3.5 w-3.5" />
            Email
          </ActionLink>
          <CopyButton value={email} label="Email address" />
        </>
      }
    />
  );
}
