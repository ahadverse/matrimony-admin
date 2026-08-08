import { apiClient } from './client';
import type {
  AdminSettings,
  AdminStats,
  AdminUserDetail,
  AdminUserRecord,
  AssistantRequest,
  AssistantRequestStatus,
  Gender,
  LoginResponse,
  Paginated,
  Profile,
  SortOrder,
  UserStatus,
  VerificationStatus,
  VerificationSubmission,
  WalletTransaction,
} from './types';

export function login(phone: string, password: string): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>('/auth/login', { phone, password }).then((r) => r.data);
}

export function getStats(): Promise<AdminStats> {
  return apiClient.get<AdminStats>('/admin/stats').then((r) => r.data);
}

export interface ListPendingProfilesParams {
  page: number;
  pageSize: number;
  gender?: Gender;
  search?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export function getPendingProfiles(
  params: ListPendingProfilesParams,
): Promise<Paginated<Profile>> {
  return apiClient
    .get<Paginated<Profile>>('/admin/profiles/pending', { params })
    .then((r) => r.data);
}

export function approveProfile(id: string): Promise<void> {
  return apiClient.post(`/admin/profiles/${id}/approve`).then(() => undefined);
}

export function rejectProfile(id: string, reason: string): Promise<void> {
  return apiClient.post(`/admin/profiles/${id}/reject`, { reason }).then(() => undefined);
}

export interface ListVerificationSubmissionsParams {
  page: number;
  pageSize: number;
  status?: VerificationStatus;
  search?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export function getVerificationSubmissions(
  params: ListVerificationSubmissionsParams,
): Promise<Paginated<VerificationSubmission>> {
  return apiClient
    .get<Paginated<VerificationSubmission>>('/admin/verifications', { params })
    .then((r) => r.data);
}

export function approveVerification(id: string): Promise<void> {
  return apiClient.post(`/admin/verifications/${id}/approve`).then(() => undefined);
}

export function rejectVerification(id: string, reason: string): Promise<void> {
  return apiClient.post(`/admin/verifications/${id}/reject`, { reason }).then(() => undefined);
}

function parseExportFilename(contentDisposition: unknown, fallback: string): string {
  if (typeof contentDisposition !== 'string') return fallback;
  const match = /filename="?([^";]+)"?/.exec(contentDisposition);
  return match?.[1] ?? fallback;
}

/** Downloads the verification-documents ZIP (one folder per user) via an authenticated blob fetch. */
export async function exportVerifications(status?: VerificationStatus): Promise<void> {
  const res = await apiClient.get('/admin/verifications/export', {
    params: status ? { status } : undefined,
    responseType: 'blob',
  });
  const filename = parseExportFilename(
    res.headers['content-disposition'],
    `verifications-export-${new Date().toISOString().slice(0, 10)}.zip`,
  );
  const url = URL.createObjectURL(res.data as Blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export interface ListUsersParams {
  page: number;
  pageSize: number;
  status?: UserStatus;
  gender?: Gender;
  verified?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export function getUsers(params: ListUsersParams): Promise<Paginated<AdminUserRecord>> {
  return apiClient.get<Paginated<AdminUserRecord>>('/admin/users', { params }).then((r) => r.data);
}

export function getUserDetail(id: string): Promise<AdminUserDetail> {
  return apiClient.get<AdminUserDetail>(`/admin/users/${id}`).then((r) => r.data);
}

export function banUser(id: string): Promise<void> {
  return apiClient.post(`/admin/users/${id}/ban`).then(() => undefined);
}

export function unbanUser(id: string): Promise<void> {
  return apiClient.post(`/admin/users/${id}/unban`).then(() => undefined);
}

export function adjustWallet(id: string, amount: number, reason?: string): Promise<void> {
  return apiClient
    .post(`/admin/users/${id}/wallet-adjust`, { amount, reason })
    .then(() => undefined);
}

export interface ListTransactionsParams {
  page: number;
  pageSize: number;
  userId?: string;
  type?: string;
  status?: string;
  search?: string;
  from?: string;
  to?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export function getTransactions(
  params: ListTransactionsParams,
): Promise<Paginated<WalletTransaction>> {
  return apiClient
    .get<Paginated<WalletTransaction>>('/admin/transactions', { params })
    .then((r) => r.data);
}

export interface ListAssistantRequestsParams {
  page: number;
  pageSize: number;
  status?: AssistantRequestStatus;
  search?: string;
}

export function getAssistantRequests(
  params: ListAssistantRequestsParams,
): Promise<Paginated<AssistantRequest>> {
  return apiClient
    .get<Paginated<AssistantRequest>>('/admin/assistant-requests', { params })
    .then((r) => r.data);
}

export function updateAssistantRequestStatus(
  id: string,
  status: AssistantRequestStatus,
): Promise<void> {
  return apiClient
    .patch(`/admin/assistant-requests/${id}/status`, { status })
    .then(() => undefined);
}

export function getSettings(): Promise<AdminSettings> {
  return apiClient.get<AdminSettings>('/admin/settings').then((r) => r.data);
}

export function sendSms(payload: { phone: string; message: string }): Promise<{ success: boolean }> {
  return apiClient.post<{ success: boolean }>('/admin/sms/send', payload).then((r) => r.data);
}

export function updateSettings(payload: {
  profileViewCost?: number;
  minTopupAmount?: number;
  statVerifiedMembers?: string;
  statMatchesMade?: string;
  statDistrictsCovered?: string;
  statAverageRating?: string;
  statProfilesReviewedPercent?: string;
}): Promise<AdminSettings> {
  return apiClient.patch<AdminSettings>('/admin/settings', payload).then((r) => r.data);
}
