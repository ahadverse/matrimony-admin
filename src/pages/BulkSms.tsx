import { useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getSmsStatus, getUserFilterOptions, previewBulkSms, sendBulkSms } from '../api/admin';
import { apiErrorMessage } from '../api/client';
import type {
  BulkSmsAudience,
  BulkSmsAudienceMode,
  BulkSmsFilters,
  BulkSmsPreview,
} from '../api/types';

const MESSAGE_MAX_LENGTH = 918;

/**
 * A GSM-7 segment is 160 characters, or 153 each once a message is long enough
 * to be split. Gateways bill per segment, so this is the number that decides
 * what a campaign costs — shown next to the character count because the two
 * diverge the moment anyone types a Bangla character.
 */
function segmentCount(message: string): { segments: number; unicode: boolean } {
  // Any non-ASCII character — a Bangla letter, a curly quote pasted out of
  // Word — forces the whole message into UCS-2, halving what fits in a segment.
  const unicode = [...message].some((char) => (char.codePointAt(0) ?? 0) > 127);
  const single = unicode ? 70 : 160;
  const multi = unicode ? 67 : 153;
  if (message.length === 0) return { segments: 0, unicode };
  if (message.length <= single) return { segments: 1, unicode };
  return { segments: Math.ceil(message.length / multi), unicode };
}

/** Pulls phone numbers out of pasted text or a CSV — one per line, comma or semicolon separated, quotes and headers tolerated. */
function parsePhoneList(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((entry) => entry.replace(/["']/g, '').trim())
    .filter((entry) => /\d/.test(entry));
}

export function BulkSms() {
  const [mode, setMode] = useState<BulkSmsAudienceMode>('filter');
  const [filters, setFilters] = useState<BulkSmsFilters>({});
  const [phoneText, setPhoneText] = useState('');
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<BulkSmsPreview | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const statusQuery = useQuery({ queryKey: ['admin', 'sms-status'], queryFn: getSmsStatus });
  // Districts come from the data rather than a hard-coded list, so the dropdown
  // can only offer places members actually live in.
  const filterOptionsQuery = useQuery({
    queryKey: ['admin', 'user-filter-options', ''],
    queryFn: () => getUserFilterOptions(),
  });
  const districts = filterOptionsQuery.data?.districts ?? [];
  const smsEnabled = statusQuery.data?.enabled ?? true;

  const phones = useMemo(() => parsePhoneList(phoneText), [phoneText]);
  const { segments, unicode } = segmentCount(message);

  function buildAudience(): BulkSmsAudience {
    return mode === 'filter' ? { mode, filters } : { mode, phones };
  }

  // Any edit invalidates a count that was resolved for the previous audience —
  // sending against a stale number is exactly the mistake this screen exists to
  // prevent.
  function changeAudience(apply: () => void) {
    setPreview(null);
    apply();
  }

  const previewMutation = useMutation({
    mutationFn: previewBulkSms,
    onSuccess: (data) => {
      setPreview(data);
      if (data.total === 0) toast.error('That audience matches nobody');
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Could not resolve the audience')),
  });

  const sendMutation = useMutation({
    mutationFn: sendBulkSms,
    onSuccess: (data) => {
      toast.success(
        data.failed > 0
          ? `Sent ${data.sent} of ${data.total} — ${data.failed} failed, see SMS logs`
          : `Sent to ${data.sent} recipient${data.sent === 1 ? '' : 's'}`,
      );
      setPreview(null);
      setMessage('');
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Campaign failed')),
  });

  function handleCsv(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parsePhoneList(String(reader.result ?? ''));
      changeAudience(() => setPhoneText(parsed.join('\n')));
      toast.success(`Loaded ${parsed.length} number${parsed.length === 1 ? '' : 's'} from ${file.name}`);
    };
    reader.onerror = () => toast.error('Could not read that file');
    // Parsed here rather than uploaded: the API never needs the file itself,
    // and this way the admin can see and edit the numbers before sending.
    reader.readAsText(file);
    if (fileInput.current) fileInput.current.value = '';
  }

  function handlePreview() {
    if (mode === 'list' && phones.length === 0) {
      toast.error('Add at least one phone number');
      return;
    }
    previewMutation.mutate({ audience: buildAudience() });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      toast.error('Write the campaign message');
      return;
    }
    if (!preview) {
      toast.error('Check the audience first');
      return;
    }
    if (preview.total === 0) {
      toast.error('That audience matches nobody');
      return;
    }
    const confirmed = window.confirm(
      `Send this message to ${preview.total} recipient${preview.total === 1 ? '' : 's'}?\n\n` +
        `That is about ${preview.total * segments} SMS segment${
          preview.total * segments === 1 ? '' : 's'
        } of billing. This cannot be undone.`,
    );
    if (!confirmed) return;

    sendMutation.mutate({ audience: buildAudience(), message: message.trim() });
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-text sm:text-2xl">Marketing SMS</h1>
        <p className="mt-1 text-sm text-text-faint">
          Send one message to many members. Interest and message notifications go out automatically —
          configure those under Settings.
        </p>
      </header>

      {!smsEnabled && (
        <div className="mb-4 max-w-3xl rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          <p className="font-semibold">SMS sending is switched off</p>
          <p className="mt-1 text-text-muted">
            Nothing will reach a phone while <code>SMS_ENABLED</code> is not <code>true</code> on the
            API. You can still resolve an audience to check its size.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-5">
        <section className="rounded-xl border border-border bg-surface p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-text">1. Who receives it</h2>

          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ['filter', 'Match on profile'],
                ['list', 'Paste numbers or CSV'],
              ] as [BulkSmsAudienceMode, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => changeAudience(() => setMode(value))}
                aria-pressed={mode === value}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  mode === value
                    ? 'border-primary bg-primary/10 font-medium text-primary'
                    : 'border-border text-text-muted hover:border-primary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'filter' ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="District">
                <select
                  value={filters.district ?? ''}
                  onChange={(e) =>
                    changeAudience(() =>
                      setFilters((f) => ({ ...f, district: e.target.value || undefined })),
                    )
                  }
                  className={controlClass}
                >
                  <option value="">Any district</option>
                  {districts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Gender">
                <select
                  value={filters.gender ?? ''}
                  onChange={(e) =>
                    changeAudience(() =>
                      setFilters((f) => ({
                        ...f,
                        gender: (e.target.value || undefined) as BulkSmsFilters['gender'],
                      })),
                    )
                  }
                  className={controlClass}
                >
                  <option value="">Any gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </Field>

              <Field label="Age from">
                <input
                  type="number"
                  min={18}
                  max={99}
                  value={filters.ageMin ?? ''}
                  onChange={(e) =>
                    changeAudience(() =>
                      setFilters((f) => ({
                        ...f,
                        ageMin: e.target.value ? Number(e.target.value) : undefined,
                      })),
                    )
                  }
                  className={controlClass}
                />
              </Field>

              <Field label="Age to">
                <input
                  type="number"
                  min={18}
                  max={99}
                  value={filters.ageMax ?? ''}
                  onChange={(e) =>
                    changeAudience(() =>
                      setFilters((f) => ({
                        ...f,
                        ageMax: e.target.value ? Number(e.target.value) : undefined,
                      })),
                    )
                  }
                  className={controlClass}
                />
              </Field>

              <Field label="Account status">
                <select
                  value={filters.status ?? ''}
                  onChange={(e) =>
                    changeAudience(() =>
                      setFilters((f) => ({
                        ...f,
                        status: (e.target.value || undefined) as BulkSmsFilters['status'],
                      })),
                    )
                  }
                  className={controlClass}
                >
                  <option value="">Any status</option>
                  <option value="active">Active</option>
                  <option value="banned">Banned</option>
                </select>
              </Field>

              <Field label="Profile approval">
                <select
                  value={filters.approvalStatus ?? ''}
                  onChange={(e) =>
                    changeAudience(() =>
                      setFilters((f) => ({
                        ...f,
                        approvalStatus: (e.target.value ||
                          undefined) as BulkSmsFilters['approvalStatus'],
                      })),
                    )
                  }
                  className={controlClass}
                >
                  <option value="">Any</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </Field>

              <p className="text-xs text-text-faint sm:col-span-2">
                Only members with a verified phone number are included — the rest have nowhere to
                receive it.
              </p>
            </div>
          ) : (
            <div className="mt-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-muted hover:border-primary hover:text-primary"
                >
                  Load CSV
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".csv,.txt,text/csv,text/plain"
                  onChange={handleCsv}
                  className="hidden"
                />
                <span className="text-xs text-text-faint">
                  {phones.length} number{phones.length === 1 ? '' : 's'} recognised
                </span>
              </div>
              <textarea
                rows={8}
                value={phoneText}
                onChange={(e) => changeAudience(() => setPhoneText(e.target.value))}
                placeholder={'01700000000\n+8801800000000'}
                className={`${controlClass} font-mono`}
              />
              <p className="mt-1.5 text-xs text-text-faint">
                One per line, or separated by commas. Numbers are normalised and de-duplicated, and
                anything that is not a valid Bangladeshi mobile number is dropped.
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={handlePreview}
              disabled={previewMutation.isPending}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:enabled:border-primary hover:enabled:text-primary disabled:opacity-60"
            >
              {previewMutation.isPending ? 'Checking…' : 'Check audience'}
            </button>
            {preview && (
              <p className="text-sm text-text-muted">
                <span className="font-semibold text-text">{preview.total}</span> recipient
                {preview.total === 1 ? '' : 's'}
                {preview.sample.length > 0 && (
                  <span className="text-text-faint"> — e.g. {preview.sample.join(', ')}</span>
                )}
              </p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-text">2. What it says</h2>
          <p className="mt-1 text-xs text-text-faint">
            Placeholders: <code>{'{name}'}</code> <code>{'{district}'}</code> <code>{'{age}'}</code>{' '}
            <code>{'{profession}'}</code> <code>{'{profileId}'}</code> <code>{'{siteName}'}</code>{' '}
            <code>{'{siteUrl}'}</code>. A pasted number with no matching account still receives the
            message, with those parts left out.
          </p>

          <textarea
            rows={5}
            maxLength={MESSAGE_MAX_LENGTH}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Assalamu alaikum {name}, new verified profiles from {district} joined this week."
            className={`${controlClass} mt-3`}
          />
          <div className="mt-1.5 flex flex-wrap justify-between gap-2 text-xs text-text-faint">
            <span>
              {message.length}/{MESSAGE_MAX_LENGTH} characters
            </span>
            <span>
              {segments} segment{segments === 1 ? '' : 's'} each
              {unicode && ' · Bangla text, 70 characters per segment'}
              {preview && segments > 0 && ` · ~${preview.total * segments} billed in total`}
            </span>
          </div>
        </section>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={sendMutation.isPending || !smsEnabled || !preview || preview.total === 0}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:enabled:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-2"
          >
            {sendMutation.isPending
              ? 'Sending…'
              : !smsEnabled
                ? 'Sending disabled'
                : preview
                  ? `Send to ${preview.total}`
                  : 'Check the audience first'}
          </button>
        </div>
      </form>
    </div>
  );
}

const controlClass =
  'w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-text-muted">{label}</span>
      {children}
    </label>
  );
}
