import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getSmsStatus, sendSms } from '../api/admin';
import { apiErrorMessage } from '../api/client';

const MESSAGE_MAX_LENGTH = 918;

export function SendSms() {
  // `?phone=` lets other pages (e.g. Approvals) hand off a member's number.
  const [searchParams] = useSearchParams();
  const [phone, setPhone] = useState(searchParams.get('phone') ?? '');
  const [message, setMessage] = useState('');

  const statusQuery = useQuery({ queryKey: ['admin', 'sms-status'], queryFn: getSmsStatus });
  // Treated as enabled until the check answers, so a slow request doesn't flash
  // a "switched off" warning at an admin whose gateway is perfectly fine.
  const smsEnabled = statusQuery.data?.enabled ?? true;

  const mutation = useMutation({
    mutationFn: sendSms,
    onSuccess: () => {
      toast.success('SMS sent');
      setMessage('');
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Failed to send SMS')),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!phone.trim()) {
      toast.error('Enter a phone number');
      return;
    }
    if (!message.trim()) {
      toast.error('Enter a message');
      return;
    }

    mutation.mutate({ phone: phone.trim(), message: message.trim() });
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-text sm:text-2xl">Send SMS</h1>
        <p className="mt-1 text-sm text-text-faint">Manually send a text message to any phone number</p>
      </header>

      {!smsEnabled && (
        <div className="mb-4 max-w-lg rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
          <p className="font-semibold">SMS sending is switched off</p>
          <p className="mt-1 text-text-muted">
            No message will reach a phone while <code>SMS_ENABLED</code> is not <code>true</code> on the
            API. Verification codes are being emailed instead. Set it and restart the API to send again.
          </p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="max-w-lg space-y-5 rounded-xl border border-border bg-surface p-4 sm:p-6"
      >
        <div>
          <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-text-muted">
            Phone number
          </label>
          <input
            id="phone"
            type="tel"
            placeholder="+8801700000000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-text-muted">
            Message
          </label>
          <textarea
            id="message"
            rows={5}
            maxLength={MESSAGE_MAX_LENGTH}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="mt-1.5 text-xs text-text-faint">
            {message.length}/{MESSAGE_MAX_LENGTH} characters
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={mutation.isPending || !smsEnabled}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:enabled:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-2"
          >
            {mutation.isPending ? 'Sending…' : smsEnabled ? 'Send SMS' : 'Sending disabled'}
          </button>
        </div>
      </form>
    </div>
  );
}
