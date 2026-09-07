/**
 * The vocabularies the admin edit form offers, mirroring
 * `frontend-v3/src/lib/profileOptions.ts`.
 *
 * They have to stay in step with that file: a member registered with
 * "Bachelors" and an admin who saves "Bachelor's" produce two values that no
 * filter can match at once. Only the enum lists are enforced server-side —
 * education, working sector, religion and the rest are free-text columns, so
 * these are offered as datalist suggestions rather than as closed dropdowns,
 * which is also what lets an admin correct a value typed by an older client.
 */

export const QUALIFICATIONS = [
  'SSC',
  'HSC / A-Level',
  'Diploma',
  'Undergraduate',
  'Bachelors',
  'Masters',
  'MBBS / BDS',
  'FCPS / MD',
  'Doctorate / PhD / MPhil',
  'Professional Degree',
  'Others',
] as const;

export const WORKING_SECTORS = [
  'Private Company',
  'Government / Public Sector',
  'Defense / Civil Services',
  'Business / Self Employed',
  'Not Working',
] as const;

export const PROFESSIONAL_AREAS = [
  'Accounting & Banking',
  'Administration & HR',
  'Advertising & Media',
  'Agriculture',
  'Airline & Aviation',
  'Architecture & Design',
  'Artists & Animators',
  'Beauty & Fashion',
  'Defense',
  'Education & Training',
  'Engineering',
  'IT & Software Engineering',
  'Legal',
  'Medical & Healthcare',
  'Sales & Marketing',
  'Business & Others',
  'Student',
  'Not Working',
] as const;

export const RELIGIONS = ['Islam', 'Hinduism', 'Christianity', 'Buddhism', 'Others'] as const;

export const RELIGIOUS_VALUES = ['Very religious', 'Average religious', 'Not religious'] as const;

export const BODY_TYPES = ['Average', 'Slim', 'Athletic', 'Heavy'] as const;

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export const MARITAL_STATUSES = ['single', 'divorced', 'widowed'] as const;

export const PROFILE_CREATED_BY = ['self', 'parents', 'brother', 'sister', 'relative'] as const;

/**
 * Only the four the registration wizard offers. `medium` is a legacy value the
 * backfill remaps, so it is absent here — but a row that still carries it is
 * added back at render time (see `withCurrentValue`) rather than being silently
 * replaced when an admin saves an unrelated field.
 */
export const COMPLEXIONS = ['very_fair', 'fair', 'wheatish', 'dark'] as const;

export const PARENT_STATUSES = ['alive', 'deceased'] as const;
export const FAMILY_VALUES = ['traditional', 'moderate', 'liberal'] as const;
export const DIETS = ['vegetarian', 'non_vegetarian', 'not_matter'] as const;
export const SMOKE_OPTIONS = ['non_smoker', 'smoker', 'light_social'] as const;

export const BD_DIVISIONS = [
  'Barishal',
  'Chattogram',
  'Dhaka',
  'Khulna',
  'Mymensingh',
  'Rajshahi',
  'Rangpur',
  'Sylhet',
] as const;

export const FEATURED_COUNTRIES = [
  'Bangladesh',
  'India',
  'Pakistan',
  'United Kingdom',
  'United States',
  'Canada',
  'Australia',
  'United Arab Emirates',
  'Saudi Arabia',
  'Malaysia',
  'Singapore',
  'Qatar',
] as const;

/**
 * Adds the value a profile already holds to a dropdown that doesn't list it.
 *
 * Enum columns have gained and lost members over time (`medium` complexion is
 * the standing example), and a `<select>` whose current value is absent renders
 * as blank — so saving any other field on that profile would quietly clear a
 * column the admin never touched.
 */
export function withCurrentValue(
  options: readonly string[],
  current: string | null | undefined,
): string[] {
  if (!current || options.includes(current)) return [...options];
  return [current, ...options];
}
