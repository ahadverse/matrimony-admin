import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getSmsLogs, getSmsStats } from '../api/admin';
import { Badge } from '../components/Badge';
import { Pagination } from '../components/Pagination';
import { SearchInput } from '../components/SearchInput';
import { SortableTh } from '../components/SortableTh';
import { StatCard } from '../components/StatCard';
import { SpinnerIcon } from '../components/icons';
import type { BadgeTone } from '../components/Badge';
import type { SmsLogStatus, SortOrder } from '../api/types';

const PAGE_SIZE = 20;
const COUNT_FORMAT = new Intl.NumberFormat('en-US');

const STATUS_TONE: Record<SmsLogStatus, BadgeTone> = {
  success: 'success',
  failed: 'danger',
};

const PURPOSE_LABEL: Record<string, string> = {
  otp_register: 'OTP: Register',
  otp_login: 'OTP: Login',
  otp_reset: 'OTP: Reset password',
  admin: 'Admin (manual)',
  general: 'General',
};

function purposeLabel(purpose: string): string {
  return PURPOSE_LABEL[purpose] ?? purpose;
}

type StatusFilter = 'all' | SmsLogStatus;

const selectClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:w-auto sm:py-2';

export function SmsAnalytics() {
  const statsQuery = useQuery({
    queryKey: ['admin', 'sms', 'stats'],
    queryFn: getSmsStats,
  });

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [purposeFilter, setPurposeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');

  const logsQuery = useQuery({
    queryKey: ['admin', 'sms', 'logs', page, search, statusFilter, purposeFilter, sortBy, sortOrder],
    queryFn: () =>
      getSmsLogs({
        page,
        pageSize: PAGE_SIZE,
        status: statusFilter === 'all' ? undefined : statusFilter,
        purpose: purposeFilter === 'all' ? undefined : purposeFilter,
        search: search || undefined,
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

  const stats = statsQuery.data;
  const successRate =
    stats && stats.totalSent > 0 ? Math.round((stats.successCount / stats.totalSent) * 100) : null;

  const chartData = (stats?.byDay ?? []).map((row) => ({
    ...row,
    label: new Date(row.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  const maxPurposeCount = Math.max(1, ...(stats?.byPurpose.map((p) => p.count) ?? [1]));
  const logs = logsQuery.data?.items ?? [];

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-text sm:text-2xl">SMS Analytics</h1>
        <p className="mt-1 text-sm text-text-faint">
          Delivery activity across every SMS gateway (OTP and admin-sent messages)
        </p>
      </header>

      {statsQuery.isError && (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          Failed to load SMS stats. Please refresh.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total sent"
          value={statsQuery.isLoading ? '—' : COUNT_FORMAT.format(stats?.totalSent ?? 0)}
          accent="primary"
        />
        <StatCard
          label="Delivered"
          value={statsQuery.isLoading ? '—' : COUNT_FORMAT.format(stats?.successCount ?? 0)}
          accent="success"
        />
        <StatCard
          label="Failed"
          value={statsQuery.isLoading ? '—' : COUNT_FORMAT.format(stats?.failedCount ?? 0)}
          accent={stats && stats.failedCount > 0 ? 'gold' : 'default'}
        />
        <StatCard
          label="Success rate"
          value={statsQuery.isLoading || successRate === null ? '—' : `${successRate}%`}
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* min-w-0 keeps the recharts container from pinning the grid column open once it has measured a width. */}
        <section className="min-w-0 rounded-xl border border-border bg-surface p-4 sm:p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-text">Sends per day (last 14 days)</h2>
          <p className="mt-0.5 text-xs text-text-faint">Success vs. failed, by day</p>

          <div className="mt-4">
            {statsQuery.isLoading ? (
              <p className="py-10 text-center text-sm text-text-faint">Loading…</p>
            ) : chartData.length === 0 ? (
              <p className="py-10 text-center text-sm text-text-faint">
                No SMS activity in the last 14 days.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2c2032" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#7d6c8c"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: '#2c2032' }}
                  />
                  <YAxis stroke="#7d6c8c" fontSize={12} tickLine={false} axisLine={false} width={32} />
                  <Tooltip
                    cursor={{ fill: 'rgba(236,72,153,0.08)' }}
                    contentStyle={{
                      background: '#1e1626',
                      border: '1px solid #2c2032',
                      borderRadius: 8,
                      color: '#f5f1f8',
                      fontSize: 13,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="success" name="Delivered" stackId="sms" fill="#22c55e" radius={[0, 0, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="failed" name="Failed" stackId="sms" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="min-w-0 rounded-xl border border-border bg-surface p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-text">By purpose</h2>
          <p className="mt-0.5 text-xs text-text-faint">All-time send volume</p>

          <div className="mt-4 space-y-3">
            {statsQuery.isLoading ? (
              <p className="py-6 text-center text-sm text-text-faint">Loading…</p>
            ) : !stats || stats.byPurpose.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-faint">No data yet.</p>
            ) : (
              stats.byPurpose
                .slice()
                .sort((a, b) => b.count - a.count)
                .map((row) => (
                  <div key={row.purpose}>
                    <div className="flex items-center justify-between gap-2 text-xs text-text-muted">
                      <span className="min-w-0 truncate">{purposeLabel(row.purpose)}</span>
                      <span className="shrink-0 font-medium text-text">
                        {COUNT_FORMAT.format(row.count)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-surface-raised">
                      <div
                        className="h-1.5 rounded-full bg-primary"
                        style={{ width: `${Math.max(4, (row.count / maxPurposeCount) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
            )}
          </div>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-text">Recent sends</h2>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <SearchInput onSearch={handleSearch} placeholder="Search by phone…" className="w-full sm:w-64" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="all">All statuses</option>
            <option value="success">Delivered</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={purposeFilter}
            onChange={(e) => {
              setPurposeFilter(e.target.value);
              setPage(1);
            }}
            className={selectClass}
          >
            <option value="all">All purposes</option>
            <option value="otp_register">OTP: Register</option>
            <option value="otp_login">OTP: Login</option>
            <option value="otp_reset">OTP: Reset password</option>
            <option value="admin">Admin (manual)</option>
          </select>
          {logsQuery.isFetching && !logsQuery.isLoading && (
            <span className="flex items-center gap-1.5 text-xs text-text-faint">
              <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
              Updating…
            </span>
          )}
        </div>

        {logsQuery.isError && (
          <p className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            Failed to load SMS logs. Please refresh.
          </p>
        )}

        <div
          className={clsx(
            'overflow-x-auto rounded-xl border border-border bg-surface transition-opacity',
            logsQuery.isFetching && !logsQuery.isLoading && 'opacity-60',
          )}
        >
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-text-faint">
                <SortableTh
                  label="Phone"
                  sortKey="phone"
                  activeSortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                />
                <th className="px-4 py-3 font-medium">Purpose</th>
                <th className="px-4 py-3 font-medium">Provider</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Error</th>
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
              {logsQuery.isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-text-faint">
                    Loading SMS logs…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-text-faint">
                    No SMS logs match these filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-text">{log.phone}</td>
                    <td className="px-4 py-3 text-text-muted">{purposeLabel(log.purpose)}</td>
                    <td className="px-4 py-3 capitalize text-text-muted">{log.provider}</td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[log.status]}>
                        {log.status === 'success' ? 'Delivered' : 'Failed'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-text-faint">
                      {log.errorMessage ?? <span className="text-text-faint">—</span>}
                    </td>
                    <td className="px-4 py-3 text-text-faint">
                      {new Date(log.createdAt).toLocaleString('en-US', {
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

          {logsQuery.data && logsQuery.data.total > 0 && (
            <div className="px-4">
              <Pagination page={page} pageSize={PAGE_SIZE} total={logsQuery.data.total} onPageChange={setPage} />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
