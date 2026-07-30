import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { adjustWallet, banUser, getUsers, unbanUser } from '../api/admin';
import type { AdminUserRecord, UserStatus } from '../api/types';
import { Badge } from '../components/Badge';
import { Pagination } from '../components/Pagination';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';

const PAGE_SIZE = 15;
const TAKA = new Intl.NumberFormat('en-BD');

type StatusFilter = 'all' | UserStatus;

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'banned', label: 'Banned' },
];

export function Users() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [banTarget, setBanTarget] = useState<AdminUserRecord | null>(null);
  const [walletTarget, setWalletTarget] = useState<AdminUserRecord | null>(null);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['admin', 'users', page, statusFilter],
    queryFn: () => getUsers(page, PAGE_SIZE, statusFilter === 'all' ? undefined : statusFilter),
    placeholderData: (prev) => prev,
  });

  const banMutation = useMutation({
    mutationFn: (user: AdminUserRecord) =>
      user.status === 'banned' ? unbanUser(user.id) : banUser(user.id),
    onSuccess: (_data, user) => {
      toast.success(user.status === 'banned' ? 'User unbanned' : 'User banned');
      setBanTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
    onError: () => toast.error('Action failed. Please try again.'),
  });

  const walletMutation = useMutation({
    mutationFn: ({ id, amount, reason }: { id: string; amount: number; reason?: string }) =>
      adjustWallet(id, amount, reason),
    onSuccess: () => {
      toast.success('Wallet balance updated');
      setWalletTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: () => toast.error('Could not update wallet balance'),
  });

  function handleFilterChange(value: StatusFilter) {
    setStatusFilter(value);
    setPage(1);
  }

  const users = query.data?.items ?? [];

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Users</h1>
          <p className="mt-1 text-sm text-text-faint">Manage user accounts and access</p>
        </div>

        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => handleFilterChange(f.value)}
              className={clsx(
                'rounded-md px-3 py-1.5 text-sm font-medium',
                statusFilter === f.value
                  ? 'bg-primary text-white'
                  : 'text-text-muted hover:text-text',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      {query.isError && (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          Failed to load users. Please refresh.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-text-faint">
              <th className="px-4 py-3 font-medium">Phone</th>
              <th className="px-4 py-3 font-medium">Profile</th>
              <th className="px-4 py-3 font-medium">District</th>
              <th className="px-4 py-3 font-medium">Gender</th>
              <th className="px-4 py-3 font-medium">Verified</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Wallet</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-text-faint">
                  Loading users…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-text-faint">
                  No users match this filter.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-text">{user.phone}</td>
                  <td className="px-4 py-3 text-text-muted">
                    {user.profile?.name ?? <span className="text-text-faint">No profile</span>}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {user.profile
                      ? [user.profile.subDistrict, user.profile.district].filter(Boolean).join(', ')
                      : <span className="text-text-faint">—</span>}
                  </td>
                  <td className="px-4 py-3 capitalize text-text-muted">{user.gender}</td>
                  <td className="px-4 py-3">
                    <Badge tone={user.profile?.isVerified ? 'primary' : 'neutral'}>
                      {user.profile?.isVerified ? 'Verified' : 'No'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={user.status === 'active' ? 'success' : 'danger'}>
                      {user.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    ৳{TAKA.format(user.walletBalance)}
                  </td>
                  <td className="px-4 py-3 text-text-faint">
                    {new Date(user.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setWalletTarget(user)}
                        className="rounded-lg bg-primary/15 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/25"
                      >
                        Add balance
                      </button>
                      <button
                        type="button"
                        onClick={() => setBanTarget(user)}
                        className={clsx(
                          'rounded-lg px-3 py-1.5 text-sm font-medium',
                          user.status === 'banned'
                            ? 'bg-success/15 text-success hover:bg-success/25'
                            : 'bg-danger/15 text-danger hover:bg-danger/25',
                        )}
                      >
                        {user.status === 'banned' ? 'Unban' : 'Ban'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {query.data && query.data.total > 0 && (
          <div className="px-4">
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={query.data.total}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {banTarget && (
        <ConfirmDialog
          title={banTarget.status === 'banned' ? 'Unban user' : 'Ban user'}
          message={
            banTarget.status === 'banned'
              ? `Restore access for ${banTarget.phone}? They will be able to use the app again immediately.`
              : `Ban ${banTarget.phone}? They will lose access to the app immediately.`
          }
          confirmLabel={banTarget.status === 'banned' ? 'Unban user' : 'Ban user'}
          tone={banTarget.status === 'banned' ? 'primary' : 'danger'}
          isLoading={banMutation.isPending}
          onConfirm={() => banMutation.mutate(banTarget)}
          onCancel={() => setBanTarget(null)}
        />
      )}

      {walletTarget && (
        <WalletAdjustModal
          user={walletTarget}
          isSubmitting={walletMutation.isPending}
          onCancel={() => setWalletTarget(null)}
          onSubmit={(amount, reason) => walletMutation.mutate({ id: walletTarget.id, amount, reason })}
        />
      )}
    </div>
  );
}

function WalletAdjustModal({
  user,
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  user: AdminUserRecord;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (amount: number, reason?: string) => void;
}) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const parsedAmount = Number(amount);
  const isValid = amount.trim() !== '' && Number.isInteger(parsedAmount) && parsedAmount !== 0;

  return (
    <Modal
      title={`Adjust balance — ${user.phone}`}
      onClose={onCancel}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface hover:text-text"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isValid || isSubmitting}
            onClick={() => onSubmit(parsedAmount, reason.trim() || undefined)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:enabled:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <p className="mb-3 text-sm text-text-muted">
        Current balance: <span className="font-medium text-text">৳{TAKA.format(user.walletBalance)}</span>
      </p>
      <label htmlFor="wallet-amount" className="mb-1.5 block text-sm font-medium text-text-muted">
        Amount (taka)
      </label>
      <input
        id="wallet-amount"
        type="number"
        autoFocus
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="e.g. 100 to credit, -100 to debit"
        className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-faint focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <label htmlFor="wallet-reason" className="mb-1.5 mt-3 block text-sm font-medium text-text-muted">
        Reason (optional)
      </label>
      <textarea
        id="wallet-reason"
        rows={3}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. Compensation for a service issue"
        className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-faint focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </Modal>
  );
}
