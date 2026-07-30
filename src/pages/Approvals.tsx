import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { approveProfile, getPendingProfiles, rejectProfile } from '../api/admin';
import { resolveMediaUrl } from '../api/client';
import type { Profile } from '../api/types';
import { Pagination } from '../components/Pagination';
import { Modal } from '../components/Modal';

const PAGE_SIZE = 10;

function calculateAge(dob: string | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const diff = Date.now() - birth.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export function Approvals() {
  const [page, setPage] = useState(1);
  const [rejectTarget, setRejectTarget] = useState<Profile | null>(null);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['admin', 'profiles', 'pending', page],
    queryFn: () => getPendingProfiles(page, PAGE_SIZE),
    placeholderData: (prev) => prev,
  });

  function invalidateAfterModeration() {
    queryClient.invalidateQueries({ queryKey: ['admin', 'profiles', 'pending'] });
    queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
  }

  const approveMutation = useMutation({
    mutationFn: approveProfile,
    onSuccess: () => {
      toast.success('Profile approved');
      invalidateAfterModeration();
    },
    onError: () => toast.error('Failed to approve profile'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectProfile(id, reason),
    onSuccess: () => {
      toast.success('Profile rejected');
      setRejectTarget(null);
      invalidateAfterModeration();
    },
    onError: () => toast.error('Failed to reject profile'),
  });

  const profiles = query.data?.items ?? [];

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-text">Approvals</h1>
        <p className="mt-1 text-sm text-text-faint">
          Review new profiles before they go live on the platform
        </p>
      </header>

      {query.isError && (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          Failed to load pending profiles. Please refresh.
        </p>
      )}

      {query.isLoading ? (
        <p className="py-16 text-center text-sm text-text-faint">Loading pending profiles…</p>
      ) : profiles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface py-16 text-center">
          <p className="text-sm font-medium text-text">All caught up</p>
          <p className="mt-1 text-sm text-text-faint">There are no profiles awaiting review.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((profile) => (
            <ApprovalCard
              key={profile.id}
              profile={profile}
              isApproving={approveMutation.isPending && approveMutation.variables === profile.id}
              onApprove={() => approveMutation.mutate(profile.id)}
              onReject={() => setRejectTarget(profile)}
            />
          ))}
        </div>
      )}

      {query.data && query.data.total > 0 && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={query.data.total}
          onPageChange={setPage}
        />
      )}

      {rejectTarget && (
        <RejectModal
          profileName={rejectTarget.name}
          isSubmitting={rejectMutation.isPending}
          onCancel={() => setRejectTarget(null)}
          onSubmit={(reason) => rejectMutation.mutate({ id: rejectTarget.id, reason })}
        />
      )}
    </div>
  );
}

function ApprovalCard({
  profile,
  isApproving,
  onApprove,
  onReject,
}: {
  profile: Profile;
  isApproving: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const primaryPhoto =
    profile.photos.find((p) => p.isPrimary) ?? profile.photos[0] ?? null;
  const photoUrl = resolveMediaUrl(primaryPhoto?.url);
  const age = calculateAge(profile.user?.dob);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-raised">
        {photoUrl ? (
          <img src={photoUrl} alt={profile.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-text-faint">
            No photo
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h3 className="text-base font-semibold text-text">{profile.name}</h3>
          {age !== null && <span className="text-sm text-text-faint">{age} yrs</span>}
          {profile.user?.gender && (
            <span className="text-sm capitalize text-text-faint">{profile.user.gender}</span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-text-muted">
          {[
            profile.subDistrict ? `${profile.subDistrict}, ${profile.district}` : profile.district,
            profile.profession,
            profile.maritalStatus,
          ]
            .filter(Boolean)
            .join(' · ') || 'No additional details'}
        </p>
        {profile.bio && (
          <p className="mt-1.5 line-clamp-2 text-sm text-text-faint">{profile.bio}</p>
        )}
        <p className="mt-1.5 text-xs text-text-faint">{profile.user?.phone}</p>
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
  profileName,
  isSubmitting,
  onCancel,
  onSubmit,
}: {
  profileName: string;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();

  return (
    <Modal
      title={`Reject ${profileName}`}
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
            {isSubmitting ? 'Rejecting…' : 'Reject profile'}
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
        placeholder="e.g. Photos do not meet guidelines, incomplete profile details…"
        className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-faint focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <p className="mt-1.5 text-xs text-text-faint">
        This reason is shown to the user so they can fix and resubmit.
      </p>
    </Modal>
  );
}
