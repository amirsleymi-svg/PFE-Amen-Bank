package com.amenbank.service;

import com.amenbank.audit.AuditService;
import com.amenbank.dto.request.DailyReportRequest;
import com.amenbank.dto.response.DailyReportResponse;
import com.amenbank.entity.AuditLog;
import com.amenbank.entity.BankAccount;
import com.amenbank.entity.CreditRequest;
import com.amenbank.entity.DailyReport;
import com.amenbank.entity.Notification;
import com.amenbank.entity.Transaction;
import com.amenbank.entity.User;
import com.amenbank.exception.BusinessException;
import com.amenbank.notification.NotificationService;
import com.amenbank.notification.NotificationWebSocketHandler;
import com.amenbank.repository.AuditLogRepository;
import com.amenbank.repository.BankAccountRepository;
import com.amenbank.repository.CreditRequestRepository;
import com.amenbank.repository.DailyReportRepository;
import com.amenbank.repository.TransactionRepository;
import com.amenbank.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final DailyReportRepository dailyReportRepository;
    private final BankAccountRepository bankAccountRepository;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final CreditRequestRepository creditRequestRepository;
    private final AuditLogRepository auditLogRepository;
    private final NotificationService notificationService;
    private final NotificationWebSocketHandler notificationWebSocketHandler;
    private final AuditService auditService;

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");

    @Transactional
    public DailyReportResponse createDailyReport(DailyReportRequest request, User employee) {
        DailyReport report = DailyReport.builder()
                .employee(employee)
                .reportDate(request.getReportDate())
                .title(request.getTitle())
                .content(request.getContent())
                .status(DailyReport.ReportStatus.SUBMITTED)
                .build();
        dailyReportRepository.save(report);

        auditService.log(employee, "CREATE_DAILY_REPORT", "DailyReport", report.getId(),
                "Daily report for " + request.getReportDate());
        notifyAdminsNewReport(report);
        notificationWebSocketHandler.broadcastBadgeRefresh();

        return mapToResponse(report);
    }

    /**
     * Build a daily report automatically by aggregating all transfers, credit decisions,
     * and balance top-ups that happened on the given date. The employee still owns the
     * report and submits it; admins receive a notification to review it.
     */
    @Transactional
    public DailyReportResponse generateAutomaticDailyReport(LocalDate date, User employee) {
        LocalDate target = date != null ? date : LocalDate.now();
        LocalDateTime dayStart = target.atStartOfDay();
        LocalDateTime dayEnd = target.atTime(LocalTime.MAX);

        List<Transaction.TransactionType> transferTypes = List.of(
                Transaction.TransactionType.TRANSFER_SIMPLE,
                Transaction.TransactionType.TRANSFER_GROUPED,
                Transaction.TransactionType.TRANSFER_PERMANENT);

        List<Transaction> transfers = transactionRepository.findByTypeInAndCreatedAtBetween(
                transferTypes, dayStart, dayEnd);
        List<CreditRequest> newCredits = creditRequestRepository.findByCreatedAtBetween(dayStart, dayEnd);
        List<CreditRequest> decidedCredits = creditRequestRepository.findByReviewedAtBetween(dayStart, dayEnd);
        List<AuditLog> balanceIncreases = auditLogRepository.findByActionAndCreatedAtBetween(
                "INCREASE_BALANCE", dayStart, dayEnd);

        String title = "Rapport journalier automatique - " + target;
        String content = buildAutoReportContent(target, transfers, newCredits, decidedCredits, balanceIncreases);

        DailyReport report = DailyReport.builder()
                .employee(employee)
                .reportDate(target)
                .title(title)
                .content(content)
                .status(DailyReport.ReportStatus.SUBMITTED)
                .build();
        dailyReportRepository.save(report);

        auditService.log(employee, "GENERATE_AUTO_DAILY_REPORT", "DailyReport", report.getId(),
                "Auto-generated daily report for " + target +
                        " (" + transfers.size() + " transferts, " + newCredits.size() + " nouveaux credits, " +
                        decidedCredits.size() + " credits traites, " + balanceIncreases.size() + " credits solde)");
        notifyAdminsNewReport(report);
        notificationWebSocketHandler.broadcastBadgeRefresh();

        return mapToResponse(report);
    }

    private String buildAutoReportContent(LocalDate date,
                                          List<Transaction> transfers,
                                          List<CreditRequest> newCredits,
                                          List<CreditRequest> decidedCredits,
                                          List<AuditLog> balanceIncreases) {
        StringBuilder sb = new StringBuilder();
        sb.append("RAPPORT JOURNALIER AUTOMATIQUE\n");
        sb.append("Date : ").append(date).append("\n");
        sb.append("Genere le : ").append(LocalDateTime.now()).append("\n\n");

        // ===== TRANSFERS =====
        sb.append("=== 1. VIREMENTS (simple / groupe / permanent) ===\n");
        if (transfers.isEmpty()) {
            sb.append("Aucun virement enregistre.\n\n");
        } else {
            long autoCount = transfers.stream()
                    .filter(t -> t.getApprovedBy() == null &&
                            (t.getStatus() == Transaction.TransactionStatus.APPROVED ||
                             t.getStatus() == Transaction.TransactionStatus.EXECUTED))
                    .count();
            long manualCount = transfers.stream().filter(t -> t.getApprovedBy() != null).count();
            long pendingCount = transfers.stream()
                    .filter(t -> t.getStatus() == Transaction.TransactionStatus.PENDING).count();
            BigDecimal totalVolume = transfers.stream()
                    .map(Transaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

            sb.append("Total : ").append(transfers.size()).append(" virements\n");
            sb.append("  - Auto-executes : ").append(autoCount).append("\n");
            sb.append("  - Valides par employe : ").append(manualCount).append("\n");
            sb.append("  - En attente : ").append(pendingCount).append("\n");
            sb.append("  - Volume total : ").append(totalVolume).append(" TND\n\n");
            sb.append("Detail :\n");
            for (Transaction t : transfers) {
                String mode = t.getApprovedBy() != null
                        ? "valide par " + t.getApprovedBy().getFirstName() + " " + t.getApprovedBy().getLastName()
                        : (t.getStatus() == Transaction.TransactionStatus.PENDING ? "en attente" : "auto");
                sb.append("  [").append(t.getCreatedAt().toLocalTime().format(TIME_FMT)).append("] ")
                        .append(typeLabel(t.getType())).append(" ")
                        .append(t.getReference()).append(" - ")
                        .append(t.getAmount()).append(" TND - ")
                        .append(t.getInitiatedBy().getFirstName()).append(" ").append(t.getInitiatedBy().getLastName())
                        .append(" - ").append(t.getStatus()).append(" (").append(mode).append(")\n");
            }
            sb.append("\n");
        }

        // ===== CREDITS =====
        sb.append("=== 2. CREDITS ===\n");
        sb.append("Nouvelles demandes : ").append(newCredits.size()).append("\n");
        sb.append("Demandes traitees (approuvees / rejetees) : ").append(decidedCredits.size()).append("\n");
        if (!decidedCredits.isEmpty()) {
            long approved = decidedCredits.stream()
                    .filter(c -> c.getStatus() != CreditRequest.CreditStatus.REJECTED).count();
            long rejected = decidedCredits.stream()
                    .filter(c -> c.getStatus() == CreditRequest.CreditStatus.REJECTED).count();
            BigDecimal disbursed = decidedCredits.stream()
                    .filter(c -> c.getStatus() != CreditRequest.CreditStatus.REJECTED)
                    .map(CreditRequest::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            sb.append("  - Approuves : ").append(approved).append(" (").append(disbursed).append(" TND debourses)\n");
            sb.append("  - Rejetes : ").append(rejected).append("\n");
        }
        sb.append("\n");
        if (!newCredits.isEmpty()) {
            sb.append("Nouvelles demandes du jour :\n");
            for (CreditRequest c : newCredits) {
                sb.append("  [").append(c.getCreatedAt().toLocalTime().format(TIME_FMT)).append("] CR-")
                        .append(String.format("%06d", c.getId())).append(" - ")
                        .append(c.getAmount()).append(" TND / ").append(c.getDurationMonths()).append(" mois - ")
                        .append(c.getClient().getFirstName()).append(" ").append(c.getClient().getLastName())
                        .append(" - ").append(c.getStatus()).append("\n");
            }
            sb.append("\n");
        }
        if (!decidedCredits.isEmpty()) {
            sb.append("Decisions du jour :\n");
            for (CreditRequest c : decidedCredits) {
                String reviewer = c.getReviewedBy() != null
                        ? c.getReviewedBy().getFirstName() + " " + c.getReviewedBy().getLastName() : "-";
                sb.append("  [").append(c.getReviewedAt().toLocalTime().format(TIME_FMT)).append("] CR-")
                        .append(String.format("%06d", c.getId())).append(" - ")
                        .append(c.getAmount()).append(" TND - ").append(c.getStatus())
                        .append(" par ").append(reviewer).append("\n");
            }
            sb.append("\n");
        }

        // ===== BALANCE INCREASES =====
        sb.append("=== 3. AUGMENTATIONS DE SOLDE (credits manuels employe) ===\n");
        if (balanceIncreases.isEmpty()) {
            sb.append("Aucune operation de credit de solde enregistree.\n\n");
        } else {
            sb.append("Total : ").append(balanceIncreases.size()).append(" operations\n\n");
            for (AuditLog a : balanceIncreases) {
                String who = a.getUser() != null
                        ? a.getUser().getFirstName() + " " + a.getUser().getLastName() : "(systeme)";
                sb.append("  [").append(a.getCreatedAt().toLocalTime().format(TIME_FMT)).append("] ")
                        .append(who).append(" - ").append(a.getDetails() != null ? a.getDetails() : "").append("\n");
            }
            sb.append("\n");
        }

        sb.append("--- FIN DU RAPPORT ---\n");
        return sb.toString();
    }

    private String typeLabel(Transaction.TransactionType type) {
        switch (type) {
            case TRANSFER_SIMPLE: return "Simple";
            case TRANSFER_GROUPED: return "Groupe";
            case TRANSFER_PERMANENT: return "Permanent";
            default: return type.name();
        }
    }

    private void notifyAdminsNewReport(DailyReport report) {
        List<User> admins = userRepository.findAllByRoleName("ADMIN");
        String title = "Nouveau rapport journalier a examiner";
        String msg = "L'employe " + report.getEmployee().getFirstName() + " " + report.getEmployee().getLastName() +
                " a soumis le rapport du " + report.getReportDate() + " : " + report.getTitle();
        for (User admin : admins) {
            notificationService.send(admin, title, msg, Notification.NotificationType.REPORT);
        }
    }

    public Page<DailyReportResponse> getMyReports(Long employeeId, Pageable pageable) {
        return dailyReportRepository.findByEmployeeIdOrderByReportDateDesc(employeeId, pageable)
                .map(this::mapToResponse);
    }

    @Transactional
    public void activateClient(Long clientId, User employee) {
        User client = userRepository.findById(clientId)
                .orElseThrow(() -> new BusinessException("Client not found", "USER_NOT_FOUND", HttpStatus.NOT_FOUND));
        if (!"CLIENT".equals(client.getRole().getName())) {
            throw new BusinessException("User is not a client", "NOT_CLIENT");
        }
        client.setStatus(User.UserStatus.ACTIVE);
        client.setFailedLoginAttempts(0);
        client.setLockedUntil(null);
        userRepository.save(client);
        auditService.log(employee, "EMPLOYEE_ACTIVATE_CLIENT", "User", clientId, "Employee activated client account");
    }

    @Transactional
    public void deactivateClient(Long clientId, User employee) {
        User client = userRepository.findById(clientId)
                .orElseThrow(() -> new BusinessException("Client not found", "USER_NOT_FOUND", HttpStatus.NOT_FOUND));
        if (!"CLIENT".equals(client.getRole().getName())) {
            throw new BusinessException("User is not a client", "NOT_CLIENT");
        }
        client.setStatus(User.UserStatus.DISABLED);
        userRepository.save(client);
        auditService.log(employee, "EMPLOYEE_DEACTIVATE_CLIENT", "User", clientId, "Employee deactivated client account");
    }

    public List<User> getClients() {
        return userRepository.findAllByRoleName("CLIENT");
    }

    @Transactional
    public void increaseBalance(Long accountId, BigDecimal amount, User employee) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Amount must be positive", "INVALID_AMOUNT");
        }

        BankAccount account = bankAccountRepository.findById(accountId)
                .orElseThrow(() -> new BusinessException("Account not found", "ACCOUNT_NOT_FOUND", HttpStatus.NOT_FOUND));

        User client = account.getClient();
        if (!"CLIENT".equals(client.getRole().getName())) {
            throw new BusinessException("Account does not belong to a client", "NOT_CLIENT_ACCOUNT");
        }

        if (account.getStatus() != BankAccount.AccountStatus.ACTIVE) {
            throw new BusinessException(
                    "Le compte est desactive. Impossible d'augmenter le solde.",
                    "ACCOUNT_DISABLED");
        }
        if (client.getStatus() != User.UserStatus.ACTIVE) {
            throw new BusinessException(
                    "Le client est desactive. Impossible d'augmenter le solde.",
                    "CLIENT_DISABLED");
        }

        account.setBalance(account.getBalance().add(amount));
        bankAccountRepository.save(account);

        Transaction deposit = Transaction.builder()
                .reference(generateDepositReference())
                .type(Transaction.TransactionType.CREDIT_DISBURSEMENT)
                .status(Transaction.TransactionStatus.EXECUTED)
                .amount(amount)
                .destinationAccount(account)
                .descriptionText("Depot a crediter par employe")
                .initiatedBy(employee)
                .approvedBy(employee)
                .executedAt(LocalDateTime.now())
                .build();
        transactionRepository.save(deposit);

        notificationService.sendSuccess(client, "Depot credite",
                "Un depot de " + amount + " TND a ete credite sur votre compte " +
                        account.getAccountNumber() + ". Nouveau solde: " + account.getBalance() + " TND.");

        auditService.log(employee, "INCREASE_BALANCE", "Transaction", deposit.getId(),
                "Depot a crediter de " + amount + " TND pour le compte " + account.getAccountNumber() +
                        " (client " + client.getFirstName() + " " + client.getLastName() +
                        ", transaction " + deposit.getReference() + ")");
        notifyAdminsDeposit(employee, client, account, amount, deposit);
        notificationWebSocketHandler.broadcastBadgeRefresh();
    }

    private void notifyAdminsDeposit(User employee, User client, BankAccount account, BigDecimal amount, Transaction deposit) {
        String msg = "Depot a crediter de " + amount + " TND effectue par " +
                employee.getFirstName() + " " + employee.getLastName() + " au profit de " +
                client.getFirstName() + " " + client.getLastName() + " sur le compte " +
                account.getAccountNumber() + " (transaction " + deposit.getReference() + ").";
        for (User admin : userRepository.findAllByRoleName("ADMIN")) {
            notificationService.send(admin, "Depot client credite", msg, Notification.NotificationType.CREDIT);
        }
    }

    private DailyReportResponse mapToResponse(DailyReport r) {
        return DailyReportResponse.builder()
                .id(r.getId())
                .employeeName(r.getEmployee().getFirstName() + " " + r.getEmployee().getLastName())
                .reportDate(r.getReportDate())
                .title(r.getTitle())
                .content(r.getContent())
                .status(r.getStatus().name())
                .reviewedByName(r.getReviewedBy() != null ? r.getReviewedBy().getFirstName() + " " + r.getReviewedBy().getLastName() : null)
                .reviewComment(r.getReviewComment())
                .rating(r.getRating())
                .createdAt(r.getCreatedAt())
                .build();
    }

    private String generateDepositReference() {
        String ref;
        do {
            ref = "DEP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        } while (transactionRepository.existsByReference(ref));
        return ref;
    }
}
