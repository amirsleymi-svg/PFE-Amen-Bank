import { Routes } from '@angular/router';
import { roleGuard, guestGuard, landingGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent), canActivate: [landingGuard] },
  { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent), canActivate: [guestGuard] },
  { path: 'register', loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent), canActivate: [guestGuard] },
  { path: 'verify-2fa', loadComponent: () => import('./features/auth/verify-2fa/verify-2fa.component').then(m => m.Verify2faComponent), canActivate: [guestGuard] },
  { path: 'forgot-password', loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent), canActivate: [guestGuard] },
  { path: 'activate-account', loadComponent: () => import('./features/auth/activate-account/activate-account.component').then(m => m.ActivateAccountComponent) },
  { path: 'reset-password', loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) },

  // Client
  {
    path: 'client',
    canActivate: [roleGuard(['CLIENT'])],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./features/client/dashboard/dashboard.component').then(m => m.ClientDashboardComponent) },
      { path: 'accounts', loadComponent: () => import('./features/client/accounts/accounts.component').then(m => m.AccountsComponent) },
      { path: 'transactions', loadComponent: () => import('./features/client/transactions/transactions.component').then(m => m.TransactionsComponent) },
      {
        path: 'transfers',
        children: [
          { path: 'simple', loadComponent: () => import('./features/client/transfers/simple/simple-transfer.component').then(m => m.SimpleTransferComponent) },
          { path: 'grouped', loadComponent: () => import('./features/client/transfers/grouped/grouped-transfer.component').then(m => m.GroupedTransferComponent) },
          { path: 'permanent', loadComponent: () => import('./features/client/transfers/permanent/permanent-transfer.component').then(m => m.PermanentTransferComponent) },
        ]
      },
      {
        path: 'credits',
        children: [
          { path: 'simulate', loadComponent: () => import('./features/client/credits/simulate/simulate.component').then(m => m.SimulateComponent) },
          { path: 'request', loadComponent: () => import('./features/client/credits/request/credit-request.component').then(m => m.CreditRequestComponent) },
          { path: 'list', loadComponent: () => import('./features/client/credits/list/credit-list.component').then(m => m.CreditListComponent) },
        ]
      },
      {
        path: 'cards',
        children: [
          { path: 'manage', loadComponent: () => import('./features/client/cards/cards.component').then(m => m.CardsComponent) },
          { path: 'request', loadComponent: () => import('./features/client/cards/cards.component').then(m => m.CardsComponent) },
        ]
      },
      { path: 'chatbot', loadComponent: () => import('./features/client/chatbot/chatbot.component').then(m => m.ChatbotComponent) },
      { path: 'notifications', loadComponent: () => import('./features/client/notifications/notifications.component').then(m => m.ClientNotificationsComponent) },
    ]
  },

  // Employee
  {
    path: 'employee',
    canActivate: [roleGuard(['EMPLOYEE'])],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./features/employee/dashboard/dashboard.component').then(m => m.EmployeeDashboardComponent) },
      {
        path: 'demandes-bancaires',
        children: [
          { path: 'transfers', loadComponent: () => import('./features/employee/transfers/transfers.component').then(m => m.EmployeeTransfersComponent) },
          { path: 'credits', loadComponent: () => import('./features/employee/credits/credits.component').then(m => m.EmployeeCreditsComponent) },
        ]
      },
      { path: 'balance', loadComponent: () => import('./features/employee/balance/balance.component').then(m => m.EmployeeBalanceComponent) },
      { path: 'reports', loadComponent: () => import('./features/employee/reports/reports.component').then(m => m.EmployeeReportsComponent) },
    ]
  },

  // Admin
  {
    path: 'admin',
    canActivate: [roleGuard(['ADMIN'])],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./features/admin/dashboard/dashboard.component').then(m => m.AdminDashboardComponent) },
      {
        path: 'superviser',
        children: [
          { path: 'audit-logs', loadComponent: () => import('./features/admin/audit-logs/audit-logs.component').then(m => m.AuditLogsComponent) },
          { path: 'password-resets', loadComponent: () => import('./features/admin/password-resets/password-resets.component').then(m => m.AdminPasswordResetsComponent) },
          { path: 'transfers', loadComponent: () => import('./features/admin/transfers/transfers.component').then(m => m.AdminTransfersComponent) },
          { path: 'credits', loadComponent: () => import('./features/admin/credits/credits.component').then(m => m.AdminCreditsComponent) },
        ]
      },
      { path: 'users', loadComponent: () => import('./features/admin/users/users.component').then(m => m.AdminUsersComponent) },
      { path: 'bank-accounts', loadComponent: () => import('./features/admin/bank-accounts/bank-accounts.component').then(m => m.AdminBankAccountsComponent) },
      { path: 'registrations', loadComponent: () => import('./features/admin/registrations/registrations.component').then(m => m.AdminRegistrationsComponent) },
      { path: 'reports', loadComponent: () => import('./features/admin/reports/reports.component').then(m => m.AdminReportsComponent) },
      {
        path: 'security-system',
        children: [
          { path: 'fraud-alerts', loadComponent: () => import('./features/admin/fraud-alerts/fraud-alerts.component').then(m => m.FraudAlertsComponent) },
          { path: 'security', loadComponent: () => import('./features/admin/security/security.component').then(m => m.AdminSecurityComponent) },
        ]
      },
    ]
  },

  { path: '**', redirectTo: '/' }
];
