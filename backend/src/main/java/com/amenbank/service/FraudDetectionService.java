package com.amenbank.service;

import com.amenbank.audit.AuditService;
import com.amenbank.dto.response.FraudAlertResponse;
import com.amenbank.entity.FraudAlert;
import com.amenbank.entity.Notification;
import com.amenbank.entity.Transaction;
import com.amenbank.entity.User;
import com.amenbank.exception.BusinessException;
import com.amenbank.notification.NotificationService;
import com.amenbank.notification.NotificationWebSocketHandler;
import com.amenbank.repository.FraudAlertRepository;
import com.amenbank.repository.TransactionRepository;
import com.amenbank.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class FraudDetectionService {

    private final FraudAlertRepository fraudAlertRepository;
    private final NotificationService notificationService;
    private final NotificationWebSocketHandler notificationWebSocketHandler;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final AuditService auditService;

    private static final List<FraudAlert.AlertStatus> ACTIVE_ALERT_STATUSES = List.of(
            FraudAlert.AlertStatus.OPEN,
            FraudAlert.AlertStatus.INVESTIGATING
    );

    @Value("${app.fraud.threshold:10000}")
    private BigDecimal fraudThreshold;

    @Value("${app.fraud.velocity-window-minutes:10}")
    private int velocityWindowMinutes;

    @Value("${app.fraud.velocity-max-count:5}")
    private int velocityMaxCount;

    public void analyzeTransaction(Transaction transaction) {
        if (transaction == null || transaction.getAmount() == null) {
            return;
        }
        checkHighAmount(transaction);
        checkVelocity(transaction);
        checkDailyVolume(transaction);
        checkUnusualExternalDestination(transaction);
    }

    private void checkHighAmount(Transaction transaction) {
        BigDecimal amount = transaction.getAmount();

        if (amount.compareTo(fraudThreshold) > 0) {
            FraudAlert.Severity severity;
            if (amount.compareTo(fraudThreshold.multiply(BigDecimal.valueOf(5))) > 0) {
                severity = FraudAlert.Severity.CRITICAL;
            } else if (amount.compareTo(fraudThreshold.multiply(BigDecimal.valueOf(2))) > 0) {
                severity = FraudAlert.Severity.HIGH;
            } else {
                severity = FraudAlert.Severity.MEDIUM;
            }

            raiseAlert(transaction, FraudAlert.AlertType.HIGH_AMOUNT, severity,
                    "Transaction " + transaction.getReference() + " de " + amount +
                            " TND depasse le seuil de " + fraudThreshold + " TND",
                    "Alerte fraude - Montant eleve",
                    "Transaction " + transaction.getReference() + " de " + amount +
                            " TND detectee. Severite: " + severity.name());
        }
    }

    private void checkVelocity(Transaction transaction) {
        if (transaction.getSourceAccount() == null) {
            return;
        }
        LocalDateTime since = LocalDateTime.now().minusMinutes(velocityWindowMinutes);
        long recentCount = transactionRepository.countBySourceAccountSince(
                transaction.getSourceAccount().getId(), since);

        if (recentCount < velocityMaxCount) {
            return;
        }

        FraudAlert.Severity severity = recentCount >= velocityMaxCount * 2L
                ? FraudAlert.Severity.HIGH
                : FraudAlert.Severity.MEDIUM;

        raiseAlert(transaction, FraudAlert.AlertType.VELOCITY, severity,
                "Compte " + transaction.getSourceAccount().getAccountNumber() +
                        " : " + recentCount + " transactions en " + velocityWindowMinutes +
                        " minutes (seuil: " + velocityMaxCount + ")",
                "Alerte fraude - Velocite",
                recentCount + " transactions detectees en " + velocityWindowMinutes +
                        " minutes sur le compte " + transaction.getSourceAccount().getAccountNumber() +
                        ". Severite: " + severity.name());
    }

    private void checkDailyVolume(Transaction transaction) {
        if (transaction.getSourceAccount() == null) {
            return;
        }

        LocalDateTime since = LocalDateTime.now().minusHours(24);
        List<Transaction> recent = transactionRepository.findRecentBySourceAccountSince(
                transaction.getSourceAccount().getId(), since);
        BigDecimal total = recent.stream()
                .map(Transaction::getAmount)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal mediumThreshold = fraudThreshold.multiply(BigDecimal.valueOf(3));
        if (total.compareTo(mediumThreshold) < 0) {
            return;
        }

        FraudAlert.Severity severity = total.compareTo(fraudThreshold.multiply(BigDecimal.valueOf(6))) >= 0
                ? FraudAlert.Severity.CRITICAL
                : FraudAlert.Severity.HIGH;

        raiseAlert(transaction, FraudAlert.AlertType.SUSPICIOUS_PATTERN, severity,
                "Volume cumule de " + total + " TND sur 24h pour le compte " +
                        transaction.getSourceAccount().getAccountNumber() + " (seuil: " + mediumThreshold + " TND)",
                "Alerte fraude - Volume journalier",
                "Le compte " + transaction.getSourceAccount().getAccountNumber() +
                        " cumule " + total + " TND sur 24h. Severite: " + severity.name());
    }

    private void checkUnusualExternalDestination(Transaction transaction) {
        String iban = transaction.getDestinationExternalIban();
        if (iban == null || iban.isBlank() || transaction.getInitiatedBy() == null || transaction.getId() == null) {
            return;
        }

        BigDecimal unusualThreshold = fraudThreshold.divide(BigDecimal.valueOf(2), 3, RoundingMode.HALF_UP);
        if (transaction.getAmount().compareTo(unusualThreshold) < 0) {
            return;
        }

        long previousUse = transactionRepository.countPreviousExternalDestinationUsage(
                transaction.getInitiatedBy().getId(), iban, transaction.getId());
        if (previousUse > 0) {
            return;
        }

        FraudAlert.Severity severity = transaction.getAmount().compareTo(fraudThreshold) >= 0
                ? FraudAlert.Severity.HIGH
                : FraudAlert.Severity.MEDIUM;

        raiseAlert(transaction, FraudAlert.AlertType.UNUSUAL_DESTINATION, severity,
                "Premier virement externe vers " + iban + " avec un montant de " +
                        transaction.getAmount() + " TND",
                "Alerte fraude - Nouveau beneficiaire externe",
                "Transaction " + transaction.getReference() + " vers un IBAN externe jamais utilise (" +
                        iban + "). Severite: " + severity.name());
    }

    private void raiseAlert(Transaction transaction,
                            FraudAlert.AlertType alertType,
                            FraudAlert.Severity severity,
                            String description,
                            String title,
                            String message) {
        if (transaction.getId() != null && fraudAlertRepository.existsByTransactionIdAndAlertTypeAndStatusIn(
                transaction.getId(), alertType, ACTIVE_ALERT_STATUSES)) {
            return;
        }

        FraudAlert alert = FraudAlert.builder()
                .transaction(transaction)
                .alertType(alertType)
                .description(description)
                .severity(severity)
                .build();
        fraudAlertRepository.save(alert);

        auditService.log(transaction.getInitiatedBy(), "FRAUD_ALERT_CREATED", "FraudAlert", alert.getId(),
                description + " (transaction " + transaction.getReference() + ")");

        log.warn("FRAUD ALERT: {} - transaction {} (severity: {})",
                alertType, transaction.getReference(), severity);

        notifyAdmins(title, message);
        notificationWebSocketHandler.broadcastBadgeRefresh();
    }

    private void notifyAdmins(String title, String message) {
        List<User> admins = userRepository.findAllByRoleName("ADMIN");
        for (User admin : admins) {
            notificationService.send(admin, title, message, Notification.NotificationType.FRAUD);
        }
    }

    public Page<FraudAlertResponse> getAllAlerts(Pageable pageable) {
        return fraudAlertRepository.findAllByOrderByDetectedAtDesc(pageable).map(this::mapToResponse);
    }

    public Page<FraudAlertResponse> getAlertsByStatus(String status, Pageable pageable) {
        FraudAlert.AlertStatus alertStatus = FraudAlert.AlertStatus.valueOf(status.toUpperCase());
        return fraudAlertRepository.findByStatusOrderByDetectedAtDesc(alertStatus, pageable).map(this::mapToResponse);
    }

    @Transactional
    public void updateAlertStatus(Long id, String newStatus, String comment, User reviewer) {
        FraudAlert alert = fraudAlertRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Fraud alert not found", "ALERT_NOT_FOUND", HttpStatus.NOT_FOUND));

        alert.setStatus(FraudAlert.AlertStatus.valueOf(newStatus.toUpperCase()));
        alert.setReviewedBy(reviewer);
        alert.setReviewedAt(LocalDateTime.now());
        alert.setReviewComment(comment);
        fraudAlertRepository.save(alert);
        notificationWebSocketHandler.broadcastBadgeRefresh();
    }

    /**
     * Resolve a fraud alert and return the client whose account triggered it,
     * so the caller can run the freeze cascade in the same admin action.
     */
    @Transactional
    public Long resolveAlertAndGetClientId(Long alertId, String comment, User reviewer) {
        FraudAlert alert = fraudAlertRepository.findById(alertId)
                .orElseThrow(() -> new BusinessException("Fraud alert not found", "ALERT_NOT_FOUND", HttpStatus.NOT_FOUND));

        if (alert.getStatus() == FraudAlert.AlertStatus.RESOLVED
                || alert.getStatus() == FraudAlert.AlertStatus.DISMISSED) {
            throw new BusinessException("Cette alerte a deja ete traitee", "ALERT_ALREADY_HANDLED");
        }

        Transaction tx = alert.getTransaction();
        if (tx == null) {
            throw new BusinessException("Alerte sans transaction associee", "ALERT_NO_TRANSACTION");
        }

        Long clientId = null;
        if (tx.getSourceAccount() != null && tx.getSourceAccount().getClient() != null) {
            clientId = tx.getSourceAccount().getClient().getId();
        } else if (tx.getInitiatedBy() != null) {
            clientId = tx.getInitiatedBy().getId();
        }
        if (clientId == null) {
            throw new BusinessException("Impossible de determiner le client de l'alerte", "ALERT_NO_CLIENT");
        }

        alert.setStatus(FraudAlert.AlertStatus.RESOLVED);
        alert.setReviewedBy(reviewer);
        alert.setReviewedAt(LocalDateTime.now());
        alert.setReviewComment(comment);
        fraudAlertRepository.save(alert);
        notificationWebSocketHandler.broadcastBadgeRefresh();
        return clientId;
    }

    public long getOpenAlertsCount() {
        return fraudAlertRepository.countByStatus(FraudAlert.AlertStatus.OPEN);
    }

    private FraudAlertResponse mapToResponse(FraudAlert a) {
        return FraudAlertResponse.builder()
                .id(a.getId())
                .transactionId(a.getTransaction() != null ? a.getTransaction().getId() : null)
                .transactionReference(a.getTransaction() != null ? a.getTransaction().getReference() : null)
                .transactionAmount(a.getTransaction() != null ? a.getTransaction().getAmount() : null)
                .alertType(a.getAlertType().name())
                .description(a.getDescription())
                .severity(a.getSeverity().name())
                .status(a.getStatus().name())
                .detectedAt(a.getDetectedAt())
                .reviewedByName(a.getReviewedBy() != null ? a.getReviewedBy().getFirstName() + " " + a.getReviewedBy().getLastName() : null)
                .reviewComment(a.getReviewComment())
                .reviewedAt(a.getReviewedAt())
                .build();
    }
}
