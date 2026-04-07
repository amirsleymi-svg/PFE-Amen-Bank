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

export interface CreditSimulation {
  amount: number;
  durationMonths: number;
  interestRate: number;
  monthlyPayment: number;
  totalCost: number;
  totalInterest: number;
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
  createdAt: string;
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
  createdAt: string;
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';
  isRead: boolean;
  createdAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalClients: number;
  totalEmployees: number;
  pendingRegistrations: number;
  pendingTransfers: number;
  pendingCredits: number;
  pendingPasswordResets: number;
  totalBalance: number;
}
