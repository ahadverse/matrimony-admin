import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { useAuth } from '../auth/AuthContext';
import { useAdminTopupAlerts } from '../hooks/useAdminTopupAlerts';
import { useSupportChatAlerts } from '../hooks/useSupportChatAlerts';
import { useProfileApprovalAlerts } from '../hooks/useProfileApprovalAlerts';
import { useVerificationAlerts } from '../hooks/useVerificationAlerts';
import { useContactMessageAlerts } from '../hooks/useContactMessageAlerts';
import { useAssistantRequestAlerts } from '../hooks/useAssistantRequestAlerts';
import {
  getAssistantRequests,
  getContactMessages,
  getPendingManualTopups,
  getPendingProfiles,
  getSupportConversations,
  getVerificationSubmissions,
} from '../api/admin';
import {
  ApprovalsIcon,
  AssistantIcon,
  // BellIcon, // used only by the commented-out Pending bKash nav item below
  ChatIcon,
  DashboardIcon,
  InboxIcon,
  LogoutIcon,
  MenuIcon,
  SettingsIcon,
  SmsIcon,
  TransactionsIcon,
  UsersIcon,
  VerificationIcon,
  XIcon,
} from './icons';

type NavIcon = (props: { className?: string }) => ReactNode;

interface NavLeaf {
  to: string;
  label: string;
  icon: NavIcon;
}

interface NavGroup {
  label: string;
  icon: NavIcon;
  /** Children carry no icon of their own — the group's icon speaks for the set. */
  children: { to: string; label: string }[];
}

type NavEntry = NavLeaf | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return 'children' in entry;
}

// Annotated rather than `satisfies`: the inferred literal union does not narrow
// cleanly through `isGroup`, which leaves `entry.to` possibly-undefined in the
// leaf branch.
const NAV_ITEMS: NavEntry[] = [
  { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { to: '/approvals', label: 'Approvals', icon: ApprovalsIcon },
  { to: '/verification', label: 'Verification', icon: VerificationIcon },
  { to: '/users', label: 'Users', icon: UsersIcon },
  // { to: '/pending-topups', label: 'Pending bKash', icon: BellIcon },
  { to: '/support-chat', label: 'Support Chat', icon: ChatIcon },
  { to: '/assistant-requests', label: 'Assistant Requests', icon: AssistantIcon },
  { to: '/contact-messages', label: 'Contact Messages', icon: InboxIcon },
  // One wallet ledger, read from two directions — money in, and what members
  // spend it on. Grouped so the sidebar says there are two halves rather than
  // leaving an admin to guess which page a given record landed on.
  //
  // The paths stay flat (/transactions, /expenses) because UserDetailModal
  // links straight to /transactions?userId=… — nesting the URLs would break
  // that for no gain, since the grouping is a navigation idea, not a routing one.
  {
    label: 'Finance',
    icon: TransactionsIcon,
    children: [
      { to: '/transactions', label: 'Transactions' },
      { to: '/expenses', label: 'Expenses' },
    ],
  },
  // A group rather than four siblings: SMS now has its own compose, campaign,
  // configuration and reporting screens, and four flat entries buried the rest
  // of the sidebar under one feature.
  {
    label: 'SMS',
    icon: SmsIcon,
    children: [
      { to: '/sms', label: 'Send SMS' },
      { to: '/sms/marketing', label: 'Marketing' },
      { to: '/sms/settings', label: 'Templates & automation' },
      { to: '/sms/analytics', label: 'Analytics' },
    ],
  },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isNavOpen, setNavOpen] = useState(false);
  useAdminTopupAlerts();
  useSupportChatAlerts();
  useProfileApprovalAlerts();
  useVerificationAlerts();
  useContactMessageAlerts();
  useAssistantRequestAlerts();

  const pendingTopupsQuery = useQuery({
    queryKey: ['admin', 'transactions', 'pending-bkash', 'count'],
    queryFn: () => getPendingManualTopups(1, 1),
  });

  const supportConversationsQuery = useQuery({
    queryKey: ['admin', 'support', 'conversations'],
    queryFn: getSupportConversations,
  });
  const unreadSupportCount = (supportConversationsQuery.data ?? []).reduce(
    (sum, c) => sum + c.unreadCount,
    0,
  );

  const pendingApprovalsQuery = useQuery({
    queryKey: ['admin', 'profiles', 'pending', 'count'],
    queryFn: () => getPendingProfiles({ page: 1, pageSize: 1 }),
  });

  const pendingVerificationsQuery = useQuery({
    queryKey: ['admin', 'verifications', 'count'],
    queryFn: () => getVerificationSubmissions({ page: 1, pageSize: 1, status: 'pending' }),
  });

  const newContactMessagesQuery = useQuery({
    queryKey: ['admin', 'contact-messages', 'count'],
    queryFn: () => getContactMessages({ page: 1, pageSize: 1, status: 'new' }),
  });

  const pendingAssistantRequestsQuery = useQuery({
    queryKey: ['admin', 'assistant-requests', 'count'],
    queryFn: () => getAssistantRequests({ page: 1, pageSize: 1, status: 'pending' }),
  });

  const navBadgeCounts: Record<string, number> = {
    '/pending-topups': pendingTopupsQuery.data?.total ?? 0,
    '/support-chat': unreadSupportCount,
    '/approvals': pendingApprovalsQuery.data?.total ?? 0,
    '/verification': pendingVerificationsQuery.data?.total ?? 0,
    '/contact-messages': newContactMessagesQuery.data?.total ?? 0,
    '/assistant-requests': pendingAssistantRequestsQuery.data?.total ?? 0,
  };

  // Route changes come from tapping a nav link inside the drawer, so the drawer
  // has to close itself — otherwise it stays over the page it just navigated to.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  // The drawer is a fixed overlay; without this the page behind it scrolls under
  // the user's finger instead of the nav list.
  useEffect(() => {
    if (!isNavOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isNavOpen]);

  useEffect(() => {
    if (!isNavOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setNavOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isNavOpen]);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const totalAlerts = Object.values(navBadgeCounts).reduce((sum, n) => sum + n, 0);
  // The mobile header names the current page, so a group's child has to be
  // matched before the group itself — "Marketing" is more use up there than
  // "SMS". Longest match wins, so /sms/marketing does not resolve to /sms.
  const activeLabel =
    NAV_ITEMS.flatMap((entry) =>
      isGroup(entry) ? entry.children : [{ to: entry.to, label: entry.label }],
    )
      .filter((leaf) => pathname === leaf.to || pathname.startsWith(leaf.to + '/'))
      .sort((a, b) => b.to.length - a.to.length)[0]?.label ?? 'Admin';

  return (
    <div className="flex min-h-svh bg-bg text-text">
      {isNavOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] motion-safe:animate-[fadeIn_0.15s_ease-out] lg:hidden"
        />
      )}

      <aside
        className={clsx(
          // Off-canvas drawer under lg, a plain static column from lg up.
          'fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-border bg-surface transition-transform duration-200 lg:static lg:translate-x-0',
          isNavOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <button
          type="button"
          onClick={() => setNavOpen(false)}
          aria-label="Close navigation"
          className="absolute right-3 top-4 rounded-md p-1.5 text-text-faint hover:bg-surface-raised hover:text-text lg:hidden"
        >
          <XIcon className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5 border-b border-border px-6 py-5 pr-12 lg:pr-6">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-base font-bold text-white">
            B
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-text">Biye Kora Lagbe</p>
            <p className="truncate text-xs text-text-faint">Admin Panel</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((entry) => {
            if (isGroup(entry)) {
              return (
                <NavGroupItem
                  key={entry.label}
                  group={entry}
                  pathname={pathname}
                  onNavigate={() => setNavOpen(false)}
                />
              );
            }

            const badgeCount = navBadgeCounts[entry.to] ?? 0;
            const Icon = entry.icon;
            return (
              <NavLink
                key={entry.to}
                to={entry.to}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                    isActive
                      ? 'bg-primary/15 text-primary-light'
                      : 'text-text-muted hover:bg-surface-raised hover:text-text',
                  )
                }
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className="flex-1">{entry.label}</span>
                {badgeCount > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-semibold text-white">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <div className="mb-2 rounded-lg bg-surface-raised px-3 py-2.5">
            <p className="text-xs text-text-faint">Signed in as</p>
            <p className="truncate text-sm font-medium text-text">{user?.phone}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-muted hover:bg-danger/10 hover:text-danger"
          >
            <LogoutIcon className="h-[18px] w-[18px]" />
            Log out
          </button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation"
            aria-expanded={isNavOpen}
            className="relative -ml-1 rounded-lg p-2 text-text-muted hover:bg-surface-raised hover:text-text"
          >
            <MenuIcon className="h-5 w-5" />
            {totalAlerts > 0 && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger" />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-text">{activeLabel}</p>
            <p className="truncate text-[11px] text-text-faint">Biye Kora Lagbe Admin</p>
          </div>
          {totalAlerts > 0 && (
            <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-semibold text-white">
              {totalAlerts > 99 ? '99+' : totalAlerts}
            </span>
          )}
        </div>

        <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}

/**
 * A collapsible sidebar group.
 *
 * It opens itself whenever the current route is one of its children, so
 * arriving by link or refresh never leaves the active page hidden inside a
 * closed group; beyond that the admin's own toggling wins, which is why the
 * open state is seeded from the route rather than bound to it.
 */
function NavGroupItem({
  group,
  pathname,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  onNavigate: () => void;
}) {
  const holdsActiveRoute = group.children.some(
    (child) => pathname === child.to || pathname.startsWith(child.to + '/'),
  );
  const [open, setOpen] = useState(holdsActiveRoute);

  useEffect(() => {
    if (holdsActiveRoute) setOpen(true);
  }, [holdsActiveRoute]);

  const Icon = group.icon;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-expanded={open}
        className={clsx(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
          holdsActiveRoute && !open
            ? 'bg-primary/10 text-primary-light'
            : 'text-text-muted hover:bg-surface-raised hover:text-text',
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronIcon
          className={clsx('h-4 w-4 shrink-0 transition-transform', open && 'rotate-90')}
        />
      </button>

      {open && (
        // Indented under a rule rather than by padding alone: the line is what
        // makes four sub-items read as one set at a glance.
        <div className="mt-1 ml-[26px] space-y-0.5 border-l border-border pl-3">
          {group.children.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              end
              onClick={onNavigate}
              className={({ isActive }) =>
                clsx(
                  'block rounded-lg px-3 py-2 text-sm',
                  isActive
                    ? 'bg-primary/15 font-medium text-primary-light'
                    : 'text-text-muted hover:bg-surface-raised hover:text-text',
                )
              }
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M7.5 5l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
