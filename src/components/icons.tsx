import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function DashboardIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

export function ApprovalsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 11.5 11 13.5 15.5 9" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3.5 20c0-3.5 2.7-6 5.5-6s5.5 2.5 5.5 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15.8 14.2c2.2.4 4.2 2.4 4.7 5.3" />
    </svg>
  );
}

export function TransactionsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 8h13l-3-3.5" />
      <path d="M20 16H7l3 3.5" />
    </svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.5-2.4 1a7.6 7.6 0 0 0-1.7-1L15 3h-4l-.3 2.4a7.6 7.6 0 0 0-1.7 1l-2.4-1-2 3.5L6.6 11a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a7.6 7.6 0 0 0 1.7 1L11 21h4l.3-2.4a7.6 7.6 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5Z" />
    </svg>
  );
}

export function VerificationIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3l7 3v5c0 4.6-3 7.9-7 9-4-1.1-7-4.4-7-9V6l7-3Z" />
      <path d="M9 12.2l2 2 4-4.4" />
    </svg>
  );
}

export function SmsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 3.5V17H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
      <path d="M7 9h10M7 12.5h6" />
    </svg>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 19.5h16" />
    </svg>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 3l18 18" />
      <path d="M9.9 4.24A10.4 10.4 0 0 1 12 4c6.5 0 10 7 10 7a18.2 18.2 0 0 1-3.15 4.19M6.5 6.5C3.8 8.3 2 11 2 11s3.5 7 10 7c1.4 0 2.7-.31 3.85-.85" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

export function SpinnerIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M21 12a9 9 0 1 1-9-9" />
    </svg>
  );
}

export function AssistantIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 21s-7-4.35-9.5-8.8C.8 8.4 2.7 5 6 5c1.9 0 3.3 1 4 2.3.7-1.3 2.1-2.3 4-2.3 3.3 0 5.2 3.4 3.5 7.2C19 16.65 12 21 12 21Z" />
      <path d="M9 11.5h6M9 14h4" />
    </svg>
  );
}

export function SortIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M8 9.5 12 5l4 4.5" />
      <path d="M8 14.5 12 19l4-4.5" />
    </svg>
  );
}
