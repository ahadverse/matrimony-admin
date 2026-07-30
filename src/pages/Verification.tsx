import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { approveVerification, getVerificationSubmissions, rejectVerification } from '../api/admin';
import { resolveMediaUrl } from '../api/client';
import type { VerificationStatus, VerificationSubmission } from '../api/types';
import { Badge } from '../components/Badge';
import { Pagination } from '../components/Pagination';
import { Modal } from '../components/Modal';

const PAGE_SIZE = 10;

type StatusFilter = 'all' | VerificationStatus;

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
];

export function Verification() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [rejectTarget, setRejectTarget] = useState<VerificationSubmission | null>(null);
  const [viewTarget, setViewTarget] = useState<VerificationSubmission | null>(null);
  const queryClient = useQueryClient();

  const statusParam = filter === 'all' ? undefined : filter;

  const query = useQuery({
    queryKey: ['admin', 'verifications', page, filter],
    queryFn: () => getVerificationSubmissions(page, PAGE_SIZE, statusParam),
    placeholderData: (prev) => prev,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['admin', 'verifications'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
  }

  const approveMutation = useMutation({
    mutationFn: approveVerification,
    onSuccess: () => {
      toast.success('Identity verified');
      invalidate();
    },
    onError: () => toast.error('Failed to approve submission'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectVerification(id, reason),
    onSuccess: () => {
      toast.success('Submission rejected');
      setRejectTarget(null);
      invalidate();
    },
    onError: () => toast.error('Failed to reject submission'),
  });

  function handleFilterChange(value: StatusFilter) {
    setFilter(value);
    setPage(1);
  }

  const submissions = query.data?.items ?? [];

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Verification</h1>
          <p className="mt-1 text-sm text-text-faint">
            Review submitted NID numbers and selfies to grant the verified badge
          </p>
        </div>

        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => handleFilterChange(f.value)}
              className={clsx(
                'rounded-md px-3 py-1.5 text-sm font-medium',
                filter === f.value ? 'bg-primary text-white' : 'text-text-muted hover:text-text',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      {query.isError && (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          Failed to load submissions. Please refresh.
        </p>
      )}

      {query.isLoading ? (
        <p className="py-16 text-center text-sm text-text-faint">Loading submissions…</p>
      ) : submissions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface py-16 text-center">
          <p className="text-sm font-medium text-text">Nothing here</p>
          <p className="mt-1 text-sm text-text-faint">No submissions match this filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {submissions.map((submission) => (
            <SubmissionCard
              key={submission.id}
              submission={submission}
              isApproving={approveMutation.isPending && approveMutation.variables === submission.id}
              onApprove={() => approveMutation.mutate(submission.id)}
              onReject={() => setRejectTarget(submission)}
              onView={() => setViewTarget(submission)}
            />
          ))}
        </div>
      )}

      {query.data && query.data.total > 0 && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={query.data.total} onPageChange={setPage} />
      )}

      {rejectTarget && (
        <RejectModal
          submission={rejectTarget}
          isSubmitting={rejectMutation.isPending}
          onCancel={() => setRejectTarget(null)}
          onSubmit={(reason) => rejectMutation.mutate({ id: rejectTarget.id, reason })}
        />
      )}

      {viewTarget && (
        <DetailModal
          submission={viewTarget}
          isApproving={approveMutation.isPending && approveMutation.variables === viewTarget.id}
          onApprove={() => {
            approveMutation.mutate(viewTarget.id);
            setViewTarget(null);
          }}
          onReject={() => {
            setRejectTarget(viewTarget);
            setViewTarget(null);
          }}
          onClose={() => setViewTarget(null)}
        />
      )}
    </div>
  );
}

function SubmissionCard({
  submission,
  isApproving,
  onApprove,
  onReject,
  onView,
}: {
  submission: VerificationSubmission;
  isApproving: boolean;
  onApprove: () => void;
  onReject: () => void;
  onView: () => void;
}) {
  const selfieUrl = resolveMediaUrl(submission.selfieUrl);
  const statusTone = submission.status === 'approved' ? 'success' : submission.status === 'rejected' ? 'danger' : 'gold';

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={onView}
        aria-label="View full details"
        className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-raised transition-opacity hover:opacity-80"
      >
        {selfieUrl ? (
          <img src={selfieUrl} alt="Submitted selfie with NID" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-text-faint">No photo</div>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h3 className="text-base font-semibold text-text">{submission.user?.name ?? 'No profile'}</h3>
          <Badge tone={statusTone}>{submission.status}</Badge>
        </div>
        <p className="mt-0.5 text-sm text-text-muted">NID: {submission.nidNumber}</p>
        <p className="mt-0.5 text-xs text-text-faint">{submission.user?.phone}</p>
        {submission.status === 'rejected' && submission.rejectionReason && (
          <p className="mt-1.5 text-xs text-danger">Reason: {submission.rejectionReason}</p>
        )}
        <p className="mt-1.5 text-xs text-text-faint">
          Submitted{' '}
          {new Date(submission.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </p>
      </div>

      <div className="flex shrink-0 gap-2 sm:flex-col">
        <button
          type="button"
          onClick={onView}
          className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text-muted hover:bg-surface-raised hover:text-text sm:flex-none"
        >
          View details
        </button>
        {submission.status === 'pending' && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}

function DetailModal({
  submission,
  isApproving,
  onApprove,
  onReject,
  onClose,
}: {
  submission: VerificationSubmission;
  isApproving: boolean;
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
}) {
  const selfieUrl = resolveMediaUrl(submission.selfieUrl);
  const statusTone = submission.status === 'approved' ? 'success' : submission.status === 'rejected' ? 'danger' : 'gold';

  function formatDateTime(value: string) {
    return new Date(value).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return (
    <Modal
      title="Verification details"
      onClose={onClose}
      maxWidthClassName="max-w-xl"
      footer={
        submission.status === 'pending' ? (
          <>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface hover:text-text"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onReject}
              className="rounded-lg bg-danger/15 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/25"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={onApprove}
              disabled={isApproving}
              className="rounded-lg bg-success px-4 py-2 text-sm font-medium text-white hover:enabled:bg-success/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isApproving ? 'Approving…' : 'Approve'}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface hover:text-text"
          >
            Close
          </button>
        )
      }
    >
      <div className="flex items-center justify-center overflow-hidden rounded-lg bg-surface-raised">
        {selfieUrl ? (
          <img
            src={selfieUrl}
            alt="Submitted selfie with NID"
            className="max-h-[60vh] w-full object-contain"
          />
        ) : (
          <div className="flex h-48 w-full items-center justify-center text-sm text-text-faint">No photo</div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-baseline gap-x-2">
        <h3 className="text-base font-semibold text-text">{submission.user?.name ?? 'No profile'}</h3>
        <Badge tone={statusTone}>{submission.status}</Badge>
      </div>

      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-text-faint">NID number</dt>
          <dd className="font-mono text-text">{submission.nidNumber}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-faint">Phone</dt>
          <dd className="text-text">{submission.user?.phone ?? '—'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-text-faint">Submitted</dt>
          <dd className="text-text">{formatDateTime(submission.createdAt)}</dd>
        </div>
        {submission.reviewedAt && (
          <div className="flex justify-between gap-4">
            <dt className="text-text-faint">Reviewed</dt>
            <dd className="text-text">{formatDateTime(submission.reviewedAt)}</dd>
          </div>
        )}
      </dl>

      {submission.status === 'rejected' && submission.rejectionReason && (
        <p className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          Reason: {submission.rejectionReason}
        </p>
      )}
    </Modal>
  );
}

function RejectModal({
  submission,
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  submission: VerificationSubmission;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();

  return (
    <Modal
      title={`Reject ${submission.user?.name ?? 'submission'}`}
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
            {isSubmitting ? 'Rejecting…' : 'Reject submission'}
          </button>
        </>
      }
    >
      <label htmlFor="reject-verification-reason" className="mb-1.5 block text-sm font-medium text-text-muted">
        Reason for rejection
      </label>
      <textarea
        id="reject-verification-reason"
        rows={4}
        autoFocus
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. NID number doesn't match, selfie unclear…"
        className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-faint focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <p className="mt-1.5 text-xs text-text-faint">This reason is shown to the user so they can resubmit.</p>
    </Modal>
  );
}
