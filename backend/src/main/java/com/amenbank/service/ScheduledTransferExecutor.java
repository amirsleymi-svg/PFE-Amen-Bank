package com.amenbank.service;

import com.amenbank.audit.AuditService;
import com.amenbank.entity.*;
import com.amenbank.notification.NotificationService;
import com.amenbank.repository.BankAccountRepository;
import com.amenbank.repository.ScheduledTransferRepository;
import com.amenbank.repository.TransactionHistoryRepository;
import com.amenbank.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class ScheduledTransferExecutor {

    private final ScheduledTransferRepository scheduledTransferRepository;
    private final BankAccountRepository bankAccountRepository;
    private final TransactionRepository transactionRepository;
    private final TransactionHistoryRepository transactionHistoryRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;

    /**
     * Runs every day at 06:00 to execute due permanent transfers.
     */
    @Scheduled(cron = "0 0 6 * * *")
    public void executeDueTransfers() {
        LocalDate today = LocalDate.now();
        List<ScheduledTransfer> dueTransfers = scheduledTransferRepository
                .findByIsActiveTrueAndNextExecutionDateLessThanEqual(today);

        log.info("Scheduled transfer executor: {} transfers due for execution", dueTransfers.size());

        for (ScheduledTransfer st : dueTransfers) {
            try {
                executeSingleTransfer(st);
            } catch (Exception e) {
                log.error("Failed to execute scheduled transfer id={}: {}", st.getId(), e.getMessage());
                notifyTransferFailure(st, e.getMessage());
            }
        }
    }

    @Transactional
    protected void executeSingleTransfer(ScheduledTransfer st) {
        BankAccount source = st.getSourceAccount();
        User client = source.getClient();
        BigDecimal amount = st.getAmount();

        // Gate: only execute once the originating permanent transfer has been approved.
        // While pending or rejected, the scheduler silently skips this cycle without
        // advancing the next execution date (so approval later resumes as planned).
        Transaction origin = st.getTransferRequest() != null ? st.getTransferRequest().getTransaction() : null;
        if (origin == null || origin.getStatus() == Transaction.TransactionStatus.PENDING) {
            log.info("Skipping scheduled transfer id={} — awaiting approval", st.getId());
            return;
        }
        if (origin.getStatus() != Transaction.TransactionStatus.APPROVED
                && origin.getStatus() != Transaction.TransactionStatus.EXECUTED) {
            st.setIsActive(false);
            scheduledTransferRepository.save(st);
            notificationService.sendWarning(client, "Virement permanent annule",
                    "Le virement permanent de " + amount + " TND vers " + st.getDestinationIban() +
                    " a ete annule (" + origin.getStatus() + ") et ne sera plus execute.");
            return;
        }

        // Skip if account is disabled — admin has blocked this account
        if (source.getStatus() != BankAccount.AccountStatus.ACTIVE) {
            notificationService.sendWarning(client, "Virement permanent bloque",
                    "Le virement permanent de " + amount + " TND vers " + st.getDestinationIban() +
                    " n'a pas ete execute car votre compte est desactive.");
            log.warn("Skipping scheduled transfer id={} — source account {} is not active (status={})",
                    st.getId(), source.getAccountNumber(), source.getStatus());
            advanceNextExecutionDate(st);
            return;
        }

        // Check balance
        if (source.getBalance().compareTo(amount) < 0) {
            notificationService.sendWarning(client, "Virement permanent echoue",
                    "Solde insuffisant pour le virement permanent de " + amount + " TND vers " + st.getDestinationIban() +
                    ". Solde actuel: " + source.getBalance() + " TND.");
            log.warn("Insufficient balance for scheduled transfer id={}, balance={}, amount={}", st.getId(), source.getBalance(), amount);
            // Don't deactivate — try again next cycle
            advanceNextExecutionDate(st);
            return;
        }

        // Debit source
        source.setBalance(source.getBalance().subtract(amount));
        bankAccountRepository.save(source);

        // Credit destination if internal and active
        BankAccount destination = bankAccountRepository.findByIban(st.getDestinationIban()).orElse(null);
        if (destination != null && destination.getStatus() == BankAccount.AccountStatus.ACTIVE) {
            destination.setBalance(destination.getBalance().add(amount));
            bankAccountRepository.save(destination);
        } else if (destination != null) {
            // Destination exists but disabled — refund source and skip
            source.setBalance(source.getBalance().add(amount));
            bankAccountRepository.save(source);
            notificationService.sendWarning(client, "Virement permanent echoue",
                    "Le virement permanent de " + amount + " TND vers " + st.getDestinationIban() +
                            " a echoue : le compte destinataire est desactive.");
            advanceNextExecutionDate(st);
            return;
        }

        // Create transaction record
        String ref = "TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Transaction transaction = Transaction.builder()
                .reference(ref)
                .type(Transaction.TransactionType.TRANSFER_PERMANENT)
                .status(Transaction.TransactionStatus.EXECUTED)
                .amount(amount)
                .sourceAccount(source)
                .destinationAccount(destination)
                .destinationExternalIban(destination == null ? st.getDestinationIban() : null)
                .descriptionText("Virement permanent automatique")
                .initiatedBy(client)
                .executedAt(LocalDateTime.now())
                .build();
        transactionRepository.save(transaction);

        // Log history
        TransactionHistory history = TransactionHistory.builder()
                .transaction(transaction)
                .oldStatus(null)
                .newStatus("EXECUTED")
                .changedBy(client)
                .comment("Automatic scheduled execution")
                .build();
        transactionHistoryRepository.save(history);

        // Update scheduled transfer
        st.setLastExecutedAt(LocalDateTime.now());
        advanceNextExecutionDate(st);

        // Notify client
        notificationService.send(client, "Virement permanent execute",
                "Votre virement permanent de " + amount + " TND vers " + st.getDestinationIban() +
                " a ete execute avec succes. Nouveau solde: " + source.getBalance() + " TND." +
                " Prochaine execution: " + (st.getIsActive() ? st.getNextExecutionDate().toString() : "termine"),
                Notification.NotificationType.TRANSFER);

        // Notify destination client (internal only, different from source)
        if (destination != null && destination.getClient() != null
                && !destination.getClient().getId().equals(client.getId())) {
            notificationService.sendSuccess(destination.getClient(), "Virement recu",
                    "Vous avez recu " + amount + " TND sur votre compte " + destination.getAccountNumber() +
                    " (virement permanent, ref: " + ref + "). Nouveau solde: " + destination.getBalance() + " TND.");
        }

        auditService.log(client, "SCHEDULED_TRANSFER_EXECUTED", "ScheduledTransfer", st.getId(),
                "Permanent transfer of " + amount + " TND to " + st.getDestinationIban());

        log.info("Executed scheduled transfer id={}, amount={}, destination={}", st.getId(), amount, st.getDestinationIban());
    }

    private void advanceNextExecutionDate(ScheduledTransfer st) {
        LocalDate next = calculateNextDate(st.getNextExecutionDate(), st.getFrequency());

        // If end date is set and next date exceeds it, deactivate
        if (st.getEndDate() != null && next.isAfter(st.getEndDate())) {
            st.setIsActive(false);
            scheduledTransferRepository.save(st);
            notificationService.sendInfo(st.getSourceAccount().getClient(), "Virement permanent termine",
                    "Votre virement permanent de " + st.getAmount() + " TND vers " + st.getDestinationIban() +
                    " est arrive a echeance et a ete desactive.");
        } else {
            st.setNextExecutionDate(next);
            scheduledTransferRepository.save(st);
        }
    }

    private LocalDate calculateNextDate(LocalDate current, ScheduledTransfer.Frequency frequency) {
        return switch (frequency) {
            case DAILY -> current.plusDays(1);
            case WEEKLY -> current.plusWeeks(1);
            case MONTHLY -> current.plusMonths(1);
            case QUARTERLY -> current.plusMonths(3);
            case YEARLY -> current.plusYears(1);
        };
    }

    private void notifyTransferFailure(ScheduledTransfer st, String reason) {
        try {
            User client = st.getSourceAccount().getClient();
            notificationService.sendError(client, "Erreur virement permanent",
                    "Une erreur est survenue lors de l'execution de votre virement permanent de " +
                    st.getAmount() + " TND vers " + st.getDestinationIban() + ". Raison: " + reason);
        } catch (Exception e) {
            log.error("Failed to send failure notification for scheduled transfer id={}", st.getId());
        }
    }
}
