export type Gender = 'male' | 'female';
export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'banned';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type TransactionType = 'topup' | 'view_unlock' | 'refund' | 'admin_adjust' | 'spotlight';
export type TransactionStatus = 'pending' | 'success' | 'failed';
export type PaymentProvider = 'bkash' | 'nagad';
export type PaymentVerificationMethod = 'automatic' | 'manual';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';
export type AssistantRequestStatus = 'pending' | 'contacted' | 'closed';

export type ContactMessageStatus = 'new' | 'read' | 'replied';

export interface ContactMessage {
  id: string;
  name: string;
  phone: string | null;
  email: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  createdAt: string;
}

export type SortOrder = 'ASC' | 'DESC';

export interface AssistantRequest {
  id: string;
  name: string;
  phone: string;
  email: string;
  profileId: string | null;
  status: AssistantRequestStatus;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  phone: string;
  gender: Gender | null;
  role: UserRole;
  status: UserStatus;
  walletBalance: number;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface Photo {
  id: string;
  url: string;
  blurredUrl: string | null;
  isPrimary: boolean;
  order: number;
}

export interface ProfileOwner {
  id: string;
  phone: string;
  gender: Gender | null;
  dob: string;
  role?: UserRole;
  status?: UserStatus;
  walletBalance?: number;
  createdAt?: string;
}

export interface Profile {
  id: string;
  userId: string;
  /** Shown to other members wherever the real name is withheld. */
  publicId: string | null;
  name: string;
  relativeName: string | null;
  nationality: string | null;
  district: string | null;
  subDistrict: string | null;
  bio: string | null;
  profession: string | null;
  education: string | null;
  religion: string | null;
  heightCm: number | null;
  maritalStatus: string | null;
  profileCreatedBy: string | null;
  fatherOccupation: string | null;
  motherOccupation: string | null;
  siblingsCount: number | null;
  bloodGroup: string | null;
  complexion: string | null;
  monthlyIncome: number | null;
  companyName: string | null;
  presentAddress: string | null;
  permanentAddress: string | null;
  approvalStatus: ApprovalStatus;
  rejectionReason: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  motherTongue: string | null;
  englishComfort: string | null;
  residencyStatus: string | null;
  growUpIn: string | null;
  collegeUniversity: string | null;
  partnerPreferences: string | null;
  hobbies: string | null;
  familyFinancialStatus: string | null;
  bodyType: string | null;
  numberOfSisters: number | null;
  numberOfBrothers: number | null;
  educationDetails: string | null;
  workingSector: string | null;
  professionDetails: string | null;
  incomeIsPrivate: boolean;
  fatherStatus: string | null;
  motherStatus: string | null;
  brothersMarried: number | null;
  brothersUnmarried: number | null;
  sistersMarried: number | null;
  sistersUnmarried: number | null;
  familyDetails: string | null;
  weightKg: number | null;
  physicalDetails: string | null;
  religiousValue: string | null;
  familyValues: string | null;
  diet: string | null;
  smoke: string | null;
  photos: Photo[];
  user: ProfileOwner;
  createdAt: string;
}

export interface AdminUserRecord {
  id: string;
  phone: string;
  gender: Gender | null;
  dob: string;
  role: UserRole;
  status: UserStatus;
  walletBalance: number;
  languagePref: string;
  profile: Omit<Profile, 'user' | 'photos'> | null;
  createdAt: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  provider: PaymentProvider | null;
  providerTransactionId: string | null;
  payerAccountNumber: string | null;
  verificationMethod: PaymentVerificationMethod;
  status: TransactionStatus;
  createdAt: string;
  user?: { id: string; phone: string; name: string | null } | null;
}

export type SupportSenderRole = 'user' | 'admin';

export interface SupportMessage {
  id: string;
  userId: string;
  senderId: string;
  senderRole: SupportSenderRole;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface SupportConversation {
  userId: string;
  user: { id: string; phone: string; name: string | null };
  lastMessage: { body: string; senderRole: SupportSenderRole; createdAt: string } | null;
  unreadCount: number;
}

export interface AdminSettings {
  id: string;
  profileViewCost: number;
  minTopupAmount: number;
  statVerifiedMembers: string;
  statMatchesMade: string;
  statDistrictsCovered: string;
  statAverageRating: string;
  statProfilesReviewedPercent: string;
  whatsappNumber: string | null;
  bkashMerchantNumber: string;
  updatedAt: string;
}

export interface VerificationSubmissionUser {
  id: string;
  phone: string;
  name: string | null;
  isVerified: boolean;
}

export interface VerificationSubmission {
  id: string;
  userId: string;
  nidNumber: string;
  selfieUrl: string;
  status: VerificationStatus;
  rejectionReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user: VerificationSubmissionUser | null;
}

/** Bare identity-verification record as returned inline by the user detail endpoint (no nested `user`). */
export interface IdentityVerificationRecord {
  id: string;
  userId: string;
  nidNumber: string;
  selfieUrl: string;
  status: VerificationStatus;
  rejectionReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface AdminUserDetailUser {
  id: string;
  phone: string;
  email: string | null;
  gender: Gender | null;
  dob: string | null;
  role: UserRole;
  status: UserStatus;
  walletBalance: number;
  languagePref: string;
  lastActiveAt: string | null;
  createdAt: string;
}

export interface AdminUserDetail {
  user: AdminUserDetailUser;
  profile: Profile | null;
  verification: IdentityVerificationRecord | null;
  recentTransactions: WalletTransaction[];
}

export interface AdminStats {
  totalUsers: number;
  pendingApprovals: number;
  todaySignups: number;
  totalRevenue: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
