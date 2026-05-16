const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Actif',
  DISABLED: 'Désactivé',
  CLOSED: 'Fermé',
  EXPIRED: 'Expiré',
  LOCKED: 'Verrouillé',
  ANONYMOUS: 'Anonyme',
  PENDING: 'En attente',
  APPROVED: 'Approuvé',
  EXECUTED: 'Exécuté',
  COMPLETED: 'Terminé',
  REJECTED: 'Rejeté',
  FAILED: 'Échoué',
  CANCELLED: 'Annulé',
  DISBURSED: 'Déboursé',
  SUBMITTED: 'Soumis',
  REVIEWED: 'Examiné',
  DRAFT: 'Brouillon',
  OPEN: 'Ouverte',
  INVESTIGATING: 'En investigation',
  RESOLVED: 'Résolue',
  DISMISSED: 'Rejetée',
};

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  TRANSFER_SIMPLE: 'Virement simple',
  TRANSFER_GROUPED: 'Virement groupé',
  TRANSFER_PERMANENT: 'Virement permanent',
  CREDIT_DISBURSEMENT: 'Crédit versé',
  CREDIT_REPAYMENT: 'Remboursement crédit',
  CARD_RECHARGE: 'Recharge carte',
  CARD_LINKING: 'Carte liée',
  ACCOUNT_TO_CARD: 'Compte vers carte',
  CARD_TO_ACCOUNT: 'Carte vers compte',
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  USER: 'Utilisateur',
  BANK_ACCOUNT: 'Compte bancaire',
  TRANSACTION: 'Transaction',
  TRANSFER_REQUEST: 'Demande de virement',
  CREDIT_REQUEST: 'Demande de crédit',
  REGISTRATION_REQUEST: 'Demande d’inscription',
  PASSWORD_RESET_REQUEST: 'Demande de mot de passe',
  DAILY_REPORT: 'Rapport quotidien',
  FRAUD_ALERT: 'Alerte de fraude',
  ACCOUNT_CARD: 'Carte bancaire',
  BLOCKED_IP: 'Adresse IP bloquée',
  SECURITY_INCIDENT: 'Incident de sécurité',
  NOTIFICATION: 'Notification',
};

const SECURITY_ACTION_LABELS: Record<string, string> = {
  LOGIN_FAILED: 'Connexion échouée',
  UNAUTHORIZED_ACCESS: 'Accès non autorisé',
  ACCOUNT_LOCKED: 'Compte verrouillé',
  BLOCK_SUSPICIOUS_USER: 'Compte bloqué',
  LOGIN_BLOCKED_LOCKED: 'Connexion bloquée',
  LOGIN_BLOCKED_DISABLED: 'Connexion refusée',
};

const SEVERITY_LABELS: Record<string, string> = {
  LOW: 'Faible',
  MEDIUM: 'Moyenne',
  HIGH: 'Élevée',
  CRITICAL: 'Critique',
};

export function statusFr(value: string | null | undefined): string {
  if (!value) return '';
  return STATUS_LABELS[value] ?? humanize(value);
}

export function transactionTypeFr(value: string | null | undefined): string {
  if (!value) return '';
  return TRANSACTION_TYPE_LABELS[value] ?? humanize(value);
}

export function auditActionFr(value: string | null | undefined): string {
  if (!value) return '';
  const upper = value.toUpperCase();
  if (upper.includes('FRAUD')) return 'Alerte fraude';
  if (upper.includes('APPROVE')) return 'Approbation';
  if (upper.includes('REJECT')) return 'Rejet';
  if (upper.includes('DISABLE') || upper.includes('FREEZE') || upper.includes('LOCK')) return 'Suspension';
  if (upper.includes('ACTIVATE') || upper.includes('UNLOCK') || upper.includes('ENABLE')) return 'Activation';
  if (upper.includes('DELETE') || upper.includes('REMOVE')) return 'Suppression';
  if (upper.includes('CREATE') || upper.includes('INITIATE') || upper.includes('REGISTER')) return 'Création';
  if (upper.includes('LOGOUT')) return 'Déconnexion';
  if (upper.includes('LOGIN')) return 'Connexion';
  if (upper.includes('AUTH')) return 'Authentification';
  return humanize(value);
}

export function entityTypeFr(value: string | null | undefined): string {
  if (!value) return '';
  return ENTITY_TYPE_LABELS[value] ?? humanize(value);
}

export function fraudAlertTypeFr(value: string | null | undefined): string {
  if (!value) return '';
  return humanize(value)
    .replace(/\bAmount\b/gi, 'montant')
    .replace(/\bFrequency\b/gi, 'fréquence')
    .replace(/\bVelocity\b/gi, 'rythme')
    .replace(/\bSuspicious\b/gi, 'suspect')
    .replace(/\bLarge\b/gi, 'élevé')
    .replace(/\bMultiple\b/gi, 'multiple');
}

export function severityFr(value: string | null | undefined): string {
  if (!value) return '';
  return SEVERITY_LABELS[value] ?? humanize(value);
}

export function securityActionFr(value: string | null | undefined): string {
  if (!value) return '';
  return SECURITY_ACTION_LABELS[value] ?? auditActionFr(value);
}

export function notificationTypeFr(value: string | null | undefined): string {
  if (!value) return '';
  const upper = value.toUpperCase();
  if (upper.includes('SUCCESS')) return 'Succès';
  if (upper.includes('WARN')) return 'Avertissement';
  if (upper.includes('ERROR')) return 'Erreur';
  if (upper.includes('ALERT')) return 'Alerte';
  if (upper.includes('INFO')) return 'Information';
  return humanize(value);
}

function humanize(value: string): string {
  const text = value
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('fr-FR');
  return text ? text[0].toLocaleUpperCase('fr-FR') + text.slice(1) : value;
}
