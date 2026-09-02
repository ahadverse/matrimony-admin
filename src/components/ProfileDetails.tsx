import type { ReactNode } from 'react';
import type { Profile } from '../api/types';

const TAKA = new Intl.NumberFormat('en-BD');

/** Every profile column except the relations — what both the pending list and the user detail modal render. */
export type ProfileFields = Omit<Profile, 'user' | 'photos'>;

export function formatDetailDate(
  value: string | null | undefined,
  withTime = false,
): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  });
}

export function calculateAge(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  return Math.floor((Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

export function formatHeight(cm: number | null | undefined): string | null {
  if (cm == null) return null;
  const totalInches = Math.round(cm / 2.54);
  return `${Math.floor(totalInches / 12)} feet ${totalInches % 12} inch (${cm} cm)`;
}

/** Enum columns come back as `non_vegetarian` / `very_fair` — show them the way a human reads them. */
export function humanize(value: string | null | undefined): string | null {
  if (!value) return null;
  const spaced = value.replace(/_/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function formatMoney(amount: number | null | undefined): string | null {
  if (amount == null) return null;
  return `৳${TAKA.format(amount)}`;
}

function joinParts(parts: (string | null | undefined)[]): string | null {
  const filtered = parts.filter(Boolean);
  return filtered.length > 0 ? filtered.join(', ') : null;
}

export function Section({
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

export function Grid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">{children}</dl>;
}

export function Field({
  label,
  value,
  wide,
}: {
  label: string;
  value: string | number | null | undefined;
  wide?: boolean;
}) {
  return (
    <div className={wide ? 'col-span-2 sm:col-span-3' : undefined}>
      <dt className="text-xs text-text-faint">{label}</dt>
      <dd className="whitespace-pre-wrap break-words text-sm text-text">
        {value === null || value === undefined || value === '' ? '—' : value}
      </dd>
    </div>
  );
}

/**
 * Renders every stored profile column, grouped. Used by the approvals list (inline,
 * expanded) and the user detail modal so both stay in sync as columns are added.
 */
export function ProfileDetails({ profile }: { profile: ProfileFields }) {
  return (
    <>
      <Section title="Basics">
        <Grid>
          <Field label="Profile ID" value={profile.publicId} />
          <Field label="Name" value={profile.name} />
          <Field label="Marital status" value={humanize(profile.maritalStatus)} />
          <Field label="Nationality" value={profile.nationality} />
          <Field label="Mother tongue" value={profile.motherTongue} />
          <Field label="English comfort" value={humanize(profile.englishComfort)} />
          <Field label="Profile created by" value={humanize(profile.profileCreatedBy)} />
          <Field label="Relative / guardian" value={profile.relativeName} />
          <Field label="Relative's phone" value={profile.relativePhone} />
          <Field label="Height" value={formatHeight(profile.heightCm)} />
          <Field label="Weight" value={profile.weightKg != null ? `${profile.weightKg} kg` : null} />
          <Field label="Blood group" value={profile.bloodGroup} />
          <Field label="Complexion" value={humanize(profile.complexion)} />
          <Field label="Body type" value={humanize(profile.bodyType)} />
          <Field label="Physical details" value={profile.physicalDetails} wide />
        </Grid>
      </Section>

      <Section title="Location">
        <Grid>
          <Field label="Country" value={joinParts([profile.country, profile.countryCode])} />
          <Field label="State / division" value={profile.state} />
          <Field label="City" value={profile.city} />
          <Field label="ZIP / postcode" value={profile.zip} />
          <Field label="District" value={profile.district} />
          <Field label="Sub-district" value={profile.subDistrict} />
          <Field label="Residency status" value={humanize(profile.residencyStatus)} />
          <Field label="Grew up in" value={profile.growUpIn} />
          <Field label="Present address" value={profile.presentAddress} wide />
          <Field label="Permanent address" value={profile.permanentAddress} wide />
        </Grid>
      </Section>

      <Section title="Education & career">
        <Grid>
          <Field label="Education" value={profile.education} />
          <Field label="College / university" value={profile.collegeUniversity} />
          <Field label="Profession" value={profile.profession} />
          <Field label="Working sector" value={humanize(profile.workingSector)} />
          <Field label="Company" value={profile.companyName} />
          <Field
            label="Monthly income"
            value={
              profile.monthlyIncome != null
                ? `${formatMoney(profile.monthlyIncome)}${profile.incomeIsPrivate ? ' (private)' : ''}`
                : profile.incomeIsPrivate
                  ? 'Kept private'
                  : null
            }
          />
          <Field label="Education details" value={profile.educationDetails} wide />
          <Field label="Profession details" value={profile.professionDetails} wide />
        </Grid>
      </Section>

      <Section title="Family">
        <Grid>
          <Field label="Father" value={humanize(profile.fatherStatus)} />
          <Field label="Father's occupation" value={profile.fatherOccupation} />
          <Field label="Mother" value={humanize(profile.motherStatus)} />
          <Field label="Mother's occupation" value={profile.motherOccupation} />
          <Field label="Siblings" value={profile.siblingsCount} />
          <Field label="Brothers" value={profile.numberOfBrothers} />
          <Field label="Sisters" value={profile.numberOfSisters} />
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
          <Field label="Family financial status" value={humanize(profile.familyFinancialStatus)} />
          <Field label="Family values" value={humanize(profile.familyValues)} />
          <Field label="Family details" value={profile.familyDetails} wide />
        </Grid>
      </Section>

      <Section title="Lifestyle & beliefs">
        <Grid>
          <Field label="Religion" value={humanize(profile.religion)} />
          <Field label="Religious value" value={humanize(profile.religiousValue)} />
          <Field label="Diet" value={humanize(profile.diet)} />
          <Field label="Smoking" value={humanize(profile.smoke)} />
          <Field label="Hobbies" value={profile.hobbies} wide />
        </Grid>
      </Section>

      <Section title="About & preferences">
        <Grid>
          <Field label="Bio" value={profile.bio} wide />
          <Field label="Partner preferences" value={profile.partnerPreferences} wide />
        </Grid>
      </Section>

      <Section title="Status">
        <Grid>
          <Field label="Approval status" value={humanize(profile.approvalStatus)} />
          <Field label="Verified" value={profile.isVerified ? 'Yes' : 'No'} />
          <Field label="Verified at" value={formatDetailDate(profile.verifiedAt, true)} />
          <Field label="Spotlight until" value={formatDetailDate(profile.spotlightUntil, true)} />
          <Field label="Profile created" value={formatDetailDate(profile.createdAt, true)} />
          <Field label="Last updated" value={formatDetailDate(profile.updatedAt, true)} />
          <Field label="Rejection reason" value={profile.rejectionReason} wide />
        </Grid>
      </Section>
    </>
  );
}
