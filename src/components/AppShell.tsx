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
  AnalyticsIcon,
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

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { to: '/approvals', label: 'Approvals', icon: ApprovalsIcon },
  { to: '/verification', label: 'Verification', icon: VerificationIcon },
  { to: '/users', label: 'Users', icon: UsersIcon },
  // { to: '/pending-topups', label: 'Pending bKash', icon: BellIcon },
  { to: '/support-chat', label: 'Support Chat', icon: ChatIcon },
  { to: '/assistant-requests', label: 'Assistant Requests', icon: AssistantIcon },
  { to: '/contact-messages', label: 'Contact Messages', icon: InboxIcon },
  { to: '/transactions', label: 'Transactions', icon: TransactionsIcon },
  { to: '/sms', label: 'Send SMS', icon: SmsIcon },
  { to: '/sms-analytics', label: 'SMS Analytics', icon: AnalyticsIcon },
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
  const activeLabel = NAV_ITEMS.find((item) => pathname.startsWith(item.to))?.label ?? 'Admin';

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
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const badgeCount = navBadgeCounts[to] ?? 0;
            return (
              <NavLink
                key={to}
                to={to}
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
                <span className="flex-1">{label}</span>
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
