import { apiClient } from './client';
import type {
  AdminSettings,
  AdminStats,
  AdminUserRecord,
  LoginResponse,
  Paginated,
  Profile,
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

export function getPendingProfiles(page: number, pageSize: number): Promise<Paginated<Profile>> {
  return apiClient
    .get<Paginated<Profile>>('/admin/profiles/pending', { params: { page, pageSize } })
    .then((r) => r.data);
}

export function approveProfile(id: string): Promise<void> {
  return apiClient.post(`/admin/profiles/${id}/approve`).then(() => undefined);
}

export function rejectProfile(id: string, reason: string): Promise<void> {
  return apiClient.post(`/admin/profiles/${id}/reject`, { reason }).then(() => undefined);
}

export function getVerificationSubmissions(
  page: number,
  pageSize: number,
  status?: VerificationStatus,
): Promise<Paginated<VerificationSubmission>> {
  return apiClient
    .get<Paginated<VerificationSubmission>>('/admin/verifications', { params: { page, pageSize, status } })
    .then((r) => r.data);
}

export function approveVerification(id: string): Promise<void> {
  return apiClient.post(`/admin/verifications/${id}/approve`).then(() => undefined);
}

export function rejectVerification(id: string, reason: string): Promise<void> {
  return apiClient.post(`/admin/verifications/${id}/reject`, { reason }).then(() => undefined);
}

export function getUsers(
  page: number,
  pageSize: number,
  status?: UserStatus,
): Promise<Paginated<AdminUserRecord>> {
  return apiClient
    .get<Paginated<AdminUserRecord>>('/admin/users', { params: { page, pageSize, status } })
    .then((r) => r.data);
}

export function banUser(id: string): Promise<void> {
  return apiClient.post(`/admin/users/${id}/ban`).then(() => undefined);
}

export function unbanUser(id: string): Promise<void> {
  return apiClient.post(`/admin/users/${id}/unban`).then(() => undefined);
}

export function adjustWallet(id: string, amount: number, reason?: string): Promise<void> {
  return apiClient.post(`/admin/users/${id}/wallet-adjust`, { amount, reason }).then(() => undefined);
}

export function getTransactions(
  page: number,
  pageSize: number,
): Promise<Paginated<WalletTransaction>> {
  return apiClient
    .get<Paginated<WalletTransaction>>('/admin/transactions', { params: { page, pageSize } })
    .then((r) => r.data);
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
