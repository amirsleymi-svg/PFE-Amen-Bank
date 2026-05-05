import { NavItem } from './components/sidebar/sidebar.component';

export const CLIENT_NAV: NavItem[] = [
  { label: 'Tableau de bord', route: '/client/dashboard', icon: '📊' },
  { label: 'Mon compte', route: '/client/accounts', icon: '🏦' },
  { label: 'Transactions', route: '/client/transactions', icon: '📋' },
  { label: 'Virement simple', route: '/client/transfers/simple', icon: '💸' },
  { label: 'Virement groupé', route: '/client/transfers/grouped', icon: '👥' },
  { label: 'Virement permanent', route: '/client/transfers/permanent', icon: '🔄' },
  { label: 'Simuler un crédit', route: '/client/credits/simulate', icon: '🧮' },
  { label: 'Demander un crédit', route: '/client/credits/request', icon: '📝' },
  { label: 'Mes crédits', route: '/client/credits/list', icon: '💰' },
  { label: 'Ma carte', route: '/client/cards', icon: '💳' },
  { label: 'Notifications', route: '/client/notifications', icon: '🔔' },
  { label: 'Assistant', route: '/client/chatbot', icon: '🤖' },
];

export const EMPLOYEE_NAV: NavItem[] = [
  { label: 'Tableau de bord', route: '/employee/dashboard', icon: '📊' },
  { label: 'Virements', route: '/employee/transfers', icon: '💸' },
  { label: 'Crédits', route: '/employee/credits', icon: '💰' },
  { label: 'Augmenter le solde', route: '/employee/balance', icon: '💵' },
  { label: 'Rapports', route: '/employee/reports', icon: '📝' },
];

export const ADMIN_NAV: NavItem[] = [
  { label: 'Tableau de bord', route: '/admin/dashboard', icon: '📊' },
  { label: 'Utilisateurs', route: '/admin/users', icon: '👥' },
  { label: 'Comptes bancaires', route: '/admin/bank-accounts', icon: '🏦' },
  { label: 'Inscriptions', route: '/admin/registrations', icon: '📋' },
  { label: 'Réinitialisations MDP', route: '/admin/password-resets', icon: '🔑' },
  { label: 'Suivi virements', route: '/admin/transfers', icon: '💸' },
  { label: 'Suivi crédits', route: '/admin/credits', icon: '💰' },
  { label: 'Journaux d’audit', route: '/admin/audit-logs', icon: '📜' },
  { label: 'Rapports', route: '/admin/reports', icon: '📝' },
  { label: 'Alertes fraude', route: '/admin/fraud-alerts', icon: '🚨' },
  { label: 'Sécurité', route: '/admin/security', icon: '🛡️' },
];
