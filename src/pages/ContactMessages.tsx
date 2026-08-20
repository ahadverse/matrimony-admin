import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { getContactMessages, updateContactMessageStatus } from '../api/admin';
import type { ContactMessage, ContactMessageStatus } from '../api/types';
import { Badge } from '../components/Badge';
import type { BadgeTone } from '../components/Badge';
import { Pagination } from '../components/Pagination';
import { SearchInput } from '../components/SearchInput';
import { SpinnerIcon } from '../components/icons';

const PAGE_SIZE = 10;

type StatusFilter = 'all' | ContactMessageStatus;

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'read', label: 'Read' },
  { value: 'replied', label: 'Replied' },
  { value: 'all', label: 'All' },
];

const STATUS_TONE: Record<ContactMessageStatus, BadgeTone> = {
  new: 'gold',
  read: 'primary',
  replied: 'neutral',
};

export function ContactMessages() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<StatusFilter>('new');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const statusParam = filter === 'all' ? undefined : filter;

  const query = useQuery({
    queryKey: ['admin', 'contact-messages', page, filter, search],
    queryFn: () =>
      getContactMessages({
        page,
        pageSize: PAGE_SIZE,
        status: statusParam,
        search: search || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContactMessageStatus }) =>
      updateContactMessageStatus(id, status),
    onSuccess: () => {
      toast.success('Message updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'contact-messages'] });
    },
    onError: () => toast.error('Failed to update message'),
  });

  function handleFilterChange(value: StatusFilter) {
    setFilter(value);
    setPage(1);
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  const messages = query.data?.items ?? [];

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Contact Messages</h1>
          <p className="mt-1 text-sm text-text-faint">
            Enquiries submitted through the Contact Us page
          </p>
        </div>

        <div className="flex gap-1 rounded-lg border border-border bg-surface p-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => handleFilterChange(f.value)}
              className={clsx(
                'rounded-md px-3 py-1.5 text-sm font-medium',
                filter === f.value ? 'bg-primary text-white' : 'text-text-muted hover:text-text',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          onSearch={handleSearch}
          placeholder="Search by name, phone, email or subject…"
          className="w-full sm:w-80"
        />
        {query.isFetching && !query.isLoading && (
          <span className="flex items-center gap-1.5 text-xs text-text-faint">
            <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
            Updating…
          </span>
        )}
      </div>

      {query.isError && (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          Failed to load contact messages. Please refresh.
        </p>
      )}

      {query.isLoading ? (
        <p className="py-16 text-center text-sm text-text-faint">Loading messages…</p>
      ) : messages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface py-16 text-center">
          <p className="text-sm font-medium text-text">Nothing here</p>
          <p className="mt-1 text-sm text-text-faint">No messages match this filter.</p>
        </div>
      ) : (
        <div
          className={clsx(
            'space-y-3 transition-opacity',
            query.isFetching && !query.isLoading && 'opacity-60',
          )}
        >
          {messages.map((message) => (
            <MessageCard
              key={message.id}
              message={message}
              isUpdating={statusMutation.isPending && statusMutation.variables?.id === message.id}
              onSetStatus={(status) => statusMutation.mutate({ id: message.id, status })}
            />
          ))}
        </div>
      )}

      {query.data && query.data.total > 0 && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={query.data.total} onPageChange={setPage} />
      )}
    </div>
  );
}

function MessageCard({
  message,
  isUpdating,
  onSetStatus,
}: {
  message: ContactMessage;
  isUpdating: boolean;
  onSetStatus: (status: ContactMessageStatus) => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 sm:flex-row">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h3 className="text-base font-semibold text-text">{message.subject}</h3>
          <Badge tone={STATUS_TONE[message.status]}>{message.status}</Badge>
        </div>
        <p className="mt-0.5 text-sm text-text-muted">
          {message.name}
          {message.phone ? ` · ${message.phone}` : ''} · {message.email}
        </p>
        <p className="mt-2 whitespace-pre-line text-sm text-text">{message.message}</p>
        <p className="mt-2 text-xs text-text-faint">
          Received{' '}
          {new Date(message.createdAt).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </p>
      </div>

      <div className="flex shrink-0 flex-col gap-2">
        <a
          href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`}
          className="rounded-lg border border-border px-4 py-2 text-center text-sm font-medium text-text-muted hover:bg-surface-raised hover:text-text"
        >
          Reply by email
        </a>
        {message.status === 'new' && (
          <button
            type="button"
            onClick={() => onSetStatus('read')}
            disabled={isUpdating}
            className="rounded-lg bg-primary/15 px-4 py-2 text-sm font-semibold text-primary hover:enabled:bg-primary/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUpdating ? 'Updating…' : 'Mark read'}
          </button>
        )}
        {message.status === 'read' && (
          <button
            type="button"
            onClick={() => onSetStatus('replied')}
            disabled={isUpdating}
            className="rounded-lg bg-success/15 px-4 py-2 text-sm font-semibold text-success hover:enabled:bg-success/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUpdating ? 'Updating…' : 'Mark replied'}
          </button>
        )}
        {message.status === 'replied' && (
          <button
            type="button"
            onClick={() => onSetStatus('new')}
            disabled={isUpdating}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted hover:enabled:bg-surface-raised hover:enabled:text-text disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isUpdating ? 'Updating…' : 'Reopen'}
          </button>
        )}
      </div>
    </div>
  );
}
