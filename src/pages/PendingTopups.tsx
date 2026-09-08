import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  approveManualTopup,
  bulkDeleteTransactions,
  getPendingManualTopups,
  rejectManualTopup,
} from '../api/admin';
import { apiErrorMessage } from '../api/client';
import type { WalletTransaction } from '../api/types';
import { BulkActionBar } from '../components/BulkActionBar';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Pagination } from '../components/Pagination';
import { Modal } from '../components/Modal';
import { SelectCheckbox } from '../components/SelectCheckbox';
import { SpinnerIcon } from '../components/icons';
import { usePageSize } from '../hooks/usePageSize';
import { useRowSelection } from '../hooks/useRowSelection';
import { reportBulkDelete } from '../lib/bulkDelete';

export function PendingTopups() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('pending-topups');
  const [rejectTarget, setRejectTarget] = useState<WalletTransaction | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['admin', 'transactions', 'pending-bkash', page, pageSize],
    queryFn: () => getPendingManualTopups(page, pageSize),
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
  const selection = useRowSelection(items.map((tx) => tx.id));

  const deleteMutation = useMutation({
    mutationFn: () => bulkDeleteTransactions(selection.selectedIds),
    onSuccess: (result) => {
      reportBulkDelete(result, 'top-up');
      setConfirmingDelete(false);
      selection.clear();
      invalidate();
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Could not delete the selected top-ups')),
  });

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-text sm:text-2xl">Pending bKash Top-ups</h1>
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
        <>
          <BulkActionBar
            count={selection.count}
            noun="top-up"
            allSelected={selection.allSelected}
            someSelected={selection.someSelected}
            onToggleAll={selection.toggleAll}
            onClear={selection.clear}
            onDelete={() => setConfirmingDelete(true)}
            isDeleting={deleteMutation.isPending}
          />

          <label className="mb-2 flex w-fit cursor-pointer items-center gap-2 px-1 text-sm text-text-faint">
            <SelectCheckbox
              checked={selection.allSelected}
              indeterminate={selection.someSelected}
              onChange={selection.toggleAll}
              label="Select all top-ups on this page"
            />
            Select all on this page
          </label>

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
                selected={selection.isSelected(tx.id)}
                onToggleSelected={() => selection.toggle(tx.id)}
                isApproving={approveMutation.isPending && approveMutation.variables === tx.id}
                onApprove={() => approveMutation.mutate(tx.id)}
                onReject={() => setRejectTarget(tx)}
              />
            ))}
          </div>
        </>
      )}

      {query.data && query.data.total > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={query.data.total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          idPrefix="pending-topups"
        />
      )}

      {confirmingDelete && (
        <ConfirmDialog
          title={`Delete ${selection.count} top-up request${selection.count === 1 ? '' : 's'}`}
          message={`Permanently delete the ${selection.count} selected request${
            selection.count === 1 ? '' : 's'
          }? These are still awaiting review, so no wallet has been credited and no balance changes. The member is not told — if they really did pay, rejecting with a reason is the better route, because deleting simply makes their request vanish. This cannot be undone.`}
          confirmLabel="Delete permanently"
          tone="danger"
          isLoading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setConfirmingDelete(false)}
        />
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
  selected,
  onToggleSelected,
  isApproving,
  onApprove,
  onReject,
}: {
  tx: WalletTransaction;
  selected: boolean;
  onToggleSelected: () => void;
  isApproving: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div
      className={clsx(
        'flex flex-col gap-4 rounded-xl border bg-surface p-4 sm:flex-row sm:items-center',
        selected ? 'border-primary/50 ring-1 ring-primary/30' : 'border-border',
      )}
    >
      <SelectCheckbox
        checked={selected}
        onChange={onToggleSelected}
        label={`Select ৳${tx.amount} top-up from ${tx.user?.name ?? tx.user?.phone ?? 'unknown user'}`}
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h3 className="text-base font-semibold text-text">৳{tx.amount}</h3>
          <span className="text-sm text-text-faint">{tx.user?.name ?? tx.user?.phone ?? 'Unknown user'}</span>
        </div>
        <p className="mt-0.5 text-sm text-text-muted">
          TrxID: <span className="font-mono break-all">{tx.providerTransactionId}</span>
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
          className="flex-1 rounded-lg bg-success/15 px-4 py-2.5 text-sm font-semibold text-success hover:enabled:bg-success/25 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:py-2"
        >
          {isApproving ? 'Approving…' : 'Approve'}
        </button>
        <button
          type="button"
          onClick={onReject}
          className="flex-1 rounded-lg bg-danger/15 px-4 py-2.5 text-sm font-semibold text-danger hover:bg-danger/25 sm:flex-none sm:py-2"
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
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-muted hover:bg-surface hover:text-text sm:py-2"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!trimmed || isSubmitting}
            onClick={() => onSubmit(trimmed)}
            className="rounded-lg bg-danger px-4 py-2.5 text-sm font-medium text-white hover:enabled:bg-danger/90 disabled:cursor-not-allowed disabled:opacity-60 sm:py-2"
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
