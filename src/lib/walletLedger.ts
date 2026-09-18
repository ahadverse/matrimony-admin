import type { TransactionType } from '../api/types';

/**
 * One wallet ledger, split across two admin screens.
 *
 * `CREDIT_TYPES` is money arriving in a wallet — what the Transactions page is
 * for. `EXPENSE_TYPES` is what members spend it on, which has its own page
 * because the two are read for different reasons: payments are reconciled
 * against bKash, spending is looked at to see what people actually buy.
 *
 * Every member of `TransactionType` belongs to exactly one of the two, so
 * nothing can fall between the pages and become invisible. The test at the
 * bottom of this file's usage — `assertExhaustive` below — is what keeps that
 * true when a new type is added.
 */
export const CREDIT_TYPES = [
  'topup',
  'refund',
  // An admin crediting or debiting a wallet by hand: a correction to the money
  // side, not something a member chose to buy.
  'admin_adjust',
] as const satisfies readonly TransactionType[];

export const EXPENSE_TYPES = [
  'view_unlock',
  'spotlight',
  'assistance_service',
] as const satisfies readonly TransactionType[];

export const TYPE_LABEL: Record<TransactionType, string> = {
  topup: 'Top-up',
  refund: 'Refund',
  admin_adjust: 'Admin adjustment',
  view_unlock: 'View unlock',
  spotlight: 'Spotlight',
  assistance_service: 'Assistance service',
};

/**
 * Fails to compile if a new TransactionType is added without being sorted into
 * one of the two lists above — which would otherwise drop it off both pages
 * silently.
 */
type Covered = (typeof CREDIT_TYPES)[number] | (typeof EXPENSE_TYPES)[number];
type Uncovered = Exclude<TransactionType, Covered>;
const _assertEveryTypeIsOnAPage: Uncovered extends never ? true : never = true;
void _assertEveryTypeIsOnAPage;
