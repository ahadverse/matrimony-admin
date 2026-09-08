import { apiClient } from './client';
import type {
  AdminCreateUserPayload,
  AdminSettings,
  AdminStats,
  AdminUpdateUserPayload,
  AdminUserDetail,
  AdminUserFilterOptions,
  AdminUserRecord,
  AssistantRequest,
  AssistantRequestStatus,
  ContactMessage,
  ContactMessageStatus,
  Gender,
  LoginResponse,
  MaritalStatus,
  Paginated,
  Photo,
  Profile,
  SmsLog,
  SmsLogStatus,
  SmsStats,
  SortOrder,
  SupportConversation,
  SupportMessage,
  UserStatus,
  VerificationStatus,
  VerificationSubmission,
  WalletTransaction,
} from './types';

/**
 * What a bulk delete actually did. `deleted` can be lower than `requested`
 * when a row went away between the page loading and the button being pressed,
 * or when the server refused one (an admin account, say), so the UI reports
 * these numbers rather than assuming the whole selection went.
 */
export interface BulkDeleteResult {
  requested: number;
  deleted: number;
  skipped: { id: string; reason: string }[];
}

// POST, not DELETE: the id list goes in the body, and DELETE-with-a-body is
// unreliable through proxies. Mirrors the admin controller's bulk-delete routes.
function bulkDelete(path: string, ids: string[]): Promise<BulkDeleteResult> {
  return apiClient
    .post<BulkDeleteResult>(`/admin/${path}/bulk-delete`, { ids })
    .then((r) => r.data);
}

export const bulkDeleteUsers = (ids: string[]) => bulkDelete('users', ids);
export const bulkDeleteProfiles = (ids: string[]) => bulkDelete('profiles', ids);
export const bulkDeleteVerifications = (ids: string[]) => bulkDelete('verifications', ids);
export const bulkDeleteTransactions = (ids: string[]) => bulkDelete('transactions', ids);
export const bulkDeleteAssistantRequests = (ids: string[]) => bulkDelete('assistant-requests', ids);
export const bulkDeleteContactMessages = (ids: string[]) => bulkDelete('contact-messages', ids);
export const bulkDeleteSmsLogs = (ids: string[]) => bulkDelete('sms/logs', ids);

export function login(phone: string, password: string): Promise<LoginResponse> {
  return apiClient
    .post<LoginResponse>('/auth/login', { identifier: phone, password })
    .then((r) => r.data);
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
  district?: string;
  subDistrict?: string;
  maritalStatus?: MaritalStatus;
  education?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export function getUsers(params: ListUsersParams): Promise<Paginated<AdminUserRecord>> {
  return apiClient.get<Paginated<AdminUserRecord>>('/admin/users', { params }).then((r) => r.data);
}

/** Passing a district narrows `subDistricts` to that district — the two dropdowns are dependent. */
export function getUserFilterOptions(district?: string): Promise<AdminUserFilterOptions> {
  return apiClient
    .get<AdminUserFilterOptions>('/admin/users/filter-options', {
      params: district ? { district } : undefined,
    })
    .then((r) => r.data);
}

export function getUserDetail(id: string): Promise<AdminUserDetail> {
  return apiClient.get<AdminUserDetail>(`/admin/users/${id}`).then((r) => r.data);
}

export function createUser(payload: AdminCreateUserPayload): Promise<AdminUserDetail> {
  return apiClient.post<AdminUserDetail>('/admin/users', payload).then((r) => r.data);
}

export function updateUser(id: string, payload: AdminUpdateUserPayload): Promise<AdminUserDetail> {
  return apiClient.patch<AdminUserDetail>(`/admin/users/${id}`, payload).then((r) => r.data);
}

export function deleteUser(id: string): Promise<void> {
  return apiClient.delete(`/admin/users/${id}`).then(() => undefined);
}

export function banUser(id: string): Promise<void> {
  return apiClient.post(`/admin/users/${id}/ban`).then(() => undefined);
}

export function unbanUser(id: string): Promise<void> {
  return apiClient.post(`/admin/users/${id}/unban`).then(() => undefined);
}

export function addUserPhoto(id: string, file: File): Promise<Photo> {
  const form = new FormData();
  form.append('file', file);
  return apiClient
    .post<Photo>(`/admin/users/${id}/photos`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
}

export function deleteUserPhoto(id: string, photoId: string): Promise<void> {
  return apiClient.delete(`/admin/users/${id}/photos/${photoId}`).then(() => undefined);
}

export function setUserPrimaryPhoto(id: string, photoId: string): Promise<void> {
  return apiClient.patch(`/admin/users/${id}/photos/${photoId}/primary`).then(() => undefined);
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

export function getPendingManualTopups(
  page: number,
  pageSize: number,
): Promise<Paginated<WalletTransaction>> {
  return apiClient
    .get<Paginated<WalletTransaction>>('/admin/transactions/pending-bkash', {
      params: { page, pageSize },
    })
    .then((r) => r.data);
}

export function approveManualTopup(id: string): Promise<void> {
  return apiClient.post(`/admin/transactions/${id}/approve`).then(() => undefined);
}

export function rejectManualTopup(id: string, reason: string): Promise<void> {
  return apiClient
    .post(`/admin/transactions/${id}/reject`, { reason })
    .then(() => undefined);
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

export interface ListContactMessagesParams {
  page: number;
  pageSize: number;
  status?: ContactMessageStatus;
  search?: string;
}

export function getContactMessages(
  params: ListContactMessagesParams,
): Promise<Paginated<ContactMessage>> {
  return apiClient
    .get<Paginated<ContactMessage>>('/admin/contact-messages', { params })
    .then((r) => r.data);
}

export function updateContactMessageStatus(
  id: string,
  status: ContactMessageStatus,
): Promise<void> {
  return apiClient
    .patch(`/admin/contact-messages/${id}/status`, { status })
    .then(() => undefined);
}

export function getSupportConversations(): Promise<SupportConversation[]> {
  return apiClient.get<SupportConversation[]>('/admin/support/conversations').then((r) => r.data);
}

export function getSupportMessages(userId: string): Promise<Paginated<SupportMessage>> {
  return apiClient
    .get<Paginated<SupportMessage>>(`/admin/support/${userId}/messages`)
    .then((r) => r.data);
}

export function sendSupportReply(userId: string, body: string): Promise<SupportMessage> {
  return apiClient
    .post<SupportMessage>(`/admin/support/${userId}/messages`, { body })
    .then((r) => r.data);
}

export function getSettings(): Promise<AdminSettings> {
  return apiClient.get<AdminSettings>('/admin/settings').then((r) => r.data);
}

/** Whether outbound SMS is switched on server-side (`SMS_ENABLED`) — the compose form greys itself out when it isn't. */
export function getSmsStatus(): Promise<{ enabled: boolean }> {
  return apiClient.get<{ enabled: boolean }>('/admin/sms/status').then((r) => r.data);
}

export function sendSms(payload: { phone: string; message: string }): Promise<{ success: boolean }> {
  return apiClient.post<{ success: boolean }>('/admin/sms/send', payload).then((r) => r.data);
}

export function getSmsStats(): Promise<SmsStats> {
  return apiClient.get<SmsStats>('/admin/sms/stats').then((r) => r.data);
}

export interface ListSmsLogsParams {
  page: number;
  pageSize: number;
  status?: SmsLogStatus;
  purpose?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export function getSmsLogs(params: ListSmsLogsParams): Promise<Paginated<SmsLog>> {
  return apiClient.get<Paginated<SmsLog>>('/admin/sms/logs', { params }).then((r) => r.data);
}

export function updateSettings(payload: {
  profileViewCost?: number;
  minTopupAmount?: number;
  statVerifiedMembers?: string;
  statMatchesMade?: string;
  statDistrictsCovered?: string;
  statAverageRating?: string;
  statProfilesReviewedPercent?: string;
  whatsappNumber?: string;
  bkashMerchantNumber?: string;
  smsTemplateOtpRegister?: string;
  smsTemplateOtpLogin?: string;
  smsTemplateOtpReset?: string;
}): Promise<AdminSettings> {
  return apiClient.patch<AdminSettings>('/admin/settings', payload).then((r) => r.data);
}
