import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { getTransactions } from '../api/admin';
import { Badge } from '../components/Badge';
import { Pagination } from '../components/Pagination';
import type { BadgeTone } from '../components/Badge';
import type { TransactionStatus } from '../api/types';

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
};

export function Transactions() {
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['admin', 'transactions', page],
    queryFn: () => getTransactions(page, PAGE_SIZE),
    placeholderData: (prev) => prev,
  });

  const transactions = query.data?.items ?? [];

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-text">Transactions</h1>
        <p className="mt-1 text-sm text-text-faint">Wallet activity across the platform</p>
      </header>

      {query.isError && (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          Failed to load transactions. Please refresh.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-text-faint">
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Balance after</th>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-text-faint">
                  Loading transactions…
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-text-faint">
                  No transactions yet.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-border last:border-0">
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
