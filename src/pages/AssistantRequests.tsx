import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  bulkDeleteAssistantRequests,
  getAssistantRequests,
  updateAssistantRequestStatus,
} from '../api/admin';
import { apiErrorMessage } from '../api/client';
import type { AssistantRequest, AssistantRequestPlan, AssistantRequestStatus } from '../api/types';
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

const PLAN_LABELS: Record<AssistantRequestPlan, string> = {
  three_months: '3 Months',
  six_months: '6 Months',
};

export function AssistantRequests() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('assistant-requests');
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [search, setSearch] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const queryClient = useQueryClient();

  const statusParam = filter === 'all' ? undefined : filter;

  const query = useQuery({
    queryKey: ['admin', 'assistant-requests', page, pageSize, filter, search],
    queryFn: () =>
      getAssistantRequests({
        page,
        pageSize,
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

  const requests = query.data?.items ?? [];
  const selection = useRowSelection(requests.map((r) => r.id));

  const deleteMutation = useMutation({
    mutationFn: () => bulkDeleteAssistantRequests(selection.selectedIds),
    onSuccess: (result) => {
      reportBulkDelete(result, 'request');
      setConfirmingDelete(false);
      selection.clear();
      queryClient.invalidateQueries({ queryKey: ['admin', 'assistant-requests'] });
    },
    onError: (error) =>
      toast.error(apiErrorMessage(error, 'Could not delete the selected requests')),
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
          <h1 className="text-xl font-semibold text-text sm:text-2xl">Assistant Requests</h1>
          <p className="mt-1 text-sm text-text-faint">
            Leads submitted through the Assistance Service landing page
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
        <>
          <BulkActionBar
            count={selection.count}
            noun="request"
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
              label="Select all requests on this page"
            />
            Select all on this page
          </label>

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
                selected={selection.isSelected(request.id)}
                onToggleSelected={() => selection.toggle(request.id)}
                isUpdating={statusMutation.isPending && statusMutation.variables?.id === request.id}
                onSetStatus={(status) => statusMutation.mutate({ id: request.id, status })}
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
          idPrefix="assistant-requests"
        />
      )}

      {confirmingDelete && (
        <ConfirmDialog
          title={`Delete ${selection.count} request${selection.count === 1 ? '' : 's'}`}
          message={`Permanently delete the ${selection.count} selected request${
            selection.count === 1 ? '' : 's'
          }? These are sales leads — the contact details and the plan they asked about are removed for good. This cannot be undone.`}
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

function RequestCard({
  request,
  selected,
  onToggleSelected,
  isUpdating,
  onSetStatus,
}: {
  request: AssistantRequest;
  selected: boolean;
  onToggleSelected: () => void;
  isUpdating: boolean;
  onSetStatus: (status: AssistantRequestStatus) => void;
}) {
  return (
    <div
      className={clsx(
        'flex flex-col gap-4 rounded-xl border bg-surface p-4 sm:flex-row sm:items-center',
        selected ? 'border-primary/50 ring-1 ring-primary/30' : 'border-border',
      )}
    >
      <SelectCheckbox
        checked={selected}
        onChange={onToggleSelected}
        label={`Select request from ${request.name}`}
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <h3 className="min-w-0 break-words text-base font-semibold text-text">{request.name}</h3>
          <Badge tone={STATUS_TONE[request.status]}>{request.status}</Badge>
          {/* Always rendered, including the "no plan" case — a blank would read
              as a missing column rather than a lead who skipped the pricing. */}
          <Badge tone={request.plan ? 'success' : 'neutral'}>
            {request.plan ? PLAN_LABELS[request.plan] : 'No plan'}
          </Badge>
        </div>
        <p className="mt-0.5 break-words text-sm text-text-muted">{request.phone} · {request.email}</p>
        {request.profileId && (
          <p className="mt-0.5 break-words text-xs text-text-faint">Profile ID: {request.profileId}</p>
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

      <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
        {request.status === 'pending' && (
          <button
            type="button"
            onClick={() => onSetStatus('contacted')}
            disabled={isUpdating}
            className="flex-1 whitespace-nowrap rounded-lg bg-primary/15 px-4 py-2.5 text-sm font-semibold text-primary hover:enabled:bg-primary/25 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:py-2"
          >
            {isUpdating ? 'Updating…' : 'Mark contacted'}
          </button>
        )}
        {request.status === 'contacted' && (
          <button
            type="button"
            onClick={() => onSetStatus('closed')}
            disabled={isUpdating}
            className="flex-1 whitespace-nowrap rounded-lg bg-success/15 px-4 py-2.5 text-sm font-semibold text-success hover:enabled:bg-success/25 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:py-2"
          >
            {isUpdating ? 'Updating…' : 'Mark closed'}
          </button>
        )}
        {request.status === 'closed' && (
          <button
            type="button"
            onClick={() => onSetStatus('pending')}
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
