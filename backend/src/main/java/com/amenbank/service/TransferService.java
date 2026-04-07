package com.amenbank.service;

import com.amenbank.audit.AuditService;
import com.amenbank.dto.request.GroupedTransferRequest;
import com.amenbank.dto.request.PermanentTransferRequest;
import com.amenbank.dto.request.SimpleTransferRequest;
import com.amenbank.dto.response.TransactionResponse;
import com.amenbank.entity.*;
import com.amenbank.exception.BusinessException;
import com.amenbank.notification.NotificationService;
import com.amenbank.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
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

    @Transactional
    public TransactionResponse createSimpleTransfer(Long clientId, SimpleTransferRequest request, User user) {
        BankAccount source = bankAccountRepository.findByIdAndClientId(request.getSourceAccountId(), clientId)
                .orElseThrow(() -> new BusinessException("Source account not found", "ACCOUNT_NOT_FOUND", HttpStatus.NOT_FOUND));

        validateBalance(source, request.getAmount());

        BankAccount destination = bankAccountRepository.findByIban(request.getDestinationIban()).orElse(null);

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

        return mapToResponse(transaction);
    }

    @Transactional
    public TransactionResponse createGroupedTransfer(Long clientId, GroupedTransferRequest request, User user) {
        BankAccount source = bankAccountRepository.findByIdAndClientId(request.getSourceAccountId(), clientId)
                .orElseThrow(() -> new BusinessException("Source account not found", "ACCOUNT_NOT_FOUND", HttpStatus.NOT_FOUND));

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
                "Grouped transfer of " + totalAmount + " TND to " + request.getBeneficiaries().size() + " beneficiaries");

        return mapToResponse(transaction);
    }

    @Transactional
    public TransactionResponse createPermanentTransfer(Long clientId, PermanentTransferRequest request, User user) {
        BankAccount source = bankAccountRepository.findByIdAndClientId(request.getSourceAccountId(), clientId)
                .orElseThrow(() -> new BusinessException("Source account not found", "ACCOUNT_NOT_FOUND", HttpStatus.NOT_FOUND));

        Transaction transaction = Transaction.builder()
                .reference(generateReference())
                .type(Transaction.TransactionType.TRANSFER_PERMANENT)
                .amount(request.getAmount())
                .sourceAccount(source)
                .destinationExternalIban(request.getDestinationIban())
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

        return mapToResponse(transaction);
    }

    public Page<TransactionResponse> getClientTransfers(Long clientId, Pageable pageable) {
        List<Long> accountIds = bankAccountRepository.findByClientId(clientId).stream()
                .map(BankAccount::getId).collect(Collectors.toList());
        if (accountIds.isEmpty()) return Page.empty(pageable);

        List<Transaction.TransactionType> transferTypes = List.of(
                Transaction.TransactionType.TRANSFER_SIMPLE,
                Transaction.TransactionType.TRANSFER_GROUPED,
                Transaction.TransactionType.TRANSFER_PERMANENT
        );

        return transactionRepository.findByAccountIds(accountIds, pageable)
                .map(this::mapToResponse);
    }

    public Page<TransactionResponse> getPendingTransfers(Pageable pageable) {
        List<Transaction.TransactionType> types = List.of(
                Transaction.TransactionType.TRANSFER_SIMPLE,
                Transaction.TransactionType.TRANSFER_GROUPED,
                Transaction.TransactionType.TRANSFER_PERMANENT
        );
        return transactionRepository.findByStatusAndTypeIn(Transaction.TransactionStatus.PENDING, types, pageable)
                .map(this::mapToResponse);
    }

    @Transactional
    public void approveTransfer(Long transactionId, User approver, String comment) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new BusinessException("Transaction not found", "TX_NOT_FOUND", HttpStatus.NOT_FOUND));

        if (transaction.getStatus() != Transaction.TransactionStatus.PENDING) {
            throw new BusinessException("Transaction is not pending", "TX_NOT_PENDING");
        }

        transaction.setStatus(Transaction.TransactionStatus.APPROVED);
        transaction.setApprovedBy(approver);
        transactionRepository.save(transaction);

        logTransactionStatus(transaction, "PENDING", "APPROVED", approver, comment);
        executeTransfer(transaction);

        auditService.log(approver, "APPROVE_TRANSFER", "Transaction", transactionId,
                "Approved transfer " + transaction.getReference());
        notificationService.sendSuccess(transaction.getInitiatedBy(), "Virement approuve",
                "Votre virement " + transaction.getReference() + " a ete approuve et execute.");
    }

    @Transactional
    public void rejectTransfer(Long transactionId, User rejector, String comment) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new BusinessException("Transaction not found", "TX_NOT_FOUND", HttpStatus.NOT_FOUND));

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
    }

    private void executeTransfer(Transaction transaction) {
        BankAccount source = transaction.getSourceAccount();
        if (source.getBalance().compareTo(transaction.getAmount()) < 0) {
            transaction.setStatus(Transaction.TransactionStatus.FAILED);
            transactionRepository.save(transaction);
            logTransactionStatus(transaction, "APPROVED", "FAILED", transaction.getApprovedBy(), "Insufficient balance");
            return;
        }

        source.setBalance(source.getBalance().subtract(transaction.getAmount()));
        bankAccountRepository.save(source);

        if (transaction.getDestinationAccount() != null) {
            BankAccount dest = transaction.getDestinationAccount();
            dest.setBalance(dest.getBalance().add(transaction.getAmount()));
            bankAccountRepository.save(dest);
        }

        transaction.setStatus(Transaction.TransactionStatus.EXECUTED);
        transaction.setExecutedAt(LocalDateTime.now());
        transactionRepository.save(transaction);

        logTransactionStatus(transaction, "APPROVED", "EXECUTED", transaction.getApprovedBy(), "Transfer executed");
    }

    private void validateBalance(BankAccount account, BigDecimal amount) {
        if (account.getBalance().compareTo(amount) < 0) {
            throw new BusinessException("Insufficient balance", "INSUFFICIENT_BALANCE");
        }
    }

    private void logTransactionStatus(Transaction tx, String oldStatus, String newStatus, User changedBy, String comment) {
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
                .approvedByName(t.getApprovedBy() != null ? t.getApprovedBy().getFirstName() + " " + t.getApprovedBy().getLastName() : null)
                .executedAt(t.getExecutedAt())
                .createdAt(t.getCreatedAt())
                .build();
    }
}
