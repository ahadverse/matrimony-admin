import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { addUserPhoto, createUser } from '../api/admin';
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

/** Matches `MAX_PHOTOS` in the backend's `ProfilesService` — the avatar counts as one of the six. */
const MAX_PHOTOS = 6;

function LocalImagePreview({ file, className }: { file: File; className?: string }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return <img src={url} alt="" className={className} />;
}

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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const gallerySlots = MAX_PHOTOS - (avatarFile ? 1 : 0);

  const mutation = useMutation({
    mutationFn: async ({
      payload,
      avatar,
      gallery,
    }: {
      payload: AdminCreateUserPayload;
      avatar: File | null;
      gallery: File[];
    }) => {
      const created = await createUser(payload);
      const userId = created.user.id;
      // Uploaded first so it lands as the profile's primary photo — `addPhoto`
      // marks whichever photo arrives when the profile has none yet as primary.
      let photoFailures = 0;
      if (avatar) {
        try {
          await addUserPhoto(userId, avatar);
        } catch {
          photoFailures += 1;
        }
      }
      for (const file of gallery) {
        try {
          await addUserPhoto(userId, file);
        } catch {
          photoFailures += 1;
        }
      }
      return { created, photoFailures };
    },
    onSuccess: ({ created, photoFailures }) => {
      if (photoFailures > 0) {
        toast.error(
          `User created, but ${photoFailures} photo${photoFailures === 1 ? '' : 's'} failed to upload.`,
        );
      } else {
        toast.success(`User created — ${created.profile?.name ?? created.user.email}`);
      }
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
    const hasName = Boolean(String(profileForm.name).trim());
    if (hasName) {
      payload.profile = profileChanges;
    } else if (Object.keys(profileChanges).length > 0) {
      setError('A name is required to also create a profile for this user.');
      return;
    }

    const wantsPhotos = avatarFile !== null || galleryFiles.length > 0;
    if (wantsPhotos && !hasName) {
      setError('A name is required to attach photos to this profile.');
      return;
    }

    mutation.mutate({ payload, avatar: avatarFile, gallery: galleryFiles });
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

        <section className="border-t border-border pt-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-faint">
            Photos
          </h4>
          <p className="mb-3 text-xs text-text-faint">
            Optional — up to {MAX_PHOTOS} photos total. The avatar is uploaded first and becomes
            the primary photo. Requires a name above to attach.
          </p>
          <div className="flex flex-wrap items-start gap-4">
            <div>
              <span className="mb-1 block text-xs text-text-faint">Avatar</span>
              {avatarFile ? (
                <div className="relative h-24 w-24 overflow-hidden rounded-lg bg-surface-raised">
                  <LocalImagePreview file={avatarFile} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setAvatarFile(null)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-xs leading-none text-white hover:bg-black/80"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border text-xs text-text-faint hover:border-primary hover:text-primary">
                  + Add
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setAvatarFile(file);
                      // Adding an avatar shrinks the gallery's own budget — trim
                      // anything already picked that would now overflow the total.
                      if (file) setGalleryFiles((prev) => prev.slice(0, MAX_PHOTOS - 1));
                    }}
                  />
                </label>
              )}
            </div>

            <div className="flex-1">
              <span className="mb-1 block text-xs text-text-faint">
                Gallery ({galleryFiles.length}/{gallerySlots})
              </span>
              <div className="flex flex-wrap gap-2">
                {galleryFiles.map((file, i) => (
                  <div
                    key={i}
                    className="relative h-20 w-20 overflow-hidden rounded-lg bg-surface-raised"
                  >
                    <LocalImagePreview file={file} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setGalleryFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-xs leading-none text-white hover:bg-black/80"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {galleryFiles.length < gallerySlots && (
                  <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border text-xs text-text-faint hover:border-primary hover:text-primary">
                    + Add
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        setGalleryFiles((prev) => [...prev, ...files].slice(0, gallerySlots));
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </section>

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
