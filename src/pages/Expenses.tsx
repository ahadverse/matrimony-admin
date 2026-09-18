import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import clsx from 'clsx';
import { getTransactions } from '../api/admin';
import { Badge } from '../components/Badge';
import { Pagination } from '../components/Pagination';
import { SearchInput } from '../components/SearchInput';
import { SortableTh } from '../components/SortableTh';
import { SpinnerIcon } from '../components/icons';
import { usePageSize } from '../hooks/usePageSize';
import { EXPENSE_TYPES, TYPE_LABEL } from '../lib/walletLedger';
import type { BadgeTone } from '../components/Badge';
import type { SortOrder, TransactionStatus, TransactionType } from '../api/types';

const TAKA = new Intl.NumberFormat('en-BD');

const STATUS_TONE: Record<TransactionStatus, BadgeTone> = {
  success: 'success',
  pending: 'gold',
  failed: 'danger',
};

type TypeFilter = 'all' | TransactionType;
type StatusFilter = 'all' | TransactionStatus;

const selectClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:w-auto sm:py-2';
const dateInputClass =
  'min-w-0 flex-1 rounded-lg border border-border bg-surface px-2.5 py-2.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:flex-none sm:py-2';

/**
 * What members spend: profile unlocks, spotlights and assistance-service
 * purchases. The money-in side of the same ledger — top-ups, refunds and admin
 * adjustments — is the Transactions page.
 *
 * Read-only on purpose. Transactions offers bulk delete for clearing out failed
 * payment attempts; a spend record is the counterpart to something a member
 * actually received, so deleting one here would only make the books disagree
 * with what they were given.
 */
export function Expenses() {
  const [searchParams, setSearchParams] = useSearchParams();
  const userIdParam = searchParams.get('userId');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('expenses');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');

  const query = useQuery({
    queryKey: [
      'admin',
      'expenses',
      page,
      pageSize,
      userIdParam,
      typeFilter,
      statusFilter,
      search,
      from,
      to,
      sortBy,
      sortOrder,
    ],
    queryFn: () =>
      getTransactions({
        page,
        pageSize,
        userId: userIdParam ?? undefined,
        // Bounded server-side so the count and pagination describe spending
        // only, not the whole wallet ledger.
        types: [...EXPENSE_TYPES],
        type: typeFilter === 'all' ? undefined : typeFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: search || undefined,
        from: from || undefined,
        to: to || undefined,
        sortBy,
        sortOrder,
      }),
    placeholderData: (prev) => prev,
  });

  function handleSort(key: string) {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(key);
      setSortOrder('DESC');
    }
    setPage(1);
  }

  function clearUserFilter() {
    const next = new URLSearchParams(searchParams);
    next.delete('userId');
    setSearchParams(next);
    setPage(1);
  }

  const expenses = query.data?.items ?? [];

  // Unlocks and spotlights are stored as wallet debits (negative), while an
  // assistance-service purchase is a positive bKash payment that never touched
  // the wallet. Both are money the member spent, so the magnitude is what this
  // page reports — and the page total is labelled as such, because summing
  // every page would need a server-side total this endpoint does not return.
  const pageTotal = expenses
    .filter((tx) => tx.status === 'success')
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-text sm:text-2xl">Expenses</h1>
        <p className="mt-1 text-sm text-text-faint">
          What members spend — profile unlocks, spotlights and assistance service
        </p>
      </header>

      {userIdParam && (
        <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm text-primary">
          <span>Showing expenses for one user only</span>
          <button
            type="button"
            onClick={clearUserFilter}
            className="font-medium underline hover:no-underline"
          >
            Clear
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          onSearch={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search by phone or name…"
          className="w-full sm:w-64"
        />
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value as TypeFilter);
            setPage(1);
          }}
          className={selectClass}
        >
          <option value="all">All types</option>
          {EXPENSE_TYPES.map((value) => (
            <option key={value} value={value}>
              {TYPE_LABEL[value]}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as StatusFilter);
            setPage(1);
          }}
          className={selectClass}
        >
          <option value="all">All statuses</option>
          <option value="success">Success</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
        <div className="flex w-full items-center gap-1.5 text-sm text-text-muted sm:w-auto">
          <label htmlFor="ex-from" className="shrink-0 text-text-faint">
            From
          </label>
          <input
            id="ex-from"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className={dateInputClass}
          />
          <label htmlFor="ex-to" className="shrink-0 text-text-faint">
            To
          </label>
          <input
            id="ex-to"
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className={dateInputClass}
          />
        </div>
        {query.isFetching && !query.isLoading && (
          <span className="flex items-center gap-1.5 text-xs text-text-faint">
            <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
            Updating…
          </span>
        )}
      </div>

      {query.isError && (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          Failed to load expenses. Please refresh.
        </p>
      )}

      {query.data && query.data.total > 0 && (
        <div className="mb-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-lg border border-border bg-surface px-4 py-3">
          <span className="text-sm text-text-muted">Settled on this page</span>
          <span className="text-lg font-semibold text-text">৳{TAKA.format(pageTotal)}</span>
          <span className="text-xs text-text-faint">
            across {query.data.total.toLocaleString()} matching record
            {query.data.total === 1 ? '' : 's'}
          </span>
        </div>
      )}

      <div
        className={clsx(
          'overflow-x-auto rounded-xl border border-border bg-surface transition-opacity',
          query.isFetching && !query.isLoading && 'opacity-60',
        )}
      >
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-text-faint">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Spent on</th>
              <SortableTh
                label="Amount"
                sortKey="amount"
                activeSortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
              />
              <th className="px-4 py-3 font-medium">Balance after</th>
              <th className="px-4 py-3 font-medium">Paid via</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <SortableTh
                label="Date"
                sortKey="createdAt"
                activeSortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
              />
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-text-faint">
                  Loading expenses…
                </td>
              </tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-text-faint">
                  No expenses match these filters.
                </td>
              </tr>
            ) : (
              expenses.map((tx) => (
                <tr key={tx.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    {tx.user ? (
                      <>
                        <div className="font-medium text-text">{tx.user.phone}</div>
                        {tx.user.name && (
                          <div className="text-xs text-text-faint">{tx.user.name}</div>
                        )}
                      </>
                    ) : (
                      <span className="text-text-faint">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text">{TYPE_LABEL[tx.type] ?? tx.type}</td>
                  <td className="px-4 py-3 font-medium text-danger">
                    ৳{TAKA.format(Math.abs(tx.amount))}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {/* An assistance-service purchase is paid straight to bKash,
                        so it has no meaningful wallet balance to report. */}
                    {tx.provider ? (
                      <span className="text-text-faint">—</span>
                    ) : (
                      `৳${TAKA.format(tx.balanceAfter)}`
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {tx.provider ? (
                      <>
                        <div className="capitalize">{tx.provider}</div>
                        {tx.providerTransactionId && (
                          <div className="font-mono text-xs text-text-faint">
                            {tx.providerTransactionId}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-text-faint">Wallet</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[tx.status]}>{tx.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-text-faint">
                    {new Date(tx.createdAt).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {query.data && query.data.total > 0 && (
          <div className="px-4">
            <Pagination
              page={page}
              pageSize={pageSize}
              total={query.data.total}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              idPrefix="expenses"
            />
          </div>
        )}
      </div>
    </div>
  );
}
