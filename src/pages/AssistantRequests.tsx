import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { getAssistantRequests, updateAssistantRequestStatus } from '../api/admin';
import type { AssistantRequest, AssistantRequestStatus } from '../api/types';
import { Badge } from '../components/Badge';
import type { BadgeTone } from '../components/Badge';
import { Pagination } from '../components/Pagination';
import { SearchInput } from '../components/SearchInput';
import { SpinnerIcon } from '../components/icons';

const PAGE_SIZE = 10;

type StatusFilter = 'all' | AssistantRequestStatus;

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All' },
];

const STATUS_TONE: Record<AssistantRequestStatus, BadgeTone> = {
  pending: 'gold',
  contacted: 'primary',
  closed: 'neutral',
};

export function AssistantRequests() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const statusParam = filter === 'all' ? undefined : filter;

  const query = useQuery({
    queryKey: ['admin', 'assistant-requests', page, filter, search],
    queryFn: () =>
      getAssistantRequests({
        page,
        pageSize: PAGE_SIZE,
        status: statusParam,
        search: search || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AssistantRequestStatus }) =>
      updateAssistantRequestStatus(id, status),
    onSuccess: () => {
      toast.success('Request updated');
      queryClient.invalidateQueries({ queryKey: ['admin', 'assistant-requests'] });
    },
    onError: () => toast.error('Failed to update request'),
  });

  function handleFilterChange(value: StatusFilter) {
    setFilter(value);
    setPage(1);
  }

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  const requests = query.data?.items ?? [];

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Assistant Requests</h1>
          <p className="mt-1 text-sm text-text-faint">
            Leads submitted through the Assistance Service landing page
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
          placeholder="Search by name, phone or email…"
          className="w-full sm:w-72"
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
          Failed to load assistant requests. Please refresh.
        </p>
      )}

      {query.isLoading ? (
        <p className="py-16 text-center text-sm text-text-faint">Loading requests…</p>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface py-16 text-center">
          <p className="text-sm font-medium text-text">Nothing here</p>
          <p className="mt-1 text-sm text-text-faint">No requests match this filter.</p>
        </div>
      ) : (
        <div
          className={clsx(
            'space-y-3 transition-opacity',
            query.isFetching && !query.isLoading && 'opacity-60',
          )}
        >
          {requests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              isUpdating={statusMutation.isPending && statusMutation.variables?.id === request.id}
              onSetStatus={(status) => statusMutation.mutate({ id: request.id, status })}
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

function RequestCard({
  request,
  isUpdating,
  onSetStatus,
}: {
  request: AssistantRequest;
  isUpdating: boolean;
  onSetStatus: (status: AssistantRequestStatus) => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h3 className="text-base font-semibold text-text">{request.name}</h3>
          <Badge tone={STATUS_TONE[request.status]}>{request.status}</Badge>
        </div>
        <p className="mt-0.5 text-sm text-text-muted">{request.phone} · {request.email}</p>
        {request.profileId && (
          <p className="mt-0.5 text-xs text-text-faint">Profile ID: {request.profileId}</p>
        )}
        <p className="mt-1.5 text-xs text-text-faint">
          Submitted{' '}
          {new Date(request.createdAt).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </p>
      </div>

      <div className="flex shrink-0 gap-2 sm:flex-col">
        {request.status === 'pending' && (
          <button
            type="button"
            onClick={() => onSetStatus('contacted')}
            disabled={isUpdating}
            className="flex-1 rounded-lg bg-primary/15 px-4 py-2 text-sm font-semibold text-primary hover:enabled:bg-primary/25 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
          >
            {isUpdating ? 'Updating…' : 'Mark contacted'}
          </button>
        )}
        {request.status === 'contacted' && (
          <button
            type="button"
            onClick={() => onSetStatus('closed')}
            disabled={isUpdating}
            className="flex-1 rounded-lg bg-success/15 px-4 py-2 text-sm font-semibold text-success hover:enabled:bg-success/25 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
          >
            {isUpdating ? 'Updating…' : 'Mark closed'}
          </button>
        )}
        {request.status === 'closed' && (
          <button
            type="button"
            onClick={() => onSetStatus('pending')}
            disabled={isUpdating}
            className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-muted hover:enabled:bg-surface-raised hover:enabled:text-text disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
          >
            {isUpdating ? 'Updating…' : 'Reopen'}
          </button>
        )}
      </div>
    </div>
  );
}
