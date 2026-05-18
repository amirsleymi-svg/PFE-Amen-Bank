import { NavItem } from './components/sidebar/sidebar.component';

export const CLIENT_NAV: NavItem[] = [
  { label: 'Accueil', route: '/client/dashboard', icon: '🏠' },
  { label: 'Compte Bancaire', route: '/client/accounts', icon: '🏦' },
  { label: 'Ma Carte', route: '/client/cards/manage', icon: '💳' },
  { label: 'Demander une carte', route: '/client/cards/request', icon: '✨' },
  {
    label: 'Virements',
    icon: '💸',
    route: '/client/transfers',
    children: [
      { label: 'Virement simple', route: '/client/transfers/simple', icon: '📤' },
      { label: 'Virement groupé', route: '/client/transfers/grouped', icon: '👥' },
      { label: 'Virement permanent', route: '/client/transfers/permanent', icon: '🔄' },
    ]
  },
  {
    label: 'Crédits',
    icon: '💰',
    route: '/client/credits',
    children: [
      { label: 'Demande de crédit', route: '/client/credits/request', icon: '📝' },
      { label: 'Simuler un crédit', route: '/client/credits/simulate', icon: '🧮' },
    ]
  },
  { label: 'Transactions', route: '/client/transactions', icon: '📋' },
  { label: 'Assistant', route: '/client/chatbot', icon: '🤖' },
];

export const EMPLOYEE_NAV: NavItem[] = [
  { label: 'Accueil', route: '/employee/dashboard', icon: '📊' },
  {
    label: 'Demandes bancaires',
    icon: '📂',
    route: '/employee/demandes-bancaires',
    children: [
      { label: 'Virements', route: '/employee/demandes-bancaires/transfers', icon: '💸' },
      { label: 'Crédits', route: '/employee/demandes-bancaires/credits', icon: '💰' },
    ]
  },
  { label: 'Dépôt à créditer', route: '/employee/balance', icon: '💵' },
  { label: 'Rapports', route: '/employee/reports', icon: '📝' },
];

export const ADMIN_NAV: NavItem[] = [
  { label: 'Accueil', route: '/admin/dashboard', icon: '📊' },
  {
    label: 'Superviser le système',
    icon: '🛠️',
    route: '/admin/superviser',
    children: [
      { label: 'Audit Logs', route: '/admin/superviser/audit-logs', icon: '📜' },
    ]
  },
  { label: 'Utilisateurs', route: '/admin/users', icon: '👥' },
  { label: 'Inscriptions', route: '/admin/registrations', icon: '📝' },
  { label: 'Rapports', route: '/admin/reports', icon: '📄' },
  {
    label: 'Sécurité Système',
    icon: '🛡️',
    route: '/admin/security-system',
    children: [
      { label: 'Comptes Bancaires', route: '/admin/bank-accounts', icon: '🏦' },
      { label: 'Alertes & supervision', route: '/admin/security-system/fraud-alerts', icon: '🚨' },
      { label: 'Sécurité', route: '/admin/security-system/security', icon: '🔒' },
    ]
  },
];
