import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { getUserDetail } from '../api/admin';
import { resolveMediaUrl } from '../api/client';
import type { AdminUserDetailUser } from '../api/types';
import { Badge } from './Badge';
import type { BadgeTone } from './Badge';
import { Modal } from './Modal';
import { EmailChannel, PhoneChannel } from './ContactActions';
import {
  Field,
  Grid,
  ProfileDetails,
  Section,
  calculateAge,
  formatDetailDate,
  formatMoney,
  humanize,
} from './ProfileDetails';

const TAKA = new Intl.NumberFormat('en-BD');

function formatDate(value: string | null | undefined, withTime = false): string {
  return formatDetailDate(value, withTime) ?? '—';
}

const APPROVAL_TONE: Record<string, BadgeTone> = {
  approved: 'success',
  rejected: 'danger',
  pending: 'gold',
};

const VERIFICATION_TONE: Record<string, BadgeTone> = {
  approved: 'success',
  rejected: 'danger',
  pending: 'gold',
};

interface UserDetailModalProps {
  userId: string;
  onClose: () => void;
  onBan?: (user: AdminUserDetailUser) => void;
  onAddBalance?: (user: AdminUserDetailUser) => void;
}

export function UserDetailModal({ userId, onClose, onBan, onAddBalance }: UserDetailModalProps) {
  const query = useQuery({
    queryKey: ['admin', 'user-detail', userId],
    queryFn: () => getUserDetail(userId),
  });

  const data = query.data;
  const profile = data?.profile ?? null;
  const primaryPhoto = profile
    ? profile.photos.find((p) => p.isPrimary) ?? profile.photos[0] ?? null
    : null;
  const age = data ? calculateAge(data.user.dob) : null;
  const contactName = profile?.name?.split(' ')[0] ?? null;
  const outreachMessage = `Hello${contactName ? ` ${contactName}` : ''}, this is Biye Kora Lagbe support${
    profile?.publicId ? ` regarding your profile (${profile.publicId})` : ''
  }.`;

  return (
    <Modal
      title={profile?.name ?? data?.user.phone ?? 'User details'}
      onClose={onClose}
      maxWidthClassName="max-w-3xl"
      footer={
        data ? (
          <>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface hover:text-text"
            >
              Close
            </button>
            {onAddBalance && (
              <button
                type="button"
                onClick={() => onAddBalance(data.user)}
                className="rounded-lg bg-primary/15 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/25"
              >
                Add balance
              </button>
            )}
            {onBan && (
              <button
                type="button"
                onClick={() => onBan(data.user)}
                className={clsx(
                  'rounded-lg px-4 py-2 text-sm font-semibold',
                  data.user.status === 'banned'
                    ? 'bg-success/15 text-success hover:bg-success/25'
                    : 'bg-danger/15 text-danger hover:bg-danger/25',
                )}
              >
                {data.user.status === 'banned' ? 'Unban user' : 'Ban user'}
              </button>
            )}
          </>
        ) : undefined
      }
    >
      {query.isLoading ? (
        <p className="py-10 text-center text-sm text-text-faint">Loading user…</p>
      ) : query.isError || !data ? (
        <p className="py-10 text-center text-sm text-danger">Failed to load this user.</p>
      ) : (
        <div className="max-h-[75vh] space-y-5 overflow-y-auto pr-1">
          <div className="flex items-start gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-raised">
              {primaryPhoto ? (
                <img
                  src={resolveMediaUrl(primaryPhoto.url) ?? undefined}
                  alt={profile?.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-text-faint">
                  No photo
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h3 className="text-lg font-semibold text-text">{profile?.name ?? 'No profile'}</h3>
                <Badge tone={data.user.status === 'active' ? 'success' : 'danger'}>
                  {data.user.status}
                </Badge>
                {profile?.isVerified && <Badge tone="primary">Verified</Badge>}
                {profile && (
                  <Badge tone={APPROVAL_TONE[profile.approvalStatus] ?? 'neutral'}>
                    {profile.approvalStatus}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-text-muted">
                {data.user.phone}
                {data.user.email ? ` · ${data.user.email}` : ''}
                {age !== null ? ` · ${age} yrs` : ''}
                {data.user.gender ? (
                  <>
                    {' · '}
                    <span className="capitalize">{data.user.gender}</span>
                  </>
                ) : null}
              </p>
              <p className="mt-1 text-sm text-text-muted">
                Wallet: <span className="font-medium text-text">৳{TAKA.format(data.user.walletBalance)}</span>
                {' · '}Joined {formatDate(data.user.createdAt)}
                {' · '}Last active {formatDate(data.user.lastActiveAt, true)}
              </p>
            </div>
          </div>

          <Section title="Contact">
            <div className="space-y-2.5 rounded-lg border border-border bg-surface-raised/60 p-3">
              {data.user.phone ? (
                <PhoneChannel label="Phone" phone={data.user.phone} message={outreachMessage} />
              ) : (
                <p className="text-sm text-text-faint">No phone number on file.</p>
              )}
              {data.user.email ? (
                <EmailChannel
                  label="Email"
                  email={data.user.email}
                  subject="Your Biye Kora Lagbe account"
                  body={`${outreachMessage}\n\n`}
                />
              ) : (
                <p className="text-sm text-text-faint">No email address on file.</p>
              )}
              {profile?.relativePhone && (
                <PhoneChannel
                  label={`Guardian${profile.relativeName ? ` — ${profile.relativeName}` : ''}${
                    profile.profileCreatedBy ? ` (${humanize(profile.profileCreatedBy)})` : ''
                  }`}
                  phone={profile.relativePhone}
                  message={`Hello${profile.relativeName ? ` ${profile.relativeName}` : ''}, this is Biye Kora Lagbe support regarding ${profile.name}'s profile.`}
                />
              )}
            </div>
          </Section>

          <Section title="Account">
            <Grid>
              <Field label="User ID" value={data.user.id} />
              <Field label="Role" value={humanize(data.user.role)} />
              <Field label="Status" value={humanize(data.user.status)} />
              <Field label="Gender" value={humanize(data.user.gender)} />
              <Field
                label="Date of birth"
                value={
                  data.user.dob
                    ? `${formatDate(data.user.dob)}${age !== null ? ` (${age} yrs)` : ''}`
                    : null
                }
              />
              <Field label="Wallet balance" value={formatMoney(data.user.walletBalance)} />
              <Field label="Language" value={data.user.languagePref} />
              <Field label="Joined" value={formatDate(data.user.createdAt, true)} />
              <Field label="Last active" value={formatDate(data.user.lastActiveAt, true)} />
            </Grid>
          </Section>

          {profile?.approvalStatus === 'rejected' && profile.rejectionReason && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              Rejection reason: {profile.rejectionReason}
            </p>
          )}

          {profile && profile.photos.length > 0 && (
            <Section title={`Photos (${profile.photos.length})`}>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {profile.photos.map((photo) => (
                  <a
                    key={photo.id}
                    href={resolveMediaUrl(photo.url) ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="aspect-square overflow-hidden rounded-lg bg-surface-raised"
                  >
                    <img
                      src={resolveMediaUrl(photo.url) ?? undefined}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </a>
                ))}
              </div>
            </Section>
          )}

          {profile ? (
            <ProfileDetails profile={profile} />
          ) : (
            <p className="text-sm text-text-faint">This user hasn't created a profile yet.</p>
          )}

          <Section title="Identity verification">
            {data.verification ? (
              <div className="flex items-start gap-3">
                {data.verification.selfieUrl && (
                  <img
                    src={resolveMediaUrl(data.verification.selfieUrl) ?? undefined}
                    alt="Verification selfie"
                    className="h-16 w-16 shrink-0 rounded-lg object-cover"
                  />
                )}
                <div className="text-sm">
                  <Badge tone={VERIFICATION_TONE[data.verification.status] ?? 'neutral'}>
                    {data.verification.status}
                  </Badge>
                  <p className="mt-1 text-text-muted">NID: {data.verification.nidNumber}</p>
                  <p className="text-text-faint">Submitted {formatDate(data.verification.createdAt)}</p>
                  {data.verification.rejectionReason && (
                    <p className="text-danger">Reason: {data.verification.rejectionReason}</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-faint">No verification submission yet.</p>
            )}
          </Section>

          <Section
            title="Recent transactions"
            action={
              <Link
                to={`/transactions?userId=${data.user.id}`}
                onClick={onClose}
                className="text-xs font-medium text-primary hover:underline"
              >
                View all →
              </Link>
            }
          >
            {data.recentTransactions.length === 0 ? (
              <p className="text-sm text-text-faint">No transactions yet.</p>
            ) : (
              <div className="space-y-1.5">
                {data.recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between text-sm">
                    <span className="text-text-muted">
                      {formatDate(tx.createdAt, true)} · {tx.type.replace('_', ' ')}
                    </span>
                    <span
                      className={clsx('font-medium', tx.amount < 0 ? 'text-danger' : 'text-success')}
                    >
                      {tx.amount < 0 ? '−' : '+'}৳{TAKA.format(Math.abs(tx.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}
    </Modal>
  );
}
