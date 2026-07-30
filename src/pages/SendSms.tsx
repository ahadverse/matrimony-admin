import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { sendSms } from '../api/admin';

const MESSAGE_MAX_LENGTH = 918;

export function SendSms() {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  const mutation = useMutation({
    mutationFn: sendSms,
    onSuccess: () => {
      toast.success('SMS sent');
      setMessage('');
    },
    onError: () => toast.error('Failed to send SMS'),
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
        <h1 className="text-2xl font-semibold text-text">Send SMS</h1>
        <p className="mt-1 text-sm text-text-faint">Manually send a text message to any phone number</p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="max-w-lg space-y-5 rounded-xl border border-border bg-surface p-6"
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

        <div className="flex items-center gap-2 border-t border-border pt-4">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:enabled:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mutation.isPending ? 'Sending…' : 'Send SMS'}
          </button>
        </div>
      </form>
    </div>
  );
}
