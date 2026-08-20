import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { useAuth } from '../auth/AuthContext';
import { useAdminTopupAlerts } from '../hooks/useAdminTopupAlerts';
import { useSupportChatAlerts } from '../hooks/useSupportChatAlerts';
import { getPendingManualTopups, getSupportConversations } from '../api/admin';
import {
  ApprovalsIcon,
  AssistantIcon,
  BellIcon,
  ChatIcon,
  DashboardIcon,
  InboxIcon,
  LogoutIcon,
  SettingsIcon,
  SmsIcon,
  TransactionsIcon,
  UsersIcon,
  VerificationIcon,
} from './icons';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { to: '/approvals', label: 'Approvals', icon: ApprovalsIcon },
  { to: '/verification', label: 'Verification', icon: VerificationIcon },
  { to: '/users', label: 'Users', icon: UsersIcon },
  { to: '/pending-topups', label: 'Pending bKash', icon: BellIcon },
  { to: '/support-chat', label: 'Support Chat', icon: ChatIcon },
  { to: '/assistant-requests', label: 'Assistant Requests', icon: AssistantIcon },
  { to: '/contact-messages', label: 'Contact Messages', icon: InboxIcon },
  { to: '/transactions', label: 'Transactions', icon: TransactionsIcon },
  { to: '/sms', label: 'Send SMS', icon: SmsIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  useAdminTopupAlerts();
  useSupportChatAlerts();

  const pendingTopupsQuery = useQuery({
    queryKey: ['admin', 'transactions', 'pending-bkash', 'count'],
    queryFn: () => getPendingManualTopups(1, 1),
  });
  const pendingTopupsCount = pendingTopupsQuery.data?.total ?? 0;

  const supportConversationsQuery = useQuery({
    queryKey: ['admin', 'support', 'conversations'],
    queryFn: getSupportConversations,
  });
  const unreadSupportCount = (supportConversationsQuery.data ?? []).reduce(
    (sum, c) => sum + c.unreadCount,
    0,
  );

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-svh bg-bg text-text">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface">
        <div className="flex items-center gap-2.5 border-b border-border px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-base font-bold text-white">
            B
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-text">Biye Kori</p>
            <p className="text-xs text-text-faint">Admin Panel</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
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
              {to === '/pending-topups' && pendingTopupsCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-semibold text-white">
                  {pendingTopupsCount > 99 ? '99+' : pendingTopupsCount}
                </span>
              )}
              {to === '/support-chat' && unreadSupportCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-danger px-1.5 text-[11px] font-semibold text-white">
                  {unreadSupportCount > 99 ? '99+' : unreadSupportCount}
                </span>
              )}
            </NavLink>
          ))}
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

      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
