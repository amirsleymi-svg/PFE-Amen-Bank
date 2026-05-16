package com.amenbank.service;

import com.amenbank.audit.AuditService;
import com.amenbank.dto.request.GroupedTransferRequest;
import com.amenbank.dto.request.PermanentTransferRequest;
import com.amenbank.dto.request.SimpleTransferRequest;
import com.amenbank.dto.response.TransactionResponse;
import com.amenbank.entity.*;
import com.amenbank.exception.BusinessException;
import com.amenbank.notification.NotificationService;
import com.amenbank.notification.NotificationWebSocketHandler;
import com.amenbank.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TransferService {

    private final TransactionRepository transactionRepository;
    private final TransferRequestRepository transferRequestRepository;
    private final TransferBeneficiaryRepository transferBeneficiaryRepository;
    private final ScheduledTransferRepository scheduledTransferRepository;
    private final BankAccountRepository bankAccountRepository;
    private final TransactionHistoryRepository transactionHistoryRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final NotificationWebSocketHandler notificationWebSocketHandler;
    private final FraudDetectionService fraudDetectionService;
    private final OtpService otpService;
    private final UserRepository userRepository; // ADDED

    @Value("${app.transfer.auto-approve-threshold:1000}")
    private BigDecimal autoApproveThreshold;

    /**
     * Auto-approve + execute the transfer in-line when the amount is low enough
     * that no human review is required. Returns true if the transfer was
     * auto-executed.
     * Keeps the transfer PENDING (for employee approval) when the amount is above
     * the
     * threshold, or when fraud analysis has already raised a high-severity alert.
     */
    private boolean autoApproveIfBelowThreshold(Transaction transaction, BigDecimal totalAmount) {
        if (requiresEmployeeValidation(transaction.getType(), totalAmount)) {
            return false;
        }
        // Permanent transfers are approved here but executed later by the scheduler
        // on their start date — same contract as a normal employee approval.
        // approvedBy is set to the initiator so transaction_history.changed_by (NOT
        // NULL)
        // stays populated when executeTransfer logs subsequent status changes.
        transaction.setStatus(Transaction.TransactionStatus.APPROVED);
        transaction.setApprovedBy(transaction.getInitiatedBy());
        transactionRepository.save(transaction);
        logTransactionStatus(transaction, "PENDING", "APPROVED", transaction.getInitiatedBy(),
                "Auto-approved (amount <= threshold)");
        if (transaction.getType() != Transaction.TransactionType.TRANSFER_PERMANENT) {
            executeTransfer(transaction);
        }
        return true;
    }

    private boolean requiresEmployeeValidation(Transaction.TransactionType type, BigDecimal amount) {
        if (type == Transaction.TransactionType.TRANSFER_GROUPED
                || type == Transaction.TransactionType.TRANSFER_PERMANENT) {
            // Business rule: grouped/permanent transfers at threshold (>= 1000) need
            // employee validation.
            return amount.compareTo(autoApproveThreshold) >= 0;
        }
        return amount.compareTo(autoApproveThreshold) > 0;
    }

    @Transactional
    public TransactionResponse createSimpleTransfer(Long clientId, SimpleTransferRequest request, User user) {
        // Verify OTP code before proceeding
        boolean otpValid = otpService.verify(user, request.getOtpCode(), TwoFactorCode.OtpPurpose.TRANSFER);
        if (!otpValid) {
            throw new BusinessException("Code OTP invalide ou expire", "INVALID_OTP");
        }

        BankAccount source = bankAccountRepository.findByIdAndClientId(request.getSourceAccountId(), clientId)
                .orElseThrow(() -> new BusinessException("Source account not found", "ACCOUNT_NOT_FOUND",
                        HttpStatus.NOT_FOUND));

        validateAccountActive(source);
        validateBalance(source, request.getAmount());

        if (request.getDestinationIban().equalsIgnoreCase(source.getIban())) {
            throw new BusinessException("Le compte source et le compte destinataire doivent etre differents",
                    "SELF_TRANSFER_FORBIDDEN");
        }

        BankAccount destination = bankAccountRepository.findByIban(request.getDestinationIban()).orElse(null);

        if (destination != null && destination.getStatus() != BankAccount.AccountStatus.ACTIVE) {
            throw new BusinessException("Le compte destinataire est desactive", "DEST_ACCOUNT_DISABLED");
        }

        Transaction transaction = Transaction.builder()
                .reference(generateReference())
                .type(Transaction.TransactionType.TRANSFER_SIMPLE)
                .amount(request.getAmount())
                .sourceAccount(source)
                .destinationAccount(destination)
                .destinationExternalIban(destination == null ? request.getDestinationIban() : null)
                .descriptionText(request.getDescription())
                .initiatedBy(user)
                .build();
        transactionRepository.save(transaction);

        TransferRequest transferRequest = TransferRequest.builder()
                .transaction(transaction)
                .transferType(TransferRequest.TransferType.SIMPLE)
                .client(user)
                .build();
        transferRequestRepository.save(transferRequest);

        logTransactionStatus(transaction, null, "PENDING", user, "Transfer initiated");
        auditService.log(user, "INITIATE_SIMPLE_TRANSFER", "Transaction", transaction.getId(),
                "Simple transfer of " + request.getAmount() + " TND");

        fraudDetectionService.analyzeTransaction(transaction);

        boolean autoExecuted = autoApproveIfBelowThreshold(transaction, request.getAmount());
        if (autoExecuted) {
            notificationService.sendSuccess(user, "Virement execute",
                    "Votre virement de " + request.getAmount() + " TND vers " + request.getDestinationIban() +
                            " (ref: " + transaction.getReference() + ") a ete execute automatiquement.");
        } else {
            notificationService.sendInfo(user, "Virement initie",
                    "Votre virement de " + request.getAmount() + " TND vers " + request.getDestinationIban() +
                            " (ref: " + transaction.getReference()
                            + ") depasse le seuil d'auto-approbation et attend la validation d'un employe.");
            
            // Notify Employees to validate - ADDED
            userRepository.findAllByRoleName("EMPLOYEE").forEach(emp -> 
                notificationService.send(emp, "Nouveau virement a valider",
                    "Un virement de " + request.getAmount() + " TND par " + user.getFirstName() +
                            " attend votre validation. Action attendue: valider ou rejeter.",
                    Notification.NotificationType.TRANSFER)
            );
        }
        return mapToResponse(transaction);
    }

    @Transactional
    public TransactionResponse createGroupedTransfer(Long clientId, GroupedTransferRequest request, User user) {
        BankAccount source = bankAccountRepository.findByIdAndClientId(request.getSourceAccountId(), clientId)
                .orElseThrow(() -> new BusinessException("Source account not found", "ACCOUNT_NOT_FOUND",
                        HttpStatus.NOT_FOUND));

        validateAccountActive(source);

        for (GroupedTransferRequest.BeneficiaryDto b : request.getBeneficiaries()) {
            if (b.getBeneficiaryIban().equalsIgnoreCase(source.getIban())) {
                throw new BusinessException(
                        "Un beneficiaire ne peut pas etre le compte source",
                        "SELF_TRANSFER_FORBIDDEN");
            }
            // If the IBAN exists internally, ensure it's active (external IBANs are
            // allowed)
            BankAccount internalDest = bankAccountRepository.findByIban(b.getBeneficiaryIban()).orElse(null);
            if (internalDest != null && internalDest.getStatus() != BankAccount.AccountStatus.ACTIVE) {
                throw new BusinessException(
                        "Le compte beneficiaire " + b.getBeneficiaryIban() + " est desactive",
                        "DEST_ACCOUNT_DISABLED");
            }
        }

        BigDecimal totalAmount = request.getBeneficiaries().stream()
                .map(GroupedTransferRequest.BeneficiaryDto::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        validateBalance(source, totalAmount);

        Transaction transaction = Transaction.builder()
                .reference(generateReference())
                .type(Transaction.TransactionType.TRANSFER_GROUPED)
                .amount(totalAmount)
                .sourceAccount(source)
                .descriptionText(request.getDescription())
                .initiatedBy(user)
                .build();
        transactionRepository.save(transaction);

        TransferRequest transferRequest = TransferRequest.builder()
                .transaction(transaction)
                .transferType(TransferRequest.TransferType.GROUPED)
                .client(user)
                .build();
        transferRequestRepository.save(transferRequest);

        for (GroupedTransferRequest.BeneficiaryDto b : request.getBeneficiaries()) {
            BankAccount destAccount = bankAccountRepository.findByIban(b.getBeneficiaryIban()).orElse(null);
            TransferBeneficiary beneficiary = TransferBeneficiary.builder()
                    .transferRequest(transferRequest)
                    .beneficiaryName(b.getBeneficiaryName())
                    .beneficiaryIban(b.getBeneficiaryIban())
                    .amount(b.getAmount())
                    .destinationAccount(destAccount)
                    .build();
            transferBeneficiaryRepository.save(beneficiary);
        }

        logTransactionStatus(transaction, null, "PENDING", user, "Grouped transfer initiated");
        auditService.log(user, "INITIATE_GROUPED_TRANSFER", "Transaction", transaction.getId(),
                "Grouped transfer of " + totalAmount + " TND to " + request.getBeneficiaries().size()
                        + " beneficiaries");

        fraudDetectionService.analyzeTransaction(transaction);

        boolean autoExecuted = autoApproveIfBelowThreshold(transaction, totalAmount);
        if (autoExecuted) {
            notificationService.sendSuccess(user, "Virement groupe execute",
                    "Votre virement groupe de " + totalAmount + " TND vers " + request.getBeneficiaries().size() +
                            " beneficiaire(s) (ref: " + transaction.getReference()
                            + ") a ete execute automatiquement.");
        } else {
            notificationService.sendInfo(user, "Virement groupe initie",
                    "Votre virement groupe de " + totalAmount + " TND vers " + request.getBeneficiaries().size() +
                            " beneficiaire(s) (ref: " + transaction.getReference()
                            + ") depasse le seuil d'auto-approbation et attend la validation d'un employe.");
            
            // Notify Employees to validate - ADDED
            userRepository.findAllByRoleName("EMPLOYEE").forEach(emp -> 
                notificationService.send(emp, "Nouveau virement groupe a valider",
                    "Un virement groupe de " + totalAmount + " TND par " + user.getFirstName() +
                            " attend votre validation. Action attendue: valider ou rejeter.",
                    Notification.NotificationType.TRANSFER)
            );
        }
        return mapToResponse(transaction);
    }

    @Transactional
    public TransactionResponse createPermanentTransfer(Long clientId, PermanentTransferRequest request, User user) {
        BankAccount source = bankAccountRepository.findByIdAndClientId(request.getSourceAccountId(), clientId)
                .orElseThrow(() -> new BusinessException("Source account not found", "ACCOUNT_NOT_FOUND",
                        HttpStatus.NOT_FOUND));

        validateAccountActive(source);

        if (request.getDestinationIban().equalsIgnoreCase(source.getIban())) {
            throw new BusinessException("Le compte source et le compte destinataire doivent etre differents",
                    "SELF_TRANSFER_FORBIDDEN");
        }

        if (request.getEndDate() != null && request.getEndDate().isBefore(request.getStartDate())) {
            throw new BusinessException("La date de fin doit etre posterieure a la date de debut",
                    "INVALID_DATE_RANGE");
        }

        BankAccount destination = bankAccountRepository.findByIban(request.getDestinationIban()).orElse(null);
        if (destination != null && destination.getStatus() != BankAccount.AccountStatus.ACTIVE) {
            throw new BusinessException("Le compte destinataire est desactive", "DEST_ACCOUNT_DISABLED");
        }

        Transaction transaction = Transaction.builder()
                .reference(generateReference())
                .type(Transaction.TransactionType.TRANSFER_PERMANENT)
                .amount(request.getAmount())
                .sourceAccount(source)
                .destinationAccount(destination)
                .destinationExternalIban(destination == null ? request.getDestinationIban() : null)
                .descriptionText(request.getDescription())
                .initiatedBy(user)
                .build();
        transactionRepository.save(transaction);

        TransferRequest transferRequest = TransferRequest.builder()
                .transaction(transaction)
                .transferType(TransferRequest.TransferType.PERMANENT)
                .client(user)
                .build();
        transferRequestRepository.save(transferRequest);

        ScheduledTransfer scheduled = ScheduledTransfer.builder()
                .transferRequest(transferRequest)
                .frequency(ScheduledTransfer.Frequency.valueOf(request.getFrequency()))
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .nextExecutionDate(request.getStartDate())
                .sourceAccount(source)
                .destinationIban(request.getDestinationIban())
                .amount(request.getAmount())
                .build();
        scheduledTransferRepository.save(scheduled);

        logTransactionStatus(transaction, null, "PENDING", user, "Permanent transfer initiated");
        auditService.log(user, "INITIATE_PERMANENT_TRANSFER", "Transaction", transaction.getId(),
                "Permanent transfer of " + request.getAmount() + " TND, frequency: " + request.getFrequency());

        fraudDetectionService.analyzeTransaction(transaction);

        boolean autoExecuted = autoApproveIfBelowThreshold(transaction, request.getAmount());
        if (autoExecuted) {
            notificationService.sendSuccess(user, "Virement permanent active",
                    "Votre virement permanent de " + request.getAmount() + " TND vers " + request.getDestinationIban() +
                            " (frequence: " + request.getFrequency() + ", debut: " + request.getStartDate() +
                            ") a ete approuve automatiquement. Les executions se feront selon la frequence choisie.");
        } else {
            notificationService.sendInfo(user, "Virement permanent planifie",
                    "Votre virement permanent de " + request.getAmount() + " TND vers " + request.getDestinationIban() +
                            " (frequence: " + request.getFrequency() + ", debut: " + request.getStartDate() +
                            ") depasse le seuil d'auto-approbation et attend la validation d'un employe.");
            
            // Notify Employees to validate - ADDED
            userRepository.findAllByRoleName("EMPLOYEE").forEach(emp -> 
                notificationService.send(emp, "Nouveau virement permanent a valider",
                    "Un virement permanent de " + request.getAmount() + " TND par " + user.getFirstName() +
                            " attend votre validation. Action attendue: valider ou rejeter.",
                    Notification.NotificationType.TRANSFER)
            );
        }
        return mapToResponse(transaction);
    }

    public Page<TransactionResponse> getClientTransfers(Long clientId, Pageable pageable) {
        List<Long> accountIds = bankAccountRepository.findByClientId(clientId).stream()
                .map(BankAccount::getId).collect(Collectors.toList());
        if (accountIds.isEmpty())
            return Page.empty(pageable);

        return transactionRepository.findByAccountIds(accountIds, pageable)
                .map(this::mapToResponse);
    }

    public Page<TransactionResponse> getPendingTransfers(Pageable pageable) {
        List<Transaction.TransactionType> types = List.of(
                Transaction.TransactionType.TRANSFER_SIMPLE,
                Transaction.TransactionType.TRANSFER_GROUPED,
                Transaction.TransactionType.TRANSFER_PERMANENT);
        return transactionRepository.findByStatusAndTypeIn(Transaction.TransactionStatus.PENDING, types, pageable)
                .map(this::mapToResponse);
    }

    @Transactional
    public void approveTransfer(Long transactionId, User approver, String comment) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(
                        () -> new BusinessException("Transaction not found", "TX_NOT_FOUND", HttpStatus.NOT_FOUND));

        if (transaction.getStatus() != Transaction.TransactionStatus.PENDING) {
            throw new BusinessException("Transaction is not pending", "TX_NOT_PENDING");
        }

        transaction.setStatus(Transaction.TransactionStatus.APPROVED);
        transaction.setApprovedBy(approver);
        transactionRepository.save(transaction);

        logTransactionStatus(transaction, "PENDING", "APPROVED", approver, comment);

        // Permanent transfers are executed by ScheduledTransferExecutor on their
        // startDate.
        // Approving only activates the schedule — do NOT debit here (would
        // double-charge).
        if (transaction.getType() != Transaction.TransactionType.TRANSFER_PERMANENT) {
            executeTransfer(transaction);
        }

        auditService.log(approver, "APPROVE_TRANSFER", "Transaction", transactionId,
                "Approved transfer " + transaction.getReference());
        String notifMsg = transaction.getType() == Transaction.TransactionType.TRANSFER_PERMANENT
                ? "Votre virement permanent " + transaction.getReference()
                        + " a ete approuve. Les executions seront automatiques selon la frequence choisie."
                : "Votre virement " + transaction.getReference() + " a ete approuve et execute.";
        notificationService.sendSuccess(transaction.getInitiatedBy(), "Virement approuve", notifMsg);
        
        // Notify Administrator if amount > 1000 - ADDED
        if (transaction.getAmount().compareTo(new BigDecimal(1000)) > 0) {
            userRepository.findAllByRoleName("ADMIN").forEach(admin -> 
                notificationService.send(admin, "Virement important valide",
                    "Un virement de " + transaction.getAmount() + " TND (ref: " + transaction.getReference() +
                            ") a ete valide par " + approver.getFirstName() + ".",
                    Notification.NotificationType.TRANSFER)
            );
            
            // If approver is ADMIN, notify all 3 roles - ADDED
            if (approver.getRole().getName().equals("ADMIN")) {
                userRepository.findAllByRoleName("EMPLOYEE").forEach(emp -> 
                    notificationService.sendInfo(emp, "Virement supervise par Admin", "Le virement " + transaction.getReference() + " a ete finalise par l'administrateur.")
                );
            }
        }
        
        notificationWebSocketHandler.broadcastBadgeRefresh();
    }

    @Transactional
    public void rejectTransfer(Long transactionId, User rejector, String comment) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(
                        () -> new BusinessException("Transaction not found", "TX_NOT_FOUND", HttpStatus.NOT_FOUND));

        if (transaction.getStatus() != Transaction.TransactionStatus.PENDING) {
            throw new BusinessException("Transaction is not pending", "TX_NOT_PENDING");
        }

        transaction.setStatus(Transaction.TransactionStatus.REJECTED);
        transaction.setApprovedBy(rejector);
        transactionRepository.save(transaction);

        logTransactionStatus(transaction, "PENDING", "REJECTED", rejector, comment);
        auditService.log(rejector, "REJECT_TRANSFER", "Transaction", transactionId,
                "Rejected transfer " + transaction.getReference());
        notificationService.sendError(transaction.getInitiatedBy(), "Virement refuse",
                "Votre virement " + transaction.getReference() + " a ete refuse. Motif: " + comment);
        notificationWebSocketHandler.broadcastBadgeRefresh();
    }

    private void executeTransfer(Transaction transaction) {
        BankAccount source = transaction.getSourceAccount();

        // Re-check account is still active at execution time (admin may have disabled
        // it after approval)
        if (source.getStatus() != BankAccount.AccountStatus.ACTIVE) {
            transaction.setStatus(Transaction.TransactionStatus.FAILED);
            transactionRepository.save(transaction);
            logTransactionStatus(transaction, "APPROVED", "FAILED", transaction.getApprovedBy(),
                    "Source account is disabled");
            return;
        }

        if (source.getBalance().compareTo(transaction.getAmount()) < 0) {
            transaction.setStatus(Transaction.TransactionStatus.FAILED);
            transactionRepository.save(transaction);
            logTransactionStatus(transaction, "APPROVED", "FAILED", transaction.getApprovedBy(),
                    "Insufficient balance");
            return;
        }

        // For non-grouped transfers, check destination is still active before debiting
        if (transaction.getType() != Transaction.TransactionType.TRANSFER_GROUPED
                && transaction.getDestinationAccount() != null
                && transaction.getDestinationAccount().getStatus() != BankAccount.AccountStatus.ACTIVE) {
            transaction.setStatus(Transaction.TransactionStatus.FAILED);
            transactionRepository.save(transaction);
            logTransactionStatus(transaction, "APPROVED", "FAILED", transaction.getApprovedBy(),
                    "Destination account is disabled");
            notificationService.sendError(transaction.getInitiatedBy(), "Virement echoue",
                    "Votre virement " + transaction.getReference() +
                            " a echoue : le compte destinataire est desactive.");
            return;
        }

        source.setBalance(source.getBalance().subtract(transaction.getAmount()));
        bankAccountRepository.save(source);

        if (transaction.getType() == Transaction.TransactionType.TRANSFER_GROUPED) {
            creditGroupedBeneficiaries(transaction);
        } else if (transaction.getDestinationAccount() != null) {
            BankAccount dest = transaction.getDestinationAccount();
            dest.setBalance(dest.getBalance().add(transaction.getAmount()));
            bankAccountRepository.save(dest);
            // Notify destination client that they received money
            if (dest.getClient() != null && !dest.getClient().getId().equals(transaction.getInitiatedBy().getId())) {
                notificationService.sendSuccess(dest.getClient(), "Virement recu",
                        "Vous avez recu " + transaction.getAmount() + " TND sur votre compte " + dest.getAccountNumber()
                                +
                                " (ref: " + transaction.getReference() + "). Nouveau solde: " + dest.getBalance()
                                + " TND.");
            }
        }

        transaction.setStatus(Transaction.TransactionStatus.EXECUTED);
        transaction.setExecutedAt(LocalDateTime.now());
        transactionRepository.save(transaction);

        logTransactionStatus(transaction, "APPROVED", "EXECUTED", transaction.getApprovedBy(), "Transfer executed");
    }

    public Page<TransactionResponse> getAllTransfers(Pageable pageable) {
        List<Transaction.TransactionType> types = List.of(
                Transaction.TransactionType.TRANSFER_SIMPLE,
                Transaction.TransactionType.TRANSFER_GROUPED,
                Transaction.TransactionType.TRANSFER_PERMANENT);
        return transactionRepository.findByTypeIn(types, pageable).map(this::mapToResponse);
    }

    public Page<TransactionResponse> getTransfersByStatus(String status, Pageable pageable) {
        List<Transaction.TransactionType> types = List.of(
                Transaction.TransactionType.TRANSFER_SIMPLE,
                Transaction.TransactionType.TRANSFER_GROUPED,
                Transaction.TransactionType.TRANSFER_PERMANENT);
        Transaction.TransactionStatus txStatus = Transaction.TransactionStatus.valueOf(status.toUpperCase());
        return transactionRepository.findByStatusAndTypeInOrdered(txStatus, types, pageable).map(this::mapToResponse);
    }

    private void creditGroupedBeneficiaries(Transaction transaction) {
        TransferRequest tr = transferRequestRepository.findByTransactionId(transaction.getId()).orElse(null);
        if (tr == null)
            return;
        BankAccount source = transaction.getSourceAccount();
        BigDecimal refund = BigDecimal.ZERO;
        List<TransferBeneficiary> beneficiaries = transferBeneficiaryRepository.findByTransferRequestId(tr.getId());
        for (TransferBeneficiary b : beneficiaries) {
            BankAccount dest = b.getDestinationAccount();
            if (dest == null) {
                // External IBAN - money leaves the bank, nothing to credit internally.
                continue;
            }
            if (dest.getStatus() != BankAccount.AccountStatus.ACTIVE) {
                // Dest became disabled between creation and execution - refund source.
                refund = refund.add(b.getAmount());
                continue;
            }
            dest.setBalance(dest.getBalance().add(b.getAmount()));
            bankAccountRepository.save(dest);
            if (dest.getClient() != null && !dest.getClient().getId().equals(transaction.getInitiatedBy().getId())) {
                notificationService.sendSuccess(dest.getClient(), "Virement recu",
                        "Vous avez recu " + b.getAmount() + " TND sur votre compte " + dest.getAccountNumber() +
                                " (ref: " + transaction.getReference() + "). Nouveau solde: " + dest.getBalance()
                                + " TND.");
            }
        }
        if (refund.compareTo(BigDecimal.ZERO) > 0) {
            source.setBalance(source.getBalance().add(refund));
            bankAccountRepository.save(source);
            notificationService.sendWarning(transaction.getInitiatedBy(), "Virement groupe partiel",
                    refund + " TND ont ete rembourses car un ou plusieurs beneficiaires internes sont desactives (ref: "
                            +
                            transaction.getReference() + ").");
        }
    }

    private void validateBalance(BankAccount account, BigDecimal amount) {
        if (account.getBalance().compareTo(amount) < 0) {
            throw new BusinessException("Insufficient balance", "INSUFFICIENT_BALANCE");
        }
    }

    private void validateAccountActive(BankAccount account) {
        if (account.getStatus() != BankAccount.AccountStatus.ACTIVE) {
            throw new BusinessException(
                    "Ce compte bancaire est desactive. Les virements ne sont pas autorises.",
                    "ACCOUNT_DISABLED");
        }
    }

    private void logTransactionStatus(Transaction tx, String oldStatus, String newStatus, User changedBy,
            String comment) {
        TransactionHistory history = TransactionHistory.builder()
                .transaction(tx)
                .oldStatus(oldStatus)
                .newStatus(newStatus)
                .changedBy(changedBy)
                .comment(comment)
                .build();
        transactionHistoryRepository.save(history);
    }

    private String generateReference() {
        String ref;
        do {
            ref = "TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        } while (transactionRepository.existsByReference(ref));
        return ref;
    }

    private TransactionResponse mapToResponse(Transaction t) {
        return TransactionResponse.builder()
                .id(t.getId())
                .reference(t.getReference())
                .type(t.getType().name())
                .status(t.getStatus().name())
                .amount(t.getAmount())
                .currency(t.getCurrency())
                .sourceAccountIban(t.getSourceAccount() != null ? t.getSourceAccount().getIban() : null)
                .destinationAccountIban(t.getDestinationAccount() != null ? t.getDestinationAccount().getIban() : null)
                .destinationExternalIban(t.getDestinationExternalIban())
                .description(t.getDescriptionText())
                .initiatedByName(t.getInitiatedBy().getFirstName() + " " + t.getInitiatedBy().getLastName())
                .approvedByName(t.getApprovedBy() != null
                        ? t.getApprovedBy().getFirstName() + " " + t.getApprovedBy().getLastName()
                        : null)
                .executedAt(t.getExecutedAt())
                .createdAt(t.getCreatedAt())
                .build();
    }
}
