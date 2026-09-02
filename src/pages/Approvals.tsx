import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { approveProfile, getPendingProfiles, rejectProfile } from '../api/admin';
import { resolveMediaUrl } from '../api/client';
import type { Gender, Profile, SortOrder } from '../api/types';
import { Badge } from '../components/Badge';
import { Pagination } from '../components/Pagination';
import { Modal } from '../components/Modal';
import { SearchInput } from '../components/SearchInput';
import { UserDetailModal } from '../components/UserDetailModal';
import { EmailChannel, PhoneChannel } from '../components/ContactActions';
import {
  Field,
  Grid,
  ProfileDetails,
  Section,
  calculateAge,
  formatDetailDate,
  formatHeight,
  formatMoney,
  humanize,
} from '../components/ProfileDetails';
import { ChevronDownIcon, SpinnerIcon } from '../components/icons';

const PAGE_SIZE = 10;

type GenderFilter = 'all' | Gender;
type SortChoice = 'createdAt_ASC' | 'createdAt_DESC' | 'name_ASC' | 'name_DESC';

const SORT_OPTIONS: { value: SortChoice; label: string }[] = [
  { value: 'createdAt_ASC', label: 'Oldest first' },
  { value: 'createdAt_DESC', label: 'Newest first' },
  { value: 'name_ASC', label: 'Name A–Z' },
  { value: 'name_DESC', label: 'Name Z–A' },
];

function formatRelative(value: string | null | undefined): string | null {
  if (!value) return null;
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return null;
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.round(days / 30);
  return `${months} month${months === 1 ? '' : 's'} ago`;
}

export function Approvals() {
  const [page, setPage] = useState(1);
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [search, setSearch] = useState('');
  const [sortChoice, setSortChoice] = useState<SortChoice>('createdAt_ASC');
  const [rejectTarget, setRejectTarget] = useState<Profile | null>(null);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const [sortBy, sortOrder] = sortChoice.split('_') as [string, SortOrder];

  const query = useQuery({
    queryKey: ['admin', 'profiles', 'pending', page, genderFilter, search, sortChoice],
    queryFn: () =>
      getPendingProfiles({
        page,
        pageSize: PAGE_SIZE,
        gender: genderFilter === 'all' ? undefined : genderFilter,
        search: search || undefined,
        sortBy,
        sortOrder,
      }),
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

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  const profiles = query.data?.items ?? [];
  const allExpanded = profiles.length > 0 && profiles.every((p) => expandedIds.includes(p.id));

  function toggleExpanded(id: string) {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-text">Approvals</h1>
        <p className="mt-1 text-sm text-text-faint">
          Review new profiles before they go live — every submitted detail and contact channel is here
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          onSearch={handleSearch}
          placeholder="Search by name, profile ID, phone or email…"
          className="w-full sm:w-72"
        />
        <select
          value={genderFilter}
          onChange={(e) => {
            setGenderFilter(e.target.value as GenderFilter);
            setPage(1);
          }}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">All genders</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        <select
          value={sortChoice}
          onChange={(e) => {
            setSortChoice(e.target.value as SortChoice);
            setPage(1);
          }}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {profiles.length > 0 && (
          <button
            type="button"
            onClick={() => setExpandedIds(allExpanded ? [] : profiles.map((p) => p.id))}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-muted hover:bg-surface-raised hover:text-text"
          >
            {allExpanded ? 'Collapse all details' : 'Expand all details'}
          </button>
        )}
        {query.isFetching && !query.isLoading && (
          <span className="flex items-center gap-1.5 text-xs text-text-faint">
            <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
            Updating…
          </span>
        )}
      </div>

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
          <p className="mt-1 text-sm text-text-faint">
            {search || genderFilter !== 'all'
              ? 'No profiles match this search or filter.'
              : 'There are no profiles awaiting review.'}
          </p>
        </div>
      ) : (
        <div
          className={clsx(
            'space-y-3 transition-opacity',
            query.isFetching && !query.isLoading && 'opacity-60',
          )}
        >
          {profiles.map((profile) => (
            <ApprovalCard
              key={profile.id}
              profile={profile}
              expanded={expandedIds.includes(profile.id)}
              onToggleExpanded={() => toggleExpanded(profile.id)}
              isApproving={approveMutation.isPending && approveMutation.variables === profile.id}
              onApprove={() => approveMutation.mutate(profile.id)}
              onReject={() => setRejectTarget(profile)}
              onView={() => setDetailUserId(profile.userId)}
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

      {detailUserId && (
        <UserDetailModal userId={detailUserId} onClose={() => setDetailUserId(null)} />
      )}
    </div>
  );
}

function ApprovalCard({
  profile,
  expanded,
  onToggleExpanded,
  isApproving,
  onApprove,
  onReject,
  onView,
}: {
  profile: Profile;
  expanded: boolean;
  onToggleExpanded: () => void;
  isApproving: boolean;
  onApprove: () => void;
  onReject: () => void;
  onView: () => void;
}) {
  const user = profile.user;
  const primaryPhoto = profile.photos.find((p) => p.isPrimary) ?? profile.photos[0] ?? null;
  const photoUrl = resolveMediaUrl(primaryPhoto?.url);
  const age = calculateAge(user?.dob);
  const submitted = formatRelative(profile.createdAt);

  const contactName = profile.name.split(' ')[0] || profile.name;
  const waMessage = `Hello ${contactName}, this is Biye Kora Lagbe support regarding your profile submission${
    profile.publicId ? ` (${profile.publicId})` : ''
  }.`;

  const quickFacts = [
    [profile.city, profile.state, profile.country].filter(Boolean).join(', ') ||
      [profile.subDistrict, profile.district].filter(Boolean).join(', '),
    profile.profession,
    profile.education,
    humanize(profile.maritalStatus),
    formatHeight(profile.heightCm),
    profile.religion,
  ].filter(Boolean);

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <a
          href={photoUrl ?? undefined}
          target="_blank"
          rel="noreferrer"
          className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-surface-raised"
        >
          {photoUrl ? (
            <img src={photoUrl} alt={profile.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-text-faint">
              No photo
            </div>
          )}
        </a>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-base font-semibold text-text">{profile.name}</h3>
            {profile.publicId && (
              <span className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-xs text-text-faint">
                {profile.publicId}
              </span>
            )}
            {age !== null && <span className="text-sm text-text-faint">{age} yrs</span>}
            {user?.gender && (
              <span className="text-sm capitalize text-text-faint">{user.gender}</span>
            )}
            <Badge tone="gold">pending</Badge>
            {user?.status === 'banned' && <Badge tone="danger">banned</Badge>}
            {profile.isVerified && <Badge tone="primary">verified</Badge>}
          </div>

          <p className="mt-1 text-xs text-text-faint">
            Submitted {submitted ?? '—'} · {formatDetailDate(profile.createdAt, true) ?? '—'}
            {user?.createdAt ? ` · Joined ${formatDetailDate(user.createdAt)}` : ''}
            {user?.lastActiveAt ? ` · Last active ${formatDetailDate(user.lastActiveAt, true)}` : ''}
          </p>

          <div className="mt-3 space-y-2.5 rounded-lg border border-border bg-surface-raised/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-faint">
              Contact this member
            </p>

            {user?.phone ? (
              <PhoneChannel
                label="Phone"
                phone={user.phone}
                message={waMessage}
                badge={
                  <Badge tone={user.phoneVerifiedAt ? 'success' : 'neutral'}>
                    {user.phoneVerifiedAt ? 'verified' : 'unverified'}
                  </Badge>
                }
              />
            ) : (
              <p className="text-sm text-text-faint">No phone number on file.</p>
            )}

            {user?.email ? (
              <EmailChannel
                label="Email"
                email={user.email}
                subject="Your Biye Kora Lagbe profile"
                body={`${waMessage}\n\n`}
                badge={
                  <Badge tone={user.emailVerifiedAt ? 'success' : 'neutral'}>
                    {user.emailVerifiedAt ? 'verified' : 'unverified'}
                  </Badge>
                }
              />
            ) : (
              <p className="text-sm text-text-faint">No email address on file.</p>
            )}

            {profile.relativePhone && (
              <PhoneChannel
                label={`Guardian${profile.relativeName ? ` — ${profile.relativeName}` : ''}${
                  profile.profileCreatedBy ? ` (${humanize(profile.profileCreatedBy)})` : ''
                }`}
                phone={profile.relativePhone}
                message={`Hello${profile.relativeName ? ` ${profile.relativeName}` : ''}, this is Biye Kora Lagbe support regarding ${profile.name}'s profile submission.`}
              />
            )}
          </div>

          {quickFacts.length > 0 && (
            <p className="mt-2.5 text-sm text-text-muted">{quickFacts.join(' · ')}</p>
          )}
          {profile.bio && (
            <p className={clsx('mt-1.5 text-sm text-text-faint', !expanded && 'line-clamp-2')}>
              {profile.bio}
            </p>
          )}

          <button
            type="button"
            onClick={onToggleExpanded}
            className="mt-2.5 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {expanded ? 'Hide full details' : 'Show full details'}
            <ChevronDownIcon
              className={clsx('h-4 w-4 transition-transform', expanded && 'rotate-180')}
            />
          </button>
        </div>

        <div className="flex shrink-0 gap-2 sm:flex-col">
          <button
            type="button"
            onClick={onView}
            className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-raised hover:text-text sm:flex-none"
          >
            View
          </button>
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

      {expanded && (
        <div className="mt-4 space-y-5 border-t border-border pt-4">
          {profile.photos.length > 0 && (
            <Section title={`Photos (${profile.photos.length})`}>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {profile.photos.map((photo) => (
                  <a
                    key={photo.id}
                    href={resolveMediaUrl(photo.url) ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="relative aspect-square overflow-hidden rounded-lg bg-surface-raised"
                  >
                    <img
                      src={resolveMediaUrl(photo.url) ?? undefined}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    {photo.isPrimary && (
                      <span className="absolute bottom-0 left-0 right-0 bg-black/60 py-0.5 text-center text-[10px] text-white">
                        primary
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </Section>
          )}

          <Section title="Account">
            <Grid>
              <Field label="User ID" value={profile.userId} />
              <Field label="Phone" value={user?.phone} />
              <Field
                label="Phone verified"
                value={formatDetailDate(user?.phoneVerifiedAt, true) ?? 'Not verified'}
              />
              <Field label="Email" value={user?.email} />
              <Field
                label="Email verified"
                value={formatDetailDate(user?.emailVerifiedAt, true) ?? 'Not verified'}
              />
              <Field label="Signed up with" value={humanize(user?.authProvider)} />
              <Field label="Gender" value={humanize(user?.gender)} />
              <Field
                label="Date of birth"
                value={
                  user?.dob
                    ? `${formatDetailDate(user.dob)}${age !== null ? ` (${age} yrs)` : ''}`
                    : null
                }
              />
              <Field label="Account status" value={humanize(user?.status)} />
              <Field label="Role" value={humanize(user?.role)} />
              <Field label="Wallet balance" value={formatMoney(user?.walletBalance)} />
              <Field label="Language" value={user?.languagePref} />
              <Field label="Joined" value={formatDetailDate(user?.createdAt, true)} />
              <Field label="Last active" value={formatDetailDate(user?.lastActiveAt, true)} />
            </Grid>
          </Section>

          <ProfileDetails profile={profile} />
        </div>
      )}
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
