import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, BankAccount, Transaction, CreditSimulation, CreditRequest, RegistrationRequest, PasswordResetRequest, PasswordResetStats, AuditLog, DailyReport, DashboardStats, User, Notification, AccountCard, CardTransferDirection, FraudAlert, ChatConversation, ChatConversationDetail, ChatResponse, SecurityIncident, SuspiciousUser, BlockedIp } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly API = 'https://localhost:8443/api';
  private readonly CHATBOT_API = 'https://localhost:8000/api/chatbot';

  constructor(private http: HttpClient) {}

  // === Registration ===
  register(data: any): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/registration-requests`, data);
  }

  // === Client: Accounts ===
  getAccounts(): Observable<ApiResponse<BankAccount[]>> {
    return this.http.get<ApiResponse<BankAccount[]>>(`${this.API}/client/accounts`);
  }

  getAccountTransactions(accountId: number, page = 0, size = 20): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API}/client/accounts/${accountId}/transactions`, {
      params: new HttpParams().set('page', page).set('size', size)
    });
  }

  requestCard(accountId: number): Observable<ApiResponse<AccountCard>> {
    return this.http.post<ApiResponse<AccountCard>>(`${this.API}/client/cards/request`, { accountId });
  }

  cardTransfer(cardId: number, direction: CardTransferDirection, amount: number): Observable<ApiResponse<AccountCard>> {
    return this.http.post<ApiResponse<AccountCard>>(`${this.API}/client/cards/${cardId}/transfer`, { direction, amount });
  }

  // === Client: Transfers ===
  simpleTransfer(data: any): Observable<ApiResponse<Transaction>> {
    return this.http.post<ApiResponse<Transaction>>(`${this.API}/client/transfers/simple`, data);
  }

  groupedTransfer(data: any): Observable<ApiResponse<Transaction>> {
    return this.http.post<ApiResponse<Transaction>>(`${this.API}/client/transfers/grouped`, data);
  }

  permanentTransfer(data: any): Observable<ApiResponse<Transaction>> {
    return this.http.post<ApiResponse<Transaction>>(`${this.API}/client/transfers/permanent`, data);
  }

  getClientTransfers(page = 0, size = 20): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API}/client/transfers`, {
      params: new HttpParams().set('page', page).set('size', size)
    });
  }

  requestTransfer2fa(): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/client/transfers/request-2fa`, {});
  }

  // === Client: Credits ===
  simulateCredit(amount: number, durationMonths: number, interestRate?: number): Observable<ApiResponse<CreditSimulation>> {
    const body: any = { amount, durationMonths };
    if (interestRate !== undefined && interestRate !== null) body.interestRate = interestRate;
    return this.http.post<ApiResponse<CreditSimulation>>(`${this.API}/client/credits/simulate`, body);
  }

  requestCredit(data: any): Observable<ApiResponse<CreditRequest>> {
    return this.http.post<ApiResponse<CreditRequest>>(`${this.API}/client/credits/request`, data);
  }

  getClientCredits(page = 0, size = 20): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API}/client/credits`, {
      params: new HttpParams().set('page', page).set('size', size)
    });
  }

  // === Employee ===
  getPendingTransfersEmployee(page = 0): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API}/employee/transfers/pending`, { params: new HttpParams().set('page', page) });
  }

  approveTransferEmployee(id: number, comment?: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/employee/transfers/${id}/approve`, { comment });
  }

  rejectTransferEmployee(id: number, comment?: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/employee/transfers/${id}/reject`, { comment });
  }

  getPendingCreditsEmployee(page = 0): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API}/employee/credits/pending`, { params: new HttpParams().set('page', page) });
  }

  approveCreditEmployee(id: number, comment?: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/employee/credits/${id}/approve`, { comment });
  }

  rejectCreditEmployee(id: number, comment?: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/employee/credits/${id}/reject`, { comment });
  }

  activateClientEmployee(id: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/employee/clients/${id}/activate`, {});
  }

  deactivateClientEmployee(id: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/employee/clients/${id}/deactivate`, {});
  }

  createDailyReport(data: any): Observable<ApiResponse<DailyReport>> {
    return this.http.post<ApiResponse<DailyReport>>(`${this.API}/employee/reports/daily`, data);
  }

  getMyReports(page = 0): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API}/employee/reports/my`, { params: new HttpParams().set('page', page) });
  }

  autoGenerateDailyReport(date?: string): Observable<ApiResponse<DailyReport>> {
    return this.http.post<ApiResponse<DailyReport>>(`${this.API}/employee/reports/daily/auto-generate`, date ? { date } : {});
  }

  // === Admin ===
  getDashboardStats(): Observable<ApiResponse<DashboardStats>> {
    return this.http.get<ApiResponse<DashboardStats>>(`${this.API}/admin/dashboard`);
  }

  getUsers(page = 0, role?: string): Observable<ApiResponse> {
    let params = new HttpParams().set('page', page);
    if (role) params = params.set('role', role);
    return this.http.get<ApiResponse>(`${this.API}/admin/users`, { params });
  }

  getUserById(id: number): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.API}/admin/users/${id}`);
  }

  createUser(data: any): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(`${this.API}/admin/users`, data);
  }

  updateUser(id: number, data: any): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>(`${this.API}/admin/users/${id}`, data);
  }

  deleteUser(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.API}/admin/users/${id}`);
  }

  changeUserRole(id: number, role: string): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>(`${this.API}/admin/users/${id}/role`, { role });
  }

  activateUser(id: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/admin/users/${id}/activate`, {});
  }

  deactivateUser(id: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/admin/users/${id}/deactivate`, {});
  }

  getAdminBankAccounts(page = 0): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API}/admin/bank-accounts`, { params: new HttpParams().set('page', page).set('size', 50) });
  }

  activateBankAccount(id: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/admin/bank-accounts/${id}/activate`, {});
  }

  deactivateBankAccount(id: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/admin/bank-accounts/${id}/deactivate`, {});
  }

  getRegistrationRequests(page = 0): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API}/admin/registration-requests`, { params: new HttpParams().set('page', page) });
  }

  approveRegistration(id: number, comment?: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/admin/registration-requests/${id}/approve`, { comment });
  }

  rejectRegistration(id: number, comment?: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/admin/registration-requests/${id}/reject`, { comment });
  }

  getPasswordResetRequests(page = 0, status: string = 'ALL', size = 20): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API}/admin/password-reset-requests`, {
      params: new HttpParams().set('page', page).set('size', size).set('status', status)
    });
  }

  getPasswordResetStats(): Observable<ApiResponse<PasswordResetStats>> {
    return this.http.get<ApiResponse<PasswordResetStats>>(`${this.API}/admin/password-reset-requests/stats`);
  }

  approvePasswordReset(id: number, comment?: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/admin/password-reset-requests/${id}/approve`, { comment });
  }

  rejectPasswordReset(id: number, comment?: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/admin/password-reset-requests/${id}/reject`, { comment });
  }

  deletePasswordResetRequest(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.API}/admin/password-reset-requests/${id}`);
  }

  // === Admin: Transfer Monitoring (read-only) ===
  getAdminTransfers(page = 0, status?: string): Observable<ApiResponse> {
    let params = new HttpParams().set('page', page);
    if (status) params = params.set('status', status);
    return this.http.get<ApiResponse>(`${this.API}/admin/transfers`, { params });
  }

  // === Admin: Credit Monitoring (read-only) ===
  getAdminCredits(page = 0, status?: string): Observable<ApiResponse> {
    let params = new HttpParams().set('page', page);
    if (status) params = params.set('status', status);
    return this.http.get<ApiResponse>(`${this.API}/admin/credits`, { params });
  }

  getAuditLogs(page = 0): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API}/admin/audit-logs`, { params: new HttpParams().set('page', page) });
  }

  deleteAuditLog(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.API}/admin/audit-logs/${id}`);
  }

  deleteAllAuditLogs(): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.API}/admin/audit-logs`);
  }

  getDailyReports(page = 0): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API}/admin/reports/daily`, { params: new HttpParams().set('page', page) });
  }

  // === Client: Cards ===
  getClientCards(): Observable<ApiResponse<AccountCard[]>> {
    return this.http.get<ApiResponse<AccountCard[]>>(`${this.API}/client/cards`);
  }

  activateCard(id: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/client/cards/${id}/activate`, {});
  }

  deactivateCard(id: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/client/cards/${id}/deactivate`, {});
  }

  deleteCard(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.API}/client/cards/${id}`);
  }

  // === Employee: Balance ===
  getClientsWithAccounts(): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API}/employee/clients`);
  }

  increaseBalance(accountId: number, amount: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/employee/accounts/${accountId}/increase-balance`, { amount });
  }

  // === Admin: Fraud Alerts ===
  getFraudAlerts(page = 0, status?: string): Observable<ApiResponse> {
    let params = new HttpParams().set('page', page);
    if (status) params = params.set('status', status);
    return this.http.get<ApiResponse>(`${this.API}/admin/fraud-alerts`, { params });
  }

  updateFraudAlertStatus(id: number, status: string, comment?: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/admin/fraud-alerts/${id}/status`, { status, comment });
  }

  confirmFraudAndFreeze(id: number, comment?: string): Observable<ApiResponse<{ accountsDisabled: number; cardsDisabled: number; transactionsCancelled: number }>> {
    return this.http.post<ApiResponse<{ accountsDisabled: number; cardsDisabled: number; transactionsCancelled: number }>>(
      `${this.API}/admin/fraud-alerts/${id}/confirm-and-freeze`,
      { comment }
    );
  }

  // === Admin: Security incidents ===
  getSecurityIncidents(page = 0, size = 30): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API}/admin/security/incidents`, {
      params: new HttpParams().set('page', page).set('size', size)
    });
  }

  getSuspiciousUsers(hours = 24, threshold = 3): Observable<ApiResponse<SuspiciousUser[]>> {
    return this.http.get<ApiResponse<SuspiciousUser[]>>(`${this.API}/admin/security/suspicious-users`, {
      params: new HttpParams().set('hours', hours).set('threshold', threshold)
    });
  }

  blockSuspiciousUser(userId: number, reason?: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/admin/security/block/${userId}`, { reason });
  }

  getBlockedIps(): Observable<ApiResponse<BlockedIp[]>> {
    return this.http.get<ApiResponse<BlockedIp[]>>(`${this.API}/admin/security/blocked-ips`);
  }

  blockIp(ip: string, reason?: string): Observable<ApiResponse<BlockedIp>> {
    return this.http.post<ApiResponse<BlockedIp>>(`${this.API}/admin/security/block-ip`, { ip, reason });
  }

  unblockIp(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.API}/admin/security/block-ip/${id}`);
  }

  // === Admin: Report Review ===
  reviewReport(id: number, comment?: string, rating?: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/admin/reports/daily/${id}/review`, { comment, rating });
  }

  deleteDailyReport(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.API}/admin/reports/daily/${id}`);
  }

  // === Notifications ===
  getNotifications(page = 0): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API}/notifications`, { params: new HttpParams().set('page', page) });
  }

  getUnreadCount(): Observable<ApiResponse<{ count: number }>> {
    return this.http.get<ApiResponse<{ count: number }>>(`${this.API}/notifications/unread-count`);
  }

  markAsRead(id: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/notifications/${id}/read`, {});
  }

  markAllAsRead(): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/notifications/read-all`, {});
  }

  // === Chatbot (FastAPI microservice on port 8000) ===

  getChatbotHealth(): Observable<{ status: string; ollama: { available: boolean; model: string; url: string } }> {
    return this.http.get<any>(`${this.CHATBOT_API}/health`);
  }

  getChatConversations(): Observable<ChatConversation[]> {
    return this.http.get<ChatConversation[]>(`${this.CHATBOT_API}/conversations`);
  }

  getChatConversation(id: number): Observable<ChatConversationDetail> {
    return this.http.get<ChatConversationDetail>(`${this.CHATBOT_API}/conversations/${id}`);
  }

  createChatConversation(): Observable<ChatConversation> {
    return this.http.post<ChatConversation>(`${this.CHATBOT_API}/conversations`, {});
  }

  deleteChatConversation(id: number): Observable<any> {
    return this.http.delete(`${this.CHATBOT_API}/conversations/${id}`);
  }

  sendChatMessage(conversationId: number | null, message: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.CHATBOT_API}/chat`, {
      conversation_id: conversationId,
      message
    });
  }
}
