import { useId, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { getUserDetail, updateUser } from '../api/admin';
import { apiErrorMessage } from '../api/client';
import type {
  AdminUpdateProfilePayload,
  AdminUpdateUserPayload,
  AdminUserDetail,
} from '../api/types';
import { Modal } from './Modal';
import { humanize } from './ProfileDetails';
import {
  BD_DIVISIONS,
  BLOOD_GROUPS,
  BODY_TYPES,
  COMPLEXIONS,
  DIETS,
  FAMILY_VALUES,
  FEATURED_COUNTRIES,
  MARITAL_STATUSES,
  PARENT_STATUSES,
  PROFESSIONAL_AREAS,
  PROFILE_CREATED_BY,
  QUALIFICATIONS,
  RELIGIONS,
  RELIGIOUS_VALUES,
  SMOKE_OPTIONS,
  WORKING_SECTORS,
  withCurrentValue,
} from '../lib/profileOptions';

type Scope = 'user' | 'profile';
type FormValue = string | boolean;
type FormState = Record<string, FormValue>;

interface FieldSpec {
  key: string;
  label: string;
  /**
   * `select` is a closed list — a database enum, where anything else is
   * rejected. `suggest` is a free-text input with a datalist, for the columns
   * whose vocabulary is only a shared convention between the clients; an admin
   * has to be able to type a value the list doesn't carry, because members
   * registered through older builds already have some.
   */
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'suggest' | 'checkbox';
  options?: readonly string[];
  optionLabels?: Record<string, string>;
  placeholder?: string;
  wide?: boolean;
  /** A NOT NULL column: the select offers no blank option and an empty text value blocks the save. */
  required?: boolean;
  min?: number;
  max?: number;
}

interface SectionSpec {
  title: string;
  scope: Scope;
  fields: FieldSpec[];
}

/**
 * Every column an admin may write, grouped the way `ProfileDetails` renders
 * them so the read view and the edit form stay recognisably the same screen.
 *
 * Deliberately absent: `publicId` (allocated once, and other members quote it),
 * `verifiedAt` / `approvedAt` / `approvedBy` (audit trail the server stamps),
 * `spotlightUntil` (bought with wallet balance), photos, and the wallet balance
 * itself — that one moves through "Add balance", which writes a transaction.
 */
const SECTIONS: SectionSpec[] = [
  {
    title: 'Account',
    scope: 'user',
    fields: [
      { key: 'phone', label: 'Phone', type: 'text', placeholder: '+8801700000000' },
      { key: 'email', label: 'Email', type: 'text', placeholder: 'name@example.com' },
      { key: 'gender', label: 'Gender', type: 'select', options: ['male', 'female'] },
      { key: 'dob', label: 'Date of birth', type: 'date' },
      {
        key: 'status',
        label: 'Account status',
        type: 'select',
        options: ['active', 'banned'],
        required: true,
      },
      {
        key: 'languagePref',
        label: 'Language',
        type: 'select',
        options: ['en', 'bn'],
        optionLabels: { en: 'English', bn: 'Bangla' },
        required: true,
      },
    ],
  },
  {
    title: 'Basics',
    scope: 'profile',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      {
        key: 'maritalStatus',
        label: 'Marital status',
        type: 'select',
        options: MARITAL_STATUSES,
        required: true,
      },
      { key: 'nationality', label: 'Nationality', type: 'text', placeholder: 'e.g. Bangladeshi' },
      { key: 'motherTongue', label: 'Mother tongue', type: 'text', placeholder: 'e.g. Bangla' },
      {
        key: 'englishComfort',
        label: 'English comfort',
        type: 'text',
        placeholder: 'e.g. Fluent, Basic',
      },
      {
        key: 'profileCreatedBy',
        label: 'Profile created by',
        type: 'select',
        options: PROFILE_CREATED_BY,
      },
      { key: 'relativeName', label: 'Relative / guardian', type: 'text' },
      { key: 'relativePhone', label: "Relative's phone", type: 'text' },
      { key: 'heightCm', label: 'Height (cm)', type: 'number', min: 120, max: 220 },
      { key: 'weightKg', label: 'Weight (kg)', type: 'number', min: 25, max: 250 },
      { key: 'bloodGroup', label: 'Blood group', type: 'select', options: BLOOD_GROUPS },
      { key: 'complexion', label: 'Complexion', type: 'select', options: COMPLEXIONS },
      { key: 'bodyType', label: 'Body type', type: 'suggest', options: BODY_TYPES },
      { key: 'physicalDetails', label: 'Physical details', type: 'textarea', wide: true },
    ],
  },
  {
    title: 'Location',
    scope: 'profile',
    fields: [
      { key: 'country', label: 'Country', type: 'suggest', options: FEATURED_COUNTRIES },
      { key: 'countryCode', label: 'Country code (ISO-2)', type: 'text', placeholder: 'BD' },
      { key: 'state', label: 'State / division', type: 'suggest', options: BD_DIVISIONS },
      { key: 'city', label: 'City', type: 'text' },
      { key: 'zip', label: 'ZIP / postcode', type: 'text' },
      { key: 'district', label: 'District', type: 'text' },
      { key: 'subDistrict', label: 'Sub-district / thana', type: 'text' },
      {
        key: 'residencyStatus',
        label: 'Residency status',
        type: 'text',
        placeholder: 'e.g. Local, Permanent Resident',
      },
      {
        key: 'growUpIn',
        label: 'Grew up in',
        type: 'text',
        placeholder: 'e.g. Dhaka, Bangladesh / London, UK',
      },
      { key: 'presentAddress', label: 'Present address', type: 'textarea', wide: true },
      { key: 'permanentAddress', label: 'Permanent address', type: 'textarea', wide: true },
    ],
  },
  {
    title: 'Education & career',
    scope: 'profile',
    fields: [
      { key: 'education', label: 'Qualification', type: 'suggest', options: QUALIFICATIONS },
      { key: 'collegeUniversity', label: 'College / university', type: 'text' },
      { key: 'profession', label: 'Profession', type: 'suggest', options: PROFESSIONAL_AREAS },
      { key: 'workingSector', label: 'Working sector', type: 'suggest', options: WORKING_SECTORS },
      { key: 'companyName', label: 'Company', type: 'text' },
      {
        key: 'monthlyIncome',
        label: 'Monthly income (৳)',
        type: 'number',
        min: 0,
        max: 10_000_000,
      },
      { key: 'incomeIsPrivate', label: 'Keep income private', type: 'checkbox' },
      { key: 'educationDetails', label: 'Education details', type: 'textarea', wide: true },
      { key: 'professionDetails', label: 'Profession details', type: 'textarea', wide: true },
    ],
  },
  {
    title: 'Family',
    scope: 'profile',
    fields: [
      { key: 'fatherStatus', label: 'Father', type: 'select', options: PARENT_STATUSES },
      { key: 'fatherOccupation', label: "Father's occupation", type: 'text' },
      { key: 'motherStatus', label: 'Mother', type: 'select', options: PARENT_STATUSES },
      { key: 'motherOccupation', label: "Mother's occupation", type: 'text' },
      { key: 'siblingsCount', label: 'Siblings', type: 'number', min: 0, max: 20 },
      { key: 'numberOfBrothers', label: 'Brothers', type: 'number', min: 0, max: 20 },
      { key: 'numberOfSisters', label: 'Sisters', type: 'number', min: 0, max: 20 },
      { key: 'brothersMarried', label: 'Brothers married', type: 'number', min: 0, max: 20 },
      { key: 'brothersUnmarried', label: 'Brothers unmarried', type: 'number', min: 0, max: 20 },
      { key: 'sistersMarried', label: 'Sisters married', type: 'number', min: 0, max: 20 },
      { key: 'sistersUnmarried', label: 'Sisters unmarried', type: 'number', min: 0, max: 20 },
      {
        key: 'familyFinancialStatus',
        label: 'Family financial status',
        type: 'text',
        placeholder: 'e.g. Middle class',
      },
      { key: 'familyValues', label: 'Family values', type: 'select', options: FAMILY_VALUES },
      { key: 'familyDetails', label: 'Family details', type: 'textarea', wide: true },
    ],
  },
  {
    title: 'Lifestyle & beliefs',
    scope: 'profile',
    fields: [
      { key: 'religion', label: 'Religion', type: 'suggest', options: RELIGIONS },
      {
        key: 'religiousValue',
        label: 'Religious value',
        type: 'suggest',
        options: RELIGIOUS_VALUES,
      },
      { key: 'diet', label: 'Diet', type: 'select', options: DIETS },
      { key: 'smoke', label: 'Smoking', type: 'select', options: SMOKE_OPTIONS },
      { key: 'hobbies', label: 'Hobbies', type: 'textarea', wide: true },
    ],
  },
  {
    title: 'About & preferences',
    scope: 'profile',
    fields: [
      { key: 'bio', label: 'Bio', type: 'textarea', wide: true },
      { key: 'partnerPreferences', label: 'Partner preferences', type: 'textarea', wide: true },
    ],
  },
  {
    title: 'Moderation',
    scope: 'profile',
    fields: [
      {
        key: 'approvalStatus',
        label: 'Approval status',
        type: 'select',
        options: ['pending', 'approved', 'rejected'],
        required: true,
      },
      { key: 'isVerified', label: 'Verified profile', type: 'checkbox' },
      { key: 'rejectionReason', label: 'Rejection reason', type: 'textarea', wide: true },
    ],
  },
];

function specsFor(scope: Scope): Map<string, FieldSpec> {
  return new Map(
    SECTIONS.filter((section) => section.scope === scope).flatMap((section) =>
      section.fields.map((field): [string, FieldSpec] => [field.key, field]),
    ),
  );
}

const SPECS_BY_SCOPE: Record<Scope, Map<string, FieldSpec>> = {
  user: specsFor('user'),
  profile: specsFor('profile'),
};

/** Column defaults for a user who has no profile row yet — matching the entity's own defaults, so an untouched form reports no changes. */
const PROFILE_DEFAULTS: Record<string, FormValue> = {
  maritalStatus: 'single',
  approvalStatus: 'pending',
  isVerified: false,
  incomeIsPrivate: false,
};

function toFormValue(spec: FieldSpec, raw: unknown): FormValue {
  if (spec.type === 'checkbox') return raw === true;
  if (raw === null || raw === undefined) return '';
  // `dob` and the timestamps arrive as full ISO strings; <input type="date"> only accepts YYYY-MM-DD.
  if (spec.type === 'date') return String(raw).slice(0, 10);
  return String(raw);
}

function buildFormState(scope: Scope, source: Record<string, unknown> | null): FormState {
  const state: FormState = {};
  for (const [key, spec] of SPECS_BY_SCOPE[scope]) {
    state[key] = source
      ? toFormValue(spec, source[key])
      : (PROFILE_DEFAULTS[key] ?? (spec.type === 'checkbox' ? false : ''));
  }
  return state;
}

/** Empties a nullable column with `null` rather than `''` — the unique indexes on phone and email treat an empty string as a real value a second account would then collide with. */
function toPayloadValue(spec: FieldSpec, value: FormValue): unknown {
  if (spec.type === 'checkbox') return value === true;
  const text = String(value).trim();
  if (text === '') return null;
  return spec.type === 'number' ? Number(text) : text;
}

function diff(scope: Scope, current: FormState, initial: FormState): Record<string, unknown> {
  const changes: Record<string, unknown> = {};
  for (const [key, spec] of SPECS_BY_SCOPE[scope]) {
    if (current[key] === initial[key]) continue;
    changes[key] = toPayloadValue(spec, current[key]);
  }
  return changes;
}

interface UserEditModalProps {
  userId: string;
  onClose: () => void;
  /** Fired after a successful save, so the caller can reopen the read view on the fresh record. */
  onSaved?: (detail: AdminUserDetail) => void;
}

export function UserEditModal({ userId, onClose, onSaved }: UserEditModalProps) {
  const queryClient = useQueryClient();
  const [userForm, setUserForm] = useState<FormState | null>(null);
  const [profileForm, setProfileForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['admin', 'user-detail', userId],
    queryFn: () => getUserDetail(userId),
    // A background refetch would move the baseline the save diffs against
    // while the admin is still typing, so half-finished edits could be read as
    // "unchanged" and silently dropped.
    refetchOnWindowFocus: false,
  });

  const detail = query.data;

  // Snapshots of what the server returned, so the save sends only what changed —
  // a PATCH that echoed every column back would stamp `approvedBy` on profiles
  // the admin never actually moderated.
  const initial = useMemo(() => {
    if (!detail) return null;
    return {
      user: buildFormState('user', detail.user as unknown as Record<string, unknown>),
      profile: buildFormState(
        'profile',
        detail.profile as unknown as Record<string, unknown> | null,
      ),
    };
  }, [detail]);

  const values = useMemo(
    () =>
      initial
        ? { user: userForm ?? initial.user, profile: profileForm ?? initial.profile }
        : null,
    [initial, userForm, profileForm],
  );

  const mutation = useMutation({
    mutationFn: (payload: AdminUpdateUserPayload) => updateUser(userId, payload),
    onSuccess: (saved) => {
      toast.success('User updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'user-detail'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'user-filter-options'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      onSaved?.(saved);
      onClose();
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not save this user.')),
  });

  function setField(scope: Scope, key: string, value: FormValue) {
    if (!values) return;
    const next = { ...values[scope], [key]: value };
    if (scope === 'user') setUserForm(next);
    else setProfileForm(next);
  }

  function handleSubmit() {
    if (!values || !initial) return;
    setError(null);

    const account = diff('user', values.user, initial.user);
    const profileChanges = diff('profile', values.profile, initial.profile);

    if (Object.keys(account).length === 0 && Object.keys(profileChanges).length === 0) {
      setError('Nothing has changed yet.');
      return;
    }
    // A profile row cannot exist without a name, so a first-time profile has to
    // carry one and an existing one cannot have it cleared.
    if (Object.keys(profileChanges).length > 0 && !String(values.profile.name).trim()) {
      setError('A name is required to save this profile.');
      return;
    }

    const payload: AdminUpdateUserPayload = { ...account };
    if (Object.keys(profileChanges).length > 0) {
      payload.profile = profileChanges as AdminUpdateProfilePayload;
    }
    mutation.mutate(payload);
  }

  return (
    <Modal
      title={
        detail?.profile?.name
          ? `Edit — ${detail.profile.name}`
          : detail
            ? `Edit — ${detail.user.phone ?? detail.user.email ?? 'user'}`
            : 'Edit user'
      }
      onClose={onClose}
      maxWidthClassName="max-w-4xl"
      footer={
        values ? (
          <>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-muted hover:bg-surface hover:text-text sm:py-2"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={mutation.isPending}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:enabled:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60 sm:py-2"
            >
              {mutation.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </>
        ) : undefined
      }
    >
      {query.isLoading ? (
        <p className="py-10 text-center text-sm text-text-faint">Loading user…</p>
      ) : query.isError || !values || !detail ? (
        <p className="py-10 text-center text-sm text-danger">Failed to load this user.</p>
      ) : (
        <div className="space-y-5">
          {error && (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          {!detail.profile && (
            <p className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-muted">
              This user has no profile yet. Filling in a name creates one; leaving the profile
              fields untouched saves only the account.
            </p>
          )}

          {SECTIONS.map((section) => (
            <section
              key={section.title}
              className="border-t border-border pt-4 first:border-0 first:pt-0"
            >
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-faint">
                {section.title}
              </h4>
              <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                {section.fields.map((spec) => (
                  <FormField
                    key={spec.key}
                    spec={spec}
                    value={values[section.scope][spec.key]}
                    onChange={(next) => setField(section.scope, spec.key, next)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </Modal>
  );
}

const INPUT_CLASS =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

function FormField({
  spec,
  value,
  onChange,
}: {
  spec: FieldSpec;
  value: FormValue;
  onChange: (value: FormValue) => void;
}) {
  const id = useId();
  const text = typeof value === 'string' ? value : '';

  if (spec.type === 'checkbox') {
    return (
      <label
        htmlFor={id}
        className="flex items-center gap-2 self-end py-2 text-sm text-text-muted"
      >
        <input
          id={id}
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-border accent-primary"
        />
        {spec.label}
      </label>
    );
  }

  return (
    <div className={clsx(spec.wide && 'col-span-1 sm:col-span-2 lg:col-span-3')}>
      <label htmlFor={id} className="mb-1 block text-xs text-text-faint">
        {spec.label}
      </label>

      {spec.type === 'select' ? (
        <select
          id={id}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className={INPUT_CLASS}
        >
          {!spec.required && <option value="">—</option>}
          {withCurrentValue(spec.options ?? [], text).map((option) => (
            <option key={option} value={option}>
              {spec.optionLabels?.[option] ?? humanize(option) ?? option}
            </option>
          ))}
        </select>
      ) : spec.type === 'textarea' ? (
        <textarea
          id={id}
          rows={3}
          value={text}
          placeholder={spec.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={clsx(INPUT_CLASS, 'resize-y')}
        />
      ) : (
        <>
          <input
            id={id}
            type={spec.type === 'number' ? 'number' : spec.type === 'date' ? 'date' : 'text'}
            value={text}
            min={spec.min}
            max={spec.max}
            placeholder={spec.placeholder}
            list={spec.type === 'suggest' ? `${id}-options` : undefined}
            onChange={(e) => onChange(e.target.value)}
            className={INPUT_CLASS}
          />
          {spec.type === 'suggest' && (
            <datalist id={`${id}-options`}>
              {(spec.options ?? []).map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          )}
        </>
      )}
    </div>
  );
}
