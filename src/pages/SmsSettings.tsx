import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { getSettings, getSmsStatus, updateSettings } from '../api/admin';
import { apiErrorMessage } from '../api/client';

/**
 * Everything that decides what an SMS says and when one is sent.
 *
 * Split out of the general Settings page because it is a different job done by
 * a different person on a different day: pricing and landing-page copy are set
 * once, while templates are revised alongside campaigns. Keeping them on one
 * form also meant a single Save button covering both, so a copy tweak could
 * not be saved without carrying along whatever else was half-edited.
 *
 * The gateway itself — provider, credentials and the master on/off switch —
 * is deliberately not here: it lives in the server's environment, where a
 * compromised admin login cannot reach it.
 */

const RECIPIENT_PLACEHOLDERS: [string, string][] = [
  ['{name}', "recipient's name"],
  ['{district}', "recipient's district"],
  ['{age}', "recipient's age"],
  ['{profession}', "recipient's profession"],
  ['{profileId}', "recipient's profile ID"],
];

const SENDER_PLACEHOLDERS: [string, string][] = [
  ['{senderName}', 'the other person’s name'],
  ['{senderAge}', 'their age'],
  ['{senderDistrict}', 'their district'],
  ['{senderProfession}', 'their profession'],
  ['{senderProfileId}', 'their profile ID'],
];

const SITE_PLACEHOLDERS: [string, string][] = [
  ['{siteName}', 'Biye Kora Lagbe'],
  ['{siteUrl}', 'site address'],
];

export function SmsSettings() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin', 'settings'], queryFn: getSettings });
  const statusQuery = useQuery({ queryKey: ['admin', 'sms-status'], queryFn: getSmsStatus });
  const smsEnabled = statusQuery.data?.enabled ?? true;

  const [otpRegister, setOtpRegister] = useState('');
  const [otpLogin, setOtpLogin] = useState('');
  const [otpReset, setOtpReset] = useState('');
  const [autoInterest, setAutoInterest] = useState(false);
  const [interestTemplate, setInterestTemplate] = useState('');
  const [autoMessage, setAutoMessage] = useState(false);
  const [messageTemplate, setMessageTemplate] = useState('');

  function hydrate(data: NonNullable<typeof query.data>) {
    setOtpRegister(data.smsTemplateOtpRegister);
    setOtpLogin(data.smsTemplateOtpLogin);
    setOtpReset(data.smsTemplateOtpReset);
    setAutoInterest(data.smsAutoInterestEnabled);
    setInterestTemplate(data.smsTemplateNewInterest);
    setAutoMessage(data.smsAutoMessageEnabled);
    setMessageTemplate(data.smsTemplateNewMessage);
  }

  useEffect(() => {
    if (query.data) hydrate(query.data);
    // hydrate is recreated each render but only ever reads its argument.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (data) => {
      toast.success('SMS settings updated');
      queryClient.setQueryData(['admin', 'settings'], data);
    },
    // The API rejects an unknown placeholder by name, which is far more useful
    // than a generic failure — so its message is shown rather than swallowed.
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to update SMS settings')),
  });

  const isDirty =
    query.data &&
    (otpRegister !== query.data.smsTemplateOtpRegister ||
      otpLogin !== query.data.smsTemplateOtpLogin ||
      otpReset !== query.data.smsTemplateOtpReset ||
      autoInterest !== query.data.smsAutoInterestEnabled ||
      interestTemplate !== query.data.smsTemplateNewInterest ||
      autoMessage !== query.data.smsAutoMessageEnabled ||
      messageTemplate !== query.data.smsTemplateNewMessage);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (![otpRegister, otpLogin, otpReset].every((t) => t.includes('{code}'))) {
      toast.error('Each OTP template must include the {code} placeholder');
      return;
    }
    if (!interestTemplate.trim() || !messageTemplate.trim()) {
      toast.error('Automatic SMS templates cannot be empty');
      return;
    }

    mutation.mutate({
      smsTemplateOtpRegister: otpRegister,
      smsTemplateOtpLogin: otpLogin,
      smsTemplateOtpReset: otpReset,
      smsAutoInterestEnabled: autoInterest,
      smsTemplateNewInterest: interestTemplate,
      smsAutoMessageEnabled: autoMessage,
      smsTemplateNewMessage: messageTemplate,
    });
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-text sm:text-2xl">SMS Settings</h1>
        <p className="mt-1 text-sm text-text-faint">
          What each message says, and which events send one automatically
        </p>
      </header>

      {!smsEnabled && (
        <div className="mb-4 max-w-3xl rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          <p className="font-semibold">SMS sending is switched off</p>
          <p className="mt-1 text-text-muted">
            Nothing reaches a phone while <code>SMS_ENABLED</code> is not <code>true</code> on the
            API, whatever is set here. Templates can still be written and saved ahead of go-live.
          </p>
        </div>
      )}

      {query.isError && (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          Could not load the settings.
        </p>
      )}

      {query.isLoading && <p className="text-sm text-text-faint">Loading…</p>}

      {query.data && (
        <form onSubmit={handleSubmit} className="max-w-3xl space-y-5">
          <section className="rounded-xl border border-border bg-surface p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-text">Verification codes</h2>
            <p className="mt-1 text-xs text-text-faint">
              Sent when someone registers, signs in with a code, or resets a password.
            </p>
            <PlaceholderLegend
              title="Available here"
              items={[
                ['{code}', 'the one-time code'],
                ['{minutes}', 'minutes until it expires'],
                ...SITE_PLACEHOLDERS,
              ]}
            />
            <div className="mt-4 space-y-4">
              <TemplateField label="Registration OTP" value={otpRegister} onChange={setOtpRegister} />
              <TemplateField label="Login OTP" value={otpLogin} onChange={setOtpLogin} />
              <TemplateField label="Password reset OTP" value={otpReset} onChange={setOtpReset} />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-text">Automatic notifications</h2>
            <p className="mt-1 text-xs text-text-faint">
              Sent to a member when something happens on their profile. Each switch is independent
              of the others and of the server's master switch.
            </p>

            <PlaceholderLegend
              title="About the recipient"
              items={[...RECIPIENT_PLACEHOLDERS, ...SITE_PLACEHOLDERS]}
            />
            <PlaceholderLegend
              title="About the person who sent the interest or message"
              items={SENDER_PLACEHOLDERS}
            />

            <div className="mt-5 space-y-5">
              <div>
                <ToggleField
                  label="New interest received"
                  description="Sent once per person — a repeat interest on the same profile is not possible."
                  checked={autoInterest}
                  onChange={setAutoInterest}
                />
                <div className="mt-2">
                  <TemplateField
                    label="Interest template"
                    value={interestTemplate}
                    onChange={setInterestTemplate}
                  />
                </div>
              </div>

              <div>
                <ToggleField
                  label="First message from someone new"
                  description="Only the first message in a conversation. Replies later in the same thread never send an SMS."
                  checked={autoMessage}
                  onChange={setAutoMessage}
                />
                <div className="mt-2">
                  <TemplateField
                    label="Message template"
                    value={messageTemplate}
                    onChange={setMessageTemplate}
                  />
                </div>
              </div>
            </div>
          </section>

          <p className="text-xs text-text-faint">
            Last updated {new Date(query.data.updatedAt).toLocaleString('en-US')}
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={!isDirty || mutation.isPending}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:enabled:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-2"
            >
              {mutation.isPending ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              disabled={!isDirty || mutation.isPending}
              onClick={() => query.data && hydrate(query.data)}
              className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-muted hover:enabled:text-text disabled:opacity-60 sm:w-auto sm:py-2"
            >
              Discard changes
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function TemplateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-text-muted">{label}</label>
      <textarea
        rows={2}
        maxLength={300}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <p className="mt-1 text-right text-xs text-text-faint">{value.length}/300</p>
    </div>
  );
}

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-text">{label}</span>
        <span className="mt-0.5 block text-xs text-text-faint">{description}</span>
      </span>
    </label>
  );
}

/** Kept beside the editors so an admin never guesses a name and has it silently dropped at send time. */
function PlaceholderLegend({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div className="mt-3 rounded-lg border border-border bg-surface-raised p-3">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-faint">
        {title}
      </p>
      <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
        {items.map(([token, meaning]) => (
          <div key={token} className="flex gap-2">
            <dt>
              <code className="text-text">{token}</code>
            </dt>
            <dd className="text-text-faint">{meaning}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
