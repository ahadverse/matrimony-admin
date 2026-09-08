import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  bulkDeleteContactMessages,
  getContactMessages,
  updateContactMessageStatus,
} from '../api/admin';
import { apiErrorMessage } from '../api/client';
import type { ContactMessage, ContactMessageStatus } from '../api/types';
import { Badge } from '../components/Badge';
import type { BadgeTone } from '../components/Badge';
import { BulkActionBar } from '../components/BulkActionBar';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Pagination } from '../components/Pagination';
import { SearchInput } from '../components/SearchInput';
import { SelectCheckbox } from '../components/SelectCheckbox';
import { SpinnerIcon } from '../components/icons';
import { usePageSize } from '../hooks/usePageSize';
import { useRowSelection } from '../hooks/useRowSelection';
import { reportBulkDelete } from '../lib/bulkDelete';

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
  const [pageSize, setPageSize] = usePageSize('contact-messages');
  const [filter, setFilter] = useState<StatusFilter>('new');
  const [search, setSearch] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const queryClient = useQueryClient();

  const statusParam = filter === 'all' ? undefined : filter;

  const query = useQuery({
    queryKey: ['admin', 'contact-messages', page, pageSize, filter, search],
    queryFn: () =>
      getContactMessages({
        page,
        pageSize,
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

  const messages = query.data?.items ?? [];
  const selection = useRowSelection(messages.map((m) => m.id));

  const deleteMutation = useMutation({
    mutationFn: () => bulkDeleteContactMessages(selection.selectedIds),
    onSuccess: (result) => {
      reportBulkDelete(result, 'message');
      setConfirmingDelete(false);
      selection.clear();
      queryClient.invalidateQueries({ queryKey: ['admin', 'contact-messages'] });
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Could not delete the selected messages')),
  });

  function handleFilterChange(value: StatusFilter) {
    setFilter(value);
    setPage(1);
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text sm:text-2xl">Contact Messages</h1>
          <p className="mt-1 text-sm text-text-faint">
            Enquiries submitted through the Contact Us page
          </p>
        </div>

        <div className="flex w-full gap-1 rounded-lg border border-border bg-surface p-1 sm:w-auto">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => handleFilterChange(f.value)}
              className={clsx(
                'flex-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium sm:flex-none sm:py-1.5',
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
        <>
          <BulkActionBar
            count={selection.count}
            noun="message"
            allSelected={selection.allSelected}
            someSelected={selection.someSelected}
            onToggleAll={selection.toggleAll}
            onClear={selection.clear}
            onDelete={() => setConfirmingDelete(true)}
            isDeleting={deleteMutation.isPending}
          />

          <label className="mb-2 flex w-fit cursor-pointer items-center gap-2 px-1 text-sm text-text-faint">
            <SelectCheckbox
              checked={selection.allSelected}
              indeterminate={selection.someSelected}
              onChange={selection.toggleAll}
              label="Select all messages on this page"
            />
            Select all on this page
          </label>

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
                selected={selection.isSelected(message.id)}
                onToggleSelected={() => selection.toggle(message.id)}
                isUpdating={statusMutation.isPending && statusMutation.variables?.id === message.id}
                onSetStatus={(status) => statusMutation.mutate({ id: message.id, status })}
              />
            ))}
          </div>
        </>
      )}

      {query.data && query.data.total > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={query.data.total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          idPrefix="contact-messages"
        />
      )}

      {confirmingDelete && (
        <ConfirmDialog
          title={`Delete ${selection.count} message${selection.count === 1 ? '' : 's'}`}
          message={`Permanently delete the ${selection.count} selected message${
            selection.count === 1 ? '' : 's'
          }? The enquiry and the sender's details are removed for good. This cannot be undone.`}
          confirmLabel="Delete permanently"
          tone="danger"
          isLoading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate()}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}

function MessageCard({
  message,
  selected,
  onToggleSelected,
  isUpdating,
  onSetStatus,
}: {
  message: ContactMessage;
  selected: boolean;
  onToggleSelected: () => void;
  isUpdating: boolean;
  onSetStatus: (status: ContactMessageStatus) => void;
}) {
  return (
    <div
      className={clsx(
        'flex flex-col gap-4 rounded-xl border bg-surface p-4 sm:flex-row',
        selected ? 'border-primary/50 ring-1 ring-primary/30' : 'border-border',
      )}
    >
      <SelectCheckbox
        checked={selected}
        onChange={onToggleSelected}
        label={`Select message: ${message.subject}`}
        className="mt-1"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h3 className="min-w-0 break-words text-base font-semibold text-text">{message.subject}</h3>
          <Badge tone={STATUS_TONE[message.status]}>{message.status}</Badge>
        </div>
        <p className="mt-0.5 break-words text-sm text-text-muted">
          {message.name}
          {message.phone ? ` · ${message.phone}` : ''} · {message.email}
        </p>
        <p className="mt-2 whitespace-pre-line break-words text-sm text-text">{message.message}</p>
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

      <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
        <a
          href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`}
          className="flex-1 whitespace-nowrap rounded-lg border border-border px-4 py-2.5 text-center text-sm font-medium text-text-muted hover:bg-surface-raised hover:text-text sm:flex-none sm:py-2"
        >
          Reply by email
        </a>
        {message.status === 'new' && (
          <button
            type="button"
            onClick={() => onSetStatus('read')}
            disabled={isUpdating}
            className="flex-1 whitespace-nowrap rounded-lg bg-primary/15 px-4 py-2.5 text-sm font-semibold text-primary hover:enabled:bg-primary/25 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:py-2"
          >
            {isUpdating ? 'Updating…' : 'Mark read'}
          </button>
        )}
        {message.status === 'read' && (
          <button
            type="button"
            onClick={() => onSetStatus('replied')}
            disabled={isUpdating}
            className="flex-1 whitespace-nowrap rounded-lg bg-success/15 px-4 py-2.5 text-sm font-semibold text-success hover:enabled:bg-success/25 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:py-2"
          >
            {isUpdating ? 'Updating…' : 'Mark replied'}
          </button>
        )}
        {message.status === 'replied' && (
          <button
            type="button"
            onClick={() => onSetStatus('new')}
            disabled={isUpdating}
            className="flex-1 whitespace-nowrap rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-text-muted hover:enabled:bg-surface-raised hover:enabled:text-text disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:py-2"
          >
            {isUpdating ? 'Updating…' : 'Reopen'}
          </button>
        )}
      </div>
    </div>
  );
}
