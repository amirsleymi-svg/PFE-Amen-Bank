import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse, BankAccount, Transaction, CreditSimulation, CreditRequest, RegistrationRequest, PasswordResetRequest, AuditLog, DailyReport, DashboardStats, User, Notification } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly API = 'http://localhost:8080/api';

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

  linkCard(data: any): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/client/accounts/link-card`, data);
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
  simulateCredit(amount: number, durationMonths: number): Observable<ApiResponse<CreditSimulation>> {
    return this.http.post<ApiResponse<CreditSimulation>>(`${this.API}/client/credits/simulate`, { amount, durationMonths });
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

  getRegistrationRequests(page = 0): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API}/admin/registration-requests`, { params: new HttpParams().set('page', page) });
  }

  approveRegistration(id: number, comment?: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/admin/registration-requests/${id}/approve`, { comment });
  }

  rejectRegistration(id: number, comment?: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/admin/registration-requests/${id}/reject`, { comment });
  }

  getPasswordResetRequests(page = 0): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API}/admin/password-reset-requests`, { params: new HttpParams().set('page', page) });
  }

  approvePasswordReset(id: number, comment?: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/admin/password-reset-requests/${id}/approve`, { comment });
  }

  rejectPasswordReset(id: number, comment?: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/admin/password-reset-requests/${id}/reject`, { comment });
  }

  getPendingTransfersAdmin(page = 0): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API}/admin/transfers/pending`, { params: new HttpParams().set('page', page) });
  }

  approveTransferAdmin(id: number, comment?: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/admin/transfers/${id}/approve`, { comment });
  }

  rejectTransferAdmin(id: number, comment?: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/admin/transfers/${id}/reject`, { comment });
  }

  getPendingCreditsAdmin(page = 0): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.API}/admin/credits/pending`, { params: new HttpParams().set('page', page) });
  }

  approveCreditAdmin(id: number, comment?: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/admin/credits/${id}/approve`, { comment });
  }

  rejectCreditAdmin(id: number, comment?: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API}/admin/credits/${id}/reject`, { comment });
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

  // === Chatbot ===
  chatbotMessage(message: string): Observable<ApiResponse<{ reply: string }>> {
    return this.http.post<ApiResponse<{ reply: string }>>(`${this.API}/chatbot/message`, { message });
  }

  chatbotSuggestions(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.API}/chatbot/suggestions`);
  }
}
