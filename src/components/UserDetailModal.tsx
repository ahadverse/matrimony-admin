import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { getUserDetail } from '../api/admin';
import { resolveMediaUrl } from '../api/client';
import type { AdminUserDetailUser } from '../api/types';
import { Badge } from './Badge';
import type { BadgeTone } from './Badge';
import { Modal } from './Modal';

const TAKA = new Intl.NumberFormat('en-BD');

function formatDate(value: string | null | undefined, withTime = false): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  });
}

function calculateAge(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  return Math.floor((Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

function formatHeight(cm: number | null | undefined): string | null {
  if (cm == null) return null;
  const totalInches = Math.round(cm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet} feet ${inches} inch`;
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

          {profile?.approvalStatus === 'rejected' && profile.rejectionReason && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              Rejection reason: {profile.rejectionReason}
            </p>
          )}

          {profile && profile.photos.length > 0 && (
            <Section title="Photos">
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
            <>
              <Section title="Basics">
                <Grid>
                  <Field label="Profile ID" value={profile.publicId} />
                  <Field
                    label="District"
                    value={[profile.subDistrict, profile.district].filter(Boolean).join(', ')}
                  />
                  <Field label="Marital status" value={profile.maritalStatus} />
                  <Field label="Nationality" value={profile.nationality} />
                  <Field label="Profile created by" value={profile.profileCreatedBy} />
                  <Field label="Relative name" value={profile.relativeName} />
                  <Field label="Height" value={formatHeight(profile.heightCm)} />
                  <Field label="Weight" value={profile.weightKg ? `${profile.weightKg} kg` : null} />
                  <Field label="Blood group" value={profile.bloodGroup} />
                  <Field label="Complexion" value={profile.complexion} />
                  <Field label="Body type" value={profile.bodyType} />
                  <Field label="Physical details" value={profile.physicalDetails} />
                </Grid>
              </Section>

              <Section title="Education & career">
                <Grid>
                  <Field label="Education" value={profile.education} />
                  <Field label="Education details" value={profile.educationDetails} />
                  <Field label="College/university" value={profile.collegeUniversity} />
                  <Field label="Profession" value={profile.profession} />
                  <Field label="Profession details" value={profile.professionDetails} />
                  <Field label="Working sector" value={profile.workingSector} />
                  <Field label="Company" value={profile.companyName} />
                  <Field
                    label="Monthly income"
                    value={
                      profile.monthlyIncome
                        ? `৳${TAKA.format(profile.monthlyIncome)}${profile.incomeIsPrivate ? ' (private)' : ''}`
                        : null
                    }
                  />
                </Grid>
              </Section>

              <Section title="Family & background">
                <Grid>
                  <Field label="Religion" value={profile.religion} />
                  <Field label="Religious value" value={profile.religiousValue} />
                  <Field label="Family values" value={profile.familyValues} />
                  <Field label="Diet" value={profile.diet} />
                  <Field label="Smoking" value={profile.smoke} />
                  <Field label="Mother tongue" value={profile.motherTongue} />
                  <Field label="English comfort" value={profile.englishComfort} />
                  <Field label="Residency status" value={profile.residencyStatus} />
                  <Field label="Grew up in" value={profile.growUpIn} />
                  <Field label="Father" value={profile.fatherStatus} />
                  <Field label="Father's occupation" value={profile.fatherOccupation} />
                  <Field label="Mother" value={profile.motherStatus} />
                  <Field label="Mother's occupation" value={profile.motherOccupation} />
                  <Field
                    label="Siblings"
                    value={
                      profile.numberOfBrothers != null || profile.numberOfSisters != null
                        ? `${profile.numberOfBrothers ?? 0} brother(s), ${profile.numberOfSisters ?? 0} sister(s)`
                        : null
                    }
                  />
                  <Field
                    label="Brothers (married / unmarried)"
                    value={
                      profile.brothersMarried != null || profile.brothersUnmarried != null
                        ? `${profile.brothersMarried ?? 0} / ${profile.brothersUnmarried ?? 0}`
                        : null
                    }
                  />
                  <Field
                    label="Sisters (married / unmarried)"
                    value={
                      profile.sistersMarried != null || profile.sistersUnmarried != null
                        ? `${profile.sistersMarried ?? 0} / ${profile.sistersUnmarried ?? 0}`
                        : null
                    }
                  />
                  <Field label="Family details" value={profile.familyDetails} />
                  <Field label="Family financial status" value={profile.familyFinancialStatus} />
                </Grid>
              </Section>

              <Section title="Addresses">
                <Grid>
                  <Field label="Present address" value={profile.presentAddress} />
                  <Field label="Permanent address" value={profile.permanentAddress} />
                </Grid>
              </Section>

              {(profile.bio || profile.partnerPreferences || profile.hobbies) && (
                <Section title="About">
                  <div className="space-y-2 text-sm">
                    {profile.bio && (
                      <p>
                        <span className="text-text-faint">Bio: </span>
                        <span className="text-text">{profile.bio}</span>
                      </p>
                    )}
                    {profile.partnerPreferences && (
                      <p>
                        <span className="text-text-faint">Partner preferences: </span>
                        <span className="text-text">{profile.partnerPreferences}</span>
                      </p>
                    )}
                    {profile.hobbies && (
                      <p>
                        <span className="text-text-faint">Hobbies: </span>
                        <span className="text-text">{profile.hobbies}</span>
                      </p>
                    )}
                  </div>
                </Section>
              )}
            </>
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

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-border pt-4 first:border-0 first:pt-0">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-text-faint">{title}</h4>
        {action}
      </div>
      {children}
    </section>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">{children}</dl>;
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-text-faint">{label}</dt>
      <dd className="text-sm text-text">{value || '—'}</dd>
    </div>
  );
}
