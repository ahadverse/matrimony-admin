import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { createUser } from '../api/admin';
import { apiErrorMessage } from '../api/client';
import type { AdminCreateUserPayload, Gender, UserStatus } from '../api/types';
import {
  FormField,
  PROFILE_DEFAULTS,
  PROFILE_SECTIONS,
  buildFormState,
  diff,
  specsFromSections,
  type FieldSpec,
  type FormState,
  type FormValue,
  type SectionSpec,
} from '../lib/userFormFields';

const ACCOUNT_FIELDS: FieldSpec[] = [
  {
    key: 'email',
    label: 'Email',
    type: 'text',
    placeholder: 'name@example.com',
    required: true,
  },
  {
    key: 'password',
    label: 'Password',
    type: 'password',
    placeholder: 'At least 8 characters',
    required: true,
  },
  { key: 'phone', label: 'Phone', type: 'text', placeholder: '+8801700000000' },
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
];

const ACCOUNT_DEFAULTS: Record<string, FormValue> = { status: 'active', languagePref: 'en' };
const ACCOUNT_SECTION: SectionSpec = { title: 'Account', fields: ACCOUNT_FIELDS };
const ACCOUNT_SPECS = specsFromSections([ACCOUNT_SECTION]);
const PROFILE_SPECS = specsFromSections(PROFILE_SECTIONS);

const SECTIONS: SectionSpec[] = [ACCOUNT_SECTION, ...PROFILE_SECTIONS];

export function AddUser() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userForm, setUserForm] = useState<FormState>(() =>
    buildFormState(ACCOUNT_SPECS, null, ACCOUNT_DEFAULTS),
  );
  const [profileForm, setProfileForm] = useState<FormState>(() =>
    buildFormState(PROFILE_SPECS, null, PROFILE_DEFAULTS),
  );
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (payload: AdminCreateUserPayload) => createUser(payload),
    onSuccess: (created) => {
      toast.success(`User created — ${created.profile?.name ?? created.user.email}`);
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'user-filter-options'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
      navigate('/users');
    },
    onError: (err) => setError(apiErrorMessage(err, 'Could not create this user.')),
  });

  function setField(scope: 'user' | 'profile', key: string, value: FormValue) {
    if (scope === 'user') setUserForm((prev) => ({ ...prev, [key]: value }));
    else setProfileForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    setError(null);

    const email = String(userForm.email).trim();
    const password = String(userForm.password);
    if (!email) {
      setError('An email is required to create an account.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    const payload: AdminCreateUserPayload = {
      email,
      password,
      status: userForm.status as UserStatus,
      languagePref: String(userForm.languagePref),
    };
    const phone = String(userForm.phone).trim();
    if (phone) payload.phone = phone;
    const gender = String(userForm.gender).trim();
    if (gender) payload.gender = gender as Gender;
    const dob = String(userForm.dob).trim();
    if (dob) payload.dob = dob;

    // Only worth attaching a profile once it carries a name — the server
    // requires one to create the row at all, matching the edit form's rule.
    const profileDefaults = buildFormState(PROFILE_SPECS, null, PROFILE_DEFAULTS);
    const profileChanges = diff(PROFILE_SPECS, profileForm, profileDefaults);
    if (String(profileForm.name).trim()) {
      payload.profile = profileChanges;
    } else if (Object.keys(profileChanges).length > 0) {
      setError('A name is required to also create a profile for this user.');
      return;
    }

    mutation.mutate(payload);
  }

  return (
    <div>
      <header className="mb-6">
        <button
          type="button"
          onClick={() => navigate('/users')}
          className="mb-2 text-sm font-medium text-text-muted hover:text-text"
        >
          ← Back to users
        </button>
        <h1 className="text-xl font-semibold text-text sm:text-2xl">Add user</h1>
        <p className="mt-1 text-sm text-text-faint">
          Create an account directly — optionally with a profile attached.
        </p>
      </header>

      <div className="space-y-5 rounded-xl border border-border bg-surface p-4 sm:p-6">
        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        {SECTIONS.map((section) => {
          const scope: 'user' | 'profile' = section.title === 'Account' ? 'user' : 'profile';
          const values = scope === 'user' ? userForm : profileForm;
          return (
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
                    value={values[spec.key]}
                    onChange={(next) => setField(scope, spec.key, next)}
                  />
                ))}
              </div>
            </section>
          );
        })}

        <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:enabled:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-2"
          >
            {mutation.isPending ? 'Creating…' : 'Create user'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/users')}
            disabled={mutation.isPending}
            className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-muted hover:enabled:bg-surface-raised hover:enabled:text-text disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:py-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
