import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { approveManualTopup, getPendingManualTopups, rejectManualTopup } from '../api/admin';
import type { WalletTransaction } from '../api/types';
import { Pagination } from '../components/Pagination';
import { Modal } from '../components/Modal';
import { SpinnerIcon } from '../components/icons';

const PAGE_SIZE = 10;

export function PendingTopups() {
  const [page, setPage] = useState(1);
  const [rejectTarget, setRejectTarget] = useState<WalletTransaction | null>(null);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['admin', 'transactions', 'pending-bkash', page],
    queryFn: () => getPendingManualTopups(page, PAGE_SIZE),
    placeholderData: (prev) => prev,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['admin', 'transactions', 'pending-bkash'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'transactions'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
  }

  const approveMutation = useMutation({
    mutationFn: approveManualTopup,
    onSuccess: () => {
      toast.success('Top-up approved and wallet credited');
      invalidate();
    },
    onError: () => toast.error('Failed to approve top-up'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectManualTopup(id, reason),
    onSuccess: () => {
      toast.success('Top-up rejected');
      setRejectTarget(null);
      invalidate();
    },
    onError: () => toast.error('Failed to reject top-up'),
  });

  const items = query.data?.items ?? [];

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-text">Pending bKash Top-ups</h1>
        <p className="mt-1 text-sm text-text-faint">
          Verify the Transaction ID against your bKash account, then approve or reject.
        </p>
      </header>

      {query.isFetching && !query.isLoading && (
        <span className="mb-3 flex items-center gap-1.5 text-xs text-text-faint">
          <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
          Updating…
        </span>
      )}

      {query.isError && (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          Failed to load pending top-ups. Please refresh.
        </p>
      )}

      {query.isLoading ? (
        <p className="py-16 text-center text-sm text-text-faint">Loading pending top-ups…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface py-16 text-center">
          <p className="text-sm font-medium text-text">All caught up</p>
          <p className="mt-1 text-sm text-text-faint">No manual bKash top-ups awaiting review.</p>
        </div>
      ) : (
        <div
          className={clsx(
            'space-y-3 transition-opacity',
            query.isFetching && !query.isLoading && 'opacity-60',
          )}
        >
          {items.map((tx) => (
            <TopupCard
              key={tx.id}
              tx={tx}
              isApproving={approveMutation.isPending && approveMutation.variables === tx.id}
              onApprove={() => approveMutation.mutate(tx.id)}
              onReject={() => setRejectTarget(tx)}
            />
          ))}
        </div>
      )}

      {query.data && query.data.total > 0 && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={query.data.total} onPageChange={setPage} />
      )}

      {rejectTarget && (
        <RejectModal
          tx={rejectTarget}
          isSubmitting={rejectMutation.isPending}
          onCancel={() => setRejectTarget(null)}
          onSubmit={(reason) => rejectMutation.mutate({ id: rejectTarget.id, reason })}
        />
      )}
    </div>
  );
}

function TopupCard({
  tx,
  isApproving,
  onApprove,
  onReject,
}: {
  tx: WalletTransaction;
  isApproving: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h3 className="text-base font-semibold text-text">৳{tx.amount}</h3>
          <span className="text-sm text-text-faint">{tx.user?.name ?? tx.user?.phone ?? 'Unknown user'}</span>
        </div>
        <p className="mt-0.5 text-sm text-text-muted">
          TrxID: <span className="font-mono">{tx.providerTransactionId}</span>
        </p>
        <p className="mt-0.5 text-sm text-text-muted">Sent from: {tx.payerAccountNumber}</p>
        <p className="mt-1.5 text-xs text-text-faint">
          Submitted {new Date(tx.createdAt).toLocaleString('en-US')}
        </p>
      </div>

      <div className="flex shrink-0 gap-2 sm:flex-col">
        <button
          type="button"
          onClick={onApprove}
          disabled={isApproving}
          className="flex-1 rounded-lg bg-success/15 px-4 py-2 text-sm font-semibold text-success hover:enabled:bg-success/25 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
        >
          {isApproving ? 'Approving…' : 'Approve'}
        </button>
        <button
          type="button"
          onClick={onReject}
          className="flex-1 rounded-lg bg-danger/15 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/25 sm:flex-none"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

function RejectModal({
  tx,
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  tx: WalletTransaction;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();

  return (
    <Modal
      title={`Reject ৳${tx.amount} top-up`}
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
            disabled={!trimmed || isSubmitting}
            onClick={() => onSubmit(trimmed)}
            className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:enabled:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Rejecting…' : 'Reject top-up'}
          </button>
        </>
      }
    >
      <label htmlFor="reject-reason" className="mb-1.5 block text-sm font-medium text-text-muted">
        Reason for rejection
      </label>
      <textarea
        id="reject-reason"
        rows={4}
        autoFocus
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. Transaction ID does not match any received payment…"
        className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-faint focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </Modal>
  );
}
