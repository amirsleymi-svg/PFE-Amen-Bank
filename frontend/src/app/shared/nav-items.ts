import { NavItem } from './components/sidebar/sidebar.component';

export const CLIENT_NAV: NavItem[] = [
  { label: 'Tableau de bord', route: '/client/dashboard', icon: '📊' },
  { label: 'Mon compte', route: '/client/accounts', icon: '🏦' },
  { label: 'Transactions', route: '/client/transactions', icon: '📋' },
  { label: 'Virement simple', route: '/client/transfers/simple', icon: '💸' },
  { label: 'Virement groupe', route: '/client/transfers/grouped', icon: '👥' },
  { label: 'Virement permanent', route: '/client/transfers/permanent', icon: '🔄' },
  { label: 'Simuler credit', route: '/client/credits/simulate', icon: '🧮' },
  { label: 'Demander credit', route: '/client/credits/request', icon: '📝' },
  { label: 'Mes credits', route: '/client/credits/list', icon: '💰' },
  { label: 'Ma carte', route: '/client/cards', icon: '💳' },
  { label: 'Notifications', route: '/client/notifications', icon: '🔔' },
  { label: 'Assistant', route: '/client/chatbot', icon: '🤖' },
];

export const EMPLOYEE_NAV: NavItem[] = [
  { label: 'Tableau de bord', route: '/employee/dashboard', icon: '📊' },
  { label: 'Virements', route: '/employee/transfers', icon: '💸' },
  { label: 'Credits', route: '/employee/credits', icon: '💰' },
  { label: 'Augmenter solde', route: '/employee/balance', icon: '💵' },
  { label: 'Rapports', route: '/employee/reports', icon: '📝' },
];

export const ADMIN_NAV: NavItem[] = [
  { label: 'Tableau de bord', route: '/admin/dashboard', icon: '📊' },
  { label: 'Utilisateurs', route: '/admin/users', icon: '👥' },
  { label: 'Comptes bancaires', route: '/admin/bank-accounts', icon: '🏦' },
  { label: 'Inscriptions', route: '/admin/registrations', icon: '📋' },
  { label: 'Resets MDP', route: '/admin/password-resets', icon: '🔑' },
  { label: 'Suivi virements', route: '/admin/transfers', icon: '💸' },
  { label: 'Suivi credits', route: '/admin/credits', icon: '💰' },
  { label: 'Audit Logs', route: '/admin/audit-logs', icon: '📜' },
  { label: 'Rapports', route: '/admin/reports', icon: '📝' },
  { label: 'Alertes fraude', route: '/admin/fraud-alerts', icon: '🚨' },
  { label: 'Securite', route: '/admin/security', icon: '🛡️' },
];
