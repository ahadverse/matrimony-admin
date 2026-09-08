import { useId } from 'react';
import clsx from 'clsx';
import { humanize } from '../components/ProfileDetails';
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
} from './profileOptions';

export type FormValue = string | boolean;
export type FormState = Record<string, FormValue>;

export interface FieldSpec {
  key: string;
  label: string;
  /**
   * `select` is a closed list — a database enum, where anything else is
   * rejected. `suggest` is a free-text input with a datalist, for the columns
   * whose vocabulary is only a shared convention between the clients; an admin
   * has to be able to type a value the list doesn't carry, because members
   * registered through older builds already have some.
   */
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'suggest' | 'checkbox' | 'password';
  options?: readonly string[];
  optionLabels?: Record<string, string>;
  placeholder?: string;
  wide?: boolean;
  /** A NOT NULL column, or a value the server otherwise requires: the select offers no blank option and an empty text value blocks the save. */
  required?: boolean;
  min?: number;
  max?: number;
}

export interface SectionSpec {
  title: string;
  fields: FieldSpec[];
}

/**
 * Every profile column an admin may write, grouped the way `ProfileDetails`
 * renders them so the read view and the edit form stay recognisably the same
 * screen. Shared between the edit modal and the add-user page — only the
 * account-level fields differ between those two (a new account also needs a
 * password, and its email is mandatory).
 *
 * Deliberately absent: `publicId` (allocated once, and other members quote it),
 * `verifiedAt` / `approvedAt` / `approvedBy` (audit trail the server stamps),
 * `spotlightUntil` (bought with wallet balance), photos, and the wallet balance
 * itself — that one moves through "Add balance", which writes a transaction.
 */
export const PROFILE_SECTIONS: SectionSpec[] = [
  {
    title: 'Basics',
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
    fields: [
      { key: 'bio', label: 'Bio', type: 'textarea', wide: true },
      { key: 'partnerPreferences', label: 'Partner preferences', type: 'textarea', wide: true },
    ],
  },
  {
    title: 'Moderation',
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

/** Column defaults for a user who has no profile row yet — matching the entity's own defaults, so an untouched form reports no changes. */
export const PROFILE_DEFAULTS: Record<string, FormValue> = {
  maritalStatus: 'single',
  approvalStatus: 'pending',
  isVerified: false,
  incomeIsPrivate: false,
};

export function specsFromSections(sections: SectionSpec[]): Map<string, FieldSpec> {
  return new Map(
    sections.flatMap((section) => section.fields.map((field): [string, FieldSpec] => [field.key, field])),
  );
}

export function toFormValue(spec: FieldSpec, raw: unknown): FormValue {
  if (spec.type === 'checkbox') return raw === true;
  if (raw === null || raw === undefined) return '';
  // `dob` and the timestamps arrive as full ISO strings; <input type="date"> only accepts YYYY-MM-DD.
  if (spec.type === 'date') return String(raw).slice(0, 10);
  return String(raw);
}

export function buildFormState(
  specs: Map<string, FieldSpec>,
  source: Record<string, unknown> | null,
  defaults: Record<string, FormValue> = {},
): FormState {
  const state: FormState = {};
  for (const [key, spec] of specs) {
    state[key] = source
      ? toFormValue(spec, source[key])
      : (defaults[key] ?? (spec.type === 'checkbox' ? false : ''));
  }
  return state;
}

/** Empties a nullable column with `null` rather than `''` — the unique indexes on phone and email treat an empty string as a real value a second account would then collide with. */
export function toPayloadValue(spec: FieldSpec, value: FormValue): unknown {
  if (spec.type === 'checkbox') return value === true;
  const text = String(value).trim();
  if (text === '') return null;
  return spec.type === 'number' ? Number(text) : text;
}

export function diff(
  specs: Map<string, FieldSpec>,
  current: FormState,
  initial: FormState,
): Record<string, unknown> {
  const changes: Record<string, unknown> = {};
  for (const [key, spec] of specs) {
    if (current[key] === initial[key]) continue;
    changes[key] = toPayloadValue(spec, current[key]);
  }
  return changes;
}

export const FORM_INPUT_CLASS =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

export function FormField({
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
        {spec.required && <span className="text-danger"> *</span>}
      </label>

      {spec.type === 'select' ? (
        <select
          id={id}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          className={FORM_INPUT_CLASS}
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
          className={clsx(FORM_INPUT_CLASS, 'resize-y')}
        />
      ) : (
        <>
          <input
            id={id}
            type={
              spec.type === 'number'
                ? 'number'
                : spec.type === 'date'
                  ? 'date'
                  : spec.type === 'password'
                    ? 'password'
                    : 'text'
            }
            value={text}
            min={spec.min}
            max={spec.max}
            placeholder={spec.placeholder}
            autoComplete={spec.type === 'password' ? 'new-password' : undefined}
            list={spec.type === 'suggest' ? `${id}-options` : undefined}
            onChange={(e) => onChange(e.target.value)}
            className={FORM_INPUT_CLASS}
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
