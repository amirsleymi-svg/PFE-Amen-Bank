export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errorCode?: string;
  timestamp: string;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phone: string;
  role: 'CLIENT' | 'EMPLOYEE' | 'ADMIN';
  status: 'PENDING' | 'ACTIVE' | 'DISABLED' | 'LOCKED';
  twoFactorEnabled: boolean;
  rootAdmin?: boolean;
  createdAt: string;
  lastLoginAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface BankAccount {
  id: number;
  accountNumber: string;
  iban: string;
  balance: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface Transaction {
  id: number;
  reference: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  sourceAccountIban: string;
  destinationAccountIban: string;
  destinationExternalIban: string;
  description: string;
  initiatedByName: string;
  approvedByName: string;
  executedAt: string;
  createdAt: string;
}

export interface CreditScheduleEntry {
  month: number;
  dueDate: string;
  payment: number;
  principalPart: number;
  interestPart: number;
  remainingBalance: number;
}

export interface CreditSimulation {
  amount: number;
  durationMonths: number;
  interestRate: number;
  monthlyPayment: number;
  totalCost: number;
  totalInterest: number;
  schedule?: CreditScheduleEntry[];
}

export interface SecurityIncident {
  id: number;
  action: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  userId: number | null;
  userEmail: string | null;
  username: string | null;
  userStatus: string | null;
  createdAt: string;
}

export interface SuspiciousUser {
  userId: number | null;
  email: string;
  username: string;
  status: string;
  failedLoginCount: number;
  unauthorizedCount: number;
  lastIncidentAt: string;
  lastIp: string;
}

export interface BlockedIp {
  id: number;
  ipAddress: string;
  reason: string | null;
  blockedByName: string | null;
  blockedAt: string;
  active: boolean;
}

export interface CreditRequest {
  id: number;
  amount: number;
  durationMonths: number;
  interestRate: number;
  monthlyPayment: number;
  totalCost: number;
  purpose: string;
  status: string;
  clientName: string;
  reviewedByName: string;
  decisionComment: string;
  reviewedAt: string;
  createdAt: string;
}

export interface RegistrationRequest {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  reviewedByName: string;
  decisionComment: string;
  reviewedAt: string;
  createdAt: string;
}

export interface PasswordResetRequest {
  id: number;
  userName: string;
  userEmail: string;
  status: string;
  reviewedByName: string;
  decisionComment: string;
  reviewedAt: string;
  completedAt: string | null;
  createdAt: string;
  source: 'SELF_SERVICE' | 'ADMIN';
}

export interface PasswordResetStats {
  total: number;
  pending: number;
  approved: number;
  completed: number;
  rejected: number;
  last24h: number;
}

export interface AuditLog {
  id: number;
  userName: string;
  action: string;
  entityType: string;
  entityId: number;
  details: string;
  ipAddress: string;
  createdAt: string;
}

export interface DailyReport {
  id: number;
  employeeName: string;
  reportDate: string;
  title: string;
  content: string;
  status: string;
  reviewedByName: string;
  reviewComment: string;
  rating: number | null;
  createdAt: string;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' | 'TRANSFER' | 'CREDIT' | 'FRAUD' | 'CARD' | 'REPORT';
  isRead: boolean;
  createdAt: string;
}

export interface AccountCard {
  id: number;
  cardNumberMasked: string;
  expiryDate: string;
  status: 'ACTIVE' | 'DISABLED' | 'EXPIRED';
  balance: number;
  accountId: number;
  accountIban: string;
  createdAt: string;
}

export type CardTransferDirection = 'ACCOUNT_TO_CARD' | 'CARD_TO_ACCOUNT';

export interface FraudAlert {
  id: number;
  transactionId: number;
  transactionReference: string;
  transactionAmount: number;
  alertType: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED';
  detectedAt: string;
  reviewedByName: string;
  reviewComment: string;
  reviewedAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalClients: number;
  totalEmployees: number;
  totalAdmins: number;
  activeUsers: number;
  disabledUsers: number;
  pendingUsers: number;
  pendingRegistrations: number;
  pendingTransfers: number;
  pendingCredits: number;
  pendingPasswordResets: number;
  openFraudAlerts: number;
  totalBalance: number;
}

// === Chatbot ===

export interface ChatConversation {
  id: number;
  title: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ChatConversationDetail {
  id: number;
  title: string;
  is_active: boolean;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface ChatResponse {
  conversation_id: number;
  message: ChatMessage;
}
