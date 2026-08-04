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
import type { BadgeTone } from '../components/Badge';
import type { SortOrder, TransactionStatus, TransactionType } from '../api/types';

const PAGE_SIZE = 20;
const TAKA = new Intl.NumberFormat('en-BD');

const STATUS_TONE: Record<TransactionStatus, BadgeTone> = {
  success: 'success',
  pending: 'gold',
  failed: 'danger',
};

const TYPE_LABEL: Record<string, string> = {
  topup: 'Top-up',
  view_unlock: 'View unlock',
  refund: 'Refund',
  admin_adjust: 'Admin adjustment',
  spotlight: 'Spotlight',
};

type TypeFilter = 'all' | TransactionType;
type StatusFilter = 'all' | TransactionStatus;

const selectClass =
  'rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';
const dateInputClass =
  'rounded-lg border border-border bg-surface px-2.5 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

export function Transactions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const userIdParam = searchParams.get('userId');

  const [page, setPage] = useState(1);
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
      'transactions',
      page,
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
        pageSize: PAGE_SIZE,
        userId: userIdParam ?? undefined,
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

  function handleSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  function clearUserFilter() {
    const next = new URLSearchParams(searchParams);
    next.delete('userId');
    setSearchParams(next);
    setPage(1);
  }

  const transactions = query.data?.items ?? [];

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-text">Transactions</h1>
        <p className="mt-1 text-sm text-text-faint">Wallet activity across the platform</p>
      </header>

      {userIdParam && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm text-primary">
          <span>Showing transactions for one user only</span>
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
          onSearch={handleSearch}
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
          <option value="topup">Top-up</option>
          <option value="view_unlock">View unlock</option>
          <option value="refund">Refund</option>
          <option value="admin_adjust">Admin adjustment</option>
          <option value="spotlight">Spotlight</option>
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
        <div className="flex items-center gap-1.5 text-sm text-text-muted">
          <label htmlFor="tx-from" className="text-text-faint">
            From
          </label>
          <input
            id="tx-from"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className={dateInputClass}
          />
          <label htmlFor="tx-to" className="text-text-faint">
            To
          </label>
          <input
            id="tx-to"
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
          Failed to load transactions. Please refresh.
        </p>
      )}

      <div
        className={clsx(
          'overflow-x-auto rounded-xl border border-border bg-surface transition-opacity',
          query.isFetching && !query.isLoading && 'opacity-60',
        )}
      >
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-text-faint">
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <SortableTh
                label="Amount"
                sortKey="amount"
                activeSortBy={sortBy}
                sortOrder={sortOrder}
                onSort={handleSort}
              />
              <th className="px-4 py-3 font-medium">Balance after</th>
              <th className="px-4 py-3 font-medium">Provider</th>
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
                  Loading transactions…
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-text-faint">
                  No transactions match these filters.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
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
                  <td
                    className={clsx(
                      'px-4 py-3 font-medium',
                      tx.amount < 0 ? 'text-danger' : 'text-success',
                    )}
                  >
                    {tx.amount < 0 ? '−' : '+'}৳{TAKA.format(Math.abs(tx.amount))}
                  </td>
                  <td className="px-4 py-3 text-text-muted">৳{TAKA.format(tx.balanceAfter)}</td>
                  <td className="px-4 py-3 capitalize text-text-muted">
                    {tx.provider ?? <span className="text-text-faint">—</span>}
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
              pageSize={PAGE_SIZE}
              total={query.data.total}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
