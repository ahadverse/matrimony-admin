import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getUserDetail, updateUser } from '../api/admin';
import { apiErrorMessage } from '../api/client';
import type {
  AdminUpdateProfilePayload,
  AdminUpdateUserPayload,
  AdminUserDetail,
} from '../api/types';
import { Modal } from './Modal';
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
];

const SECTIONS: SectionSpec[] = [{ title: 'Account', fields: ACCOUNT_FIELDS }, ...PROFILE_SECTIONS];

const ACCOUNT_SPECS = specsFromSections([{ title: 'Account', fields: ACCOUNT_FIELDS }]);
const PROFILE_SPECS = specsFromSections(PROFILE_SECTIONS);

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
      user: buildFormState(ACCOUNT_SPECS, detail.user as unknown as Record<string, unknown>),
      profile: buildFormState(
        PROFILE_SPECS,
        detail.profile as unknown as Record<string, unknown> | null,
        PROFILE_DEFAULTS,
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

  function setField(scope: 'user' | 'profile', key: string, value: FormValue) {
    if (!values) return;
    const next = { ...values[scope], [key]: value };
    if (scope === 'user') setUserForm(next);
    else setProfileForm(next);
  }

  function handleSubmit() {
    if (!values || !initial) return;
    setError(null);

    const account = diff(ACCOUNT_SPECS, values.user, initial.user);
    const profileChanges = diff(PROFILE_SPECS, values.profile, initial.profile);

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

          {SECTIONS.map((section) => {
            const scope: 'user' | 'profile' = section.title === 'Account' ? 'user' : 'profile';
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
                      value={values[scope][spec.key]}
                      onChange={(next) => setField(scope, spec.key, next)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
