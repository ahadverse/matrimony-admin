import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getStats, getTransactions } from '../api/admin';
import { StatCard } from '../components/StatCard';

const TAKA = new Intl.NumberFormat('en-BD');

export function Dashboard() {
  const statsQuery = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: getStats,
  });

  // Pulled purely to derive a real revenue-by-day chart; no synthetic data.
  const transactionsQuery = useQuery({
    queryKey: ['admin', 'transactions', 'for-dashboard-chart'],
    queryFn: () => getTransactions({ page: 1, pageSize: 200 }),
  });

  const revenueByDay = useMemo(() => {
    const items = transactionsQuery.data?.items ?? [];
    const successfulTopups = items.filter((t) => t.type === 'topup' && t.status === 'success');
    if (successfulTopups.length === 0) return [];

    const totals = new Map<string, number>();
    for (const tx of successfulTopups) {
      const day = new Date(tx.createdAt).toISOString().slice(0, 10);
      totals.set(day, (totals.get(day) ?? 0) + tx.amount);
    }

    return Array.from(totals.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, revenue]) => ({
        day: new Date(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue,
      }));
  }, [transactionsQuery.data]);

  const stats = statsQuery.data;

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-text">Dashboard</h1>
        <p className="mt-1 text-sm text-text-faint">Platform overview at a glance</p>
      </header>

      {statsQuery.isError && (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          Failed to load stats. Please refresh.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total users"
          value={statsQuery.isLoading ? '—' : TAKA.format(stats?.totalUsers ?? 0)}
          accent="primary"
        />
        <StatCard
          label="Pending approvals"
          value={statsQuery.isLoading ? '—' : TAKA.format(stats?.pendingApprovals ?? 0)}
          accent="gold"
          hint={stats && stats.pendingApprovals > 0 ? 'Needs review' : undefined}
        />
        <StatCard
          label="Today's signups"
          value={statsQuery.isLoading ? '—' : TAKA.format(stats?.todaySignups ?? 0)}
          accent="success"
        />
        <StatCard
          label="Total revenue"
          value={statsQuery.isLoading ? '—' : `৳${TAKA.format(stats?.totalRevenue ?? 0)}`}
        />
      </div>

      <section className="mt-8 rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-text">Revenue by day</h2>
        <p className="mt-0.5 text-xs text-text-faint">
          Successful wallet top-ups from recent transactions
        </p>

        <div className="mt-4">
          {transactionsQuery.isLoading ? (
            <p className="py-10 text-center text-sm text-text-faint">Loading…</p>
          ) : revenueByDay.length === 0 ? (
            <p className="py-10 text-center text-sm text-text-faint">
              Not enough transaction data yet to chart revenue.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={revenueByDay} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2c2032" vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="#7d6c8c"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#2c2032' }}
                />
                <YAxis
                  stroke="#7d6c8c"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `৳${TAKA.format(v)}`}
                  width={70}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(236,72,153,0.08)' }}
                  contentStyle={{
                    background: '#1e1626',
                    border: '1px solid #2c2032',
                    borderRadius: 8,
                    color: '#f5f1f8',
                    fontSize: 13,
                  }}
                  formatter={(value: number) => [`৳${TAKA.format(value)}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#ec4899" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
    </div>
  );
}
