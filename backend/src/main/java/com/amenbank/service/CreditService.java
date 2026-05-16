package com.amenbank.service;

import com.amenbank.audit.AuditService;
import com.amenbank.dto.request.CreditRequestDto;
import com.amenbank.dto.request.CreditSimulationRequest;
import com.amenbank.dto.response.CreditRequestResponse;
import com.amenbank.dto.response.CreditSimulationResponse;
import com.amenbank.entity.BankAccount;
import com.amenbank.entity.CreditRequest;
import com.amenbank.entity.CreditSimulation;
import com.amenbank.entity.Notification;
import com.amenbank.entity.Transaction;
import com.amenbank.entity.User;
import com.amenbank.exception.BusinessException;
import com.amenbank.notification.NotificationService;
import com.amenbank.notification.NotificationWebSocketHandler;
import com.amenbank.repository.BankAccountRepository;
import com.amenbank.repository.CreditRequestRepository;
import com.amenbank.repository.CreditSimulationRepository;
import com.amenbank.repository.TransactionRepository;
import com.amenbank.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CreditService {

    private final CreditRequestRepository creditRequestRepository;
    private final CreditSimulationRepository creditSimulationRepository;
    private final BankAccountRepository bankAccountRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final NotificationWebSocketHandler notificationWebSocketHandler;

    private static final BigDecimal DEFAULT_INTEREST_RATE = new BigDecimal("7.50");

    public CreditSimulationResponse simulate(CreditSimulationRequest request, User user) {
        BigDecimal rate = request.getInterestRate() != null ? request.getInterestRate() : DEFAULT_INTEREST_RATE;
        CreditSimulationResponse result = calculateCredit(request.getAmount(), request.getDurationMonths(), rate);

        CreditSimulation simulation = CreditSimulation.builder()
                .client(user)
                .amount(request.getAmount())
                .durationMonths(request.getDurationMonths())
                .interestRate(result.getInterestRate())
                .monthlyPayment(result.getMonthlyPayment())
                .totalCost(result.getTotalCost())
                .build();
        creditSimulationRepository.save(simulation);

        return result;
    }

    @Transactional
    public CreditRequestResponse createRequest(CreditRequestDto dto, User user) {
        CreditSimulationResponse calc = calculateCredit(dto.getAmount(), dto.getDurationMonths(), DEFAULT_INTEREST_RATE);

        CreditRequest request = CreditRequest.builder()
                .client(user)
                .amount(dto.getAmount())
                .durationMonths(dto.getDurationMonths())
                .interestRate(calc.getInterestRate())
                .monthlyPayment(calc.getMonthlyPayment())
                .totalCost(calc.getTotalCost())
                .purpose(dto.getPurpose())
                .build();
        creditRequestRepository.save(request);

        auditService.log(user, "CREATE_CREDIT_REQUEST", "CreditRequest", request.getId(),
                "Credit request of " + dto.getAmount() + " TND for " + dto.getDurationMonths() + " months");

        notificationService.sendInfo(user, "Demande de credit enregistree",
                "Votre demande de credit de " + dto.getAmount() + " TND sur " + dto.getDurationMonths() +
                " mois (ref: CR-" + String.format("%06d", request.getId()) + ") est en attente d'approbation. " +
                "Vous serez notifie des qu'un employe aura traite votre dossier.");

        notifyEmployees("Nouveau credit a valider",
                "Demande CR-" + String.format("%06d", request.getId()) + " de " + dto.getAmount() +
                        " TND pour " + user.getFirstName() + " " + user.getLastName() +
                        ". Action attendue: analyser puis approuver ou rejeter le dossier.");

        notificationWebSocketHandler.broadcastBadgeRefresh();
        return mapToResponse(request);
    }

    public Page<CreditRequestResponse> getClientCredits(Long clientId, Pageable pageable) {
        return creditRequestRepository.findByClientId(clientId, pageable).map(this::mapToResponse);
    }

    public Page<CreditRequestResponse> getPendingCredits(Pageable pageable) {
        return creditRequestRepository.findByStatus(CreditRequest.CreditStatus.PENDING, pageable).map(this::mapToResponse);
    }

    public Page<CreditRequestResponse> getAllCredits(Pageable pageable) {
        return creditRequestRepository.findAllByOrderByCreatedAtDesc(pageable).map(this::mapToResponse);
    }

    public Page<CreditRequestResponse> getCreditsByStatus(String status, Pageable pageable) {
        CreditRequest.CreditStatus creditStatus = CreditRequest.CreditStatus.valueOf(status.toUpperCase());
        return creditRequestRepository.findByStatus(creditStatus, pageable).map(this::mapToResponse);
    }

    @Transactional
    public void approve(Long id, User reviewer, String comment) {
        CreditRequest request = creditRequestRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Credit request not found", "CR_NOT_FOUND", HttpStatus.NOT_FOUND));

        if (request.getStatus() != CreditRequest.CreditStatus.PENDING) {
            throw new BusinessException("Request already processed", "CR_ALREADY_PROCESSED");
        }

        User client = request.getClient();

        // Find the client's first ACTIVE bank account for disbursement
        List<BankAccount> accounts = bankAccountRepository.findByClientId(client.getId());
        BankAccount targetAccount = accounts.stream()
                .filter(a -> a.getStatus() == BankAccount.AccountStatus.ACTIVE)
                .findFirst()
                .orElseThrow(() -> new BusinessException(
                        "Le client n'a aucun compte bancaire actif pour recevoir le credit",
                        "NO_ACTIVE_ACCOUNT"));

        // Update credit status → DISBURSED (approved + money sent in one step)
        request.setStatus(CreditRequest.CreditStatus.DISBURSED);
        request.setReviewedBy(reviewer);
        request.setDecisionComment(comment);
        request.setReviewedAt(LocalDateTime.now());
        creditRequestRepository.save(request);

        // Disburse: credit the client's account
        targetAccount.setBalance(targetAccount.getBalance().add(request.getAmount()));
        bankAccountRepository.save(targetAccount);

        Transaction disbursement = Transaction.builder()
                .reference(generateCreditReference())
                .type(Transaction.TransactionType.CREDIT_DISBURSEMENT)
                .status(Transaction.TransactionStatus.EXECUTED)
                .amount(request.getAmount())
                .destinationAccount(targetAccount)
                .descriptionText("Versement credit CR-" + String.format("%06d", request.getId()))
                .initiatedBy(reviewer)
                .approvedBy(reviewer)
                .executedAt(LocalDateTime.now())
                .build();
        transactionRepository.save(disbursement);

        log.info("Credit #{} disbursed: {} TND to account {} (client {})",
                id, request.getAmount(), targetAccount.getAccountNumber(),
                client.getFirstName() + " " + client.getLastName());

        auditService.log(reviewer, "APPROVE_CREDIT", "CreditRequest", id,
                "Credit approved and disbursed: " + request.getAmount() + " TND to account " +
                        targetAccount.getAccountNumber() + " (transaction " + disbursement.getReference() + ")");

        auditService.log(reviewer, "CREDIT_DISBURSEMENT", "Transaction", disbursement.getId(),
                "Credit disbursement " + disbursement.getReference() + " for CR-" +
                        String.format("%06d", request.getId()) + " credited account " +
                        targetAccount.getAccountNumber() + " by " + request.getAmount() + " TND");

        String notifMsg = "Votre credit a ete approuve avec succes. Veuillez consulter votre compte bancaire pour verifier le solde disponible.\n\n" +
                "Details du credit :\n" +
                "  - Montant : " + request.getAmount() + " TND\n" +
                "  - Duree : " + request.getDurationMonths() + " mois\n" +
                "  - Mensualite : " + request.getMonthlyPayment() + " TND\n" +
                "  - Cout total : " + request.getTotalCost() + " TND\n" +
                "  - Reference : CR-" + String.format("%06d", request.getId()) + "\n" +
                "  - Date : " + request.getReviewedAt().toLocalDate() + "\n" +
                "  - Compte credite : " + targetAccount.getAccountNumber();
        notificationService.sendSuccess(client, "Credit approuve et verse", notifMsg);
        notifyAdmins("Credit verse au client",
                "Credit CR-" + String.format("%06d", request.getId()) + " de " + request.getAmount() +
                        " TND verse sur le compte " + targetAccount.getAccountNumber() +
                        " (transaction " + disbursement.getReference() + ").");
        notificationWebSocketHandler.broadcastBadgeRefresh();
    }

    @Transactional
    public void reject(Long id, User reviewer, String comment) {
        CreditRequest request = creditRequestRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Credit request not found", "CR_NOT_FOUND", HttpStatus.NOT_FOUND));

        if (request.getStatus() != CreditRequest.CreditStatus.PENDING) {
            throw new BusinessException("Request already processed", "CR_ALREADY_PROCESSED");
        }

        request.setStatus(CreditRequest.CreditStatus.REJECTED);
        request.setReviewedBy(reviewer);
        request.setDecisionComment(comment);
        request.setReviewedAt(LocalDateTime.now());
        creditRequestRepository.save(request);

        auditService.log(reviewer, "REJECT_CREDIT", "CreditRequest", id, "Credit rejected: " + comment);
        String rejectMsg = "Votre demande de credit a ete refusee.\n\n" +
                "Details :\n" +
                "  - Montant demande : " + request.getAmount() + " TND\n" +
                "  - Reference : CR-" + String.format("%06d", request.getId()) + "\n" +
                "  - Motif du refus : " + (comment != null && !comment.isBlank() ? comment : "Non precise") + "\n\n" +
                "Veuillez contacter votre agence pour plus d'informations.";
        notificationService.sendError(request.getClient(), "Credit refuse", rejectMsg);
        notificationWebSocketHandler.broadcastBadgeRefresh();
    }

    private void notifyAdmins(String title, String message) {
        for (User admin : userRepository.findAllByRoleName("ADMIN")) {
            notificationService.send(admin, title, message, Notification.NotificationType.CREDIT);
        }
    }

    private void notifyEmployees(String title, String message) {
        for (User employee : userRepository.findAllByRoleName("EMPLOYEE")) {
            notificationService.send(employee, title, message, Notification.NotificationType.CREDIT);
        }
    }

    private CreditSimulationResponse calculateCredit(BigDecimal amount, int months, BigDecimal annualRate) {
        BigDecimal monthlyRate = annualRate.divide(BigDecimal.valueOf(1200), 10, RoundingMode.HALF_UP);

        // Monthly payment = P * r * (1+r)^n / ((1+r)^n - 1)
        BigDecimal onePlusR = BigDecimal.ONE.add(monthlyRate);
        BigDecimal power = onePlusR.pow(months, MathContext.DECIMAL128);
        BigDecimal numerator = amount.multiply(monthlyRate).multiply(power);
        BigDecimal denominator = power.subtract(BigDecimal.ONE);
        BigDecimal monthlyPayment = numerator.divide(denominator, 3, RoundingMode.HALF_UP);

        BigDecimal totalCost = monthlyPayment.multiply(BigDecimal.valueOf(months));
        BigDecimal totalInterest = totalCost.subtract(amount);

        List<CreditSimulationResponse.ScheduleEntry> schedule = buildSchedule(amount, monthlyRate, monthlyPayment, months);

        return CreditSimulationResponse.builder()
                .amount(amount)
                .durationMonths(months)
                .interestRate(annualRate)
                .monthlyPayment(monthlyPayment)
                .totalCost(totalCost)
                .totalInterest(totalInterest)
                .schedule(schedule)
                .build();
    }

    private List<CreditSimulationResponse.ScheduleEntry> buildSchedule(
            BigDecimal principal, BigDecimal monthlyRate, BigDecimal monthlyPayment, int months) {
        List<CreditSimulationResponse.ScheduleEntry> rows = new ArrayList<>(months);
        BigDecimal remaining = principal;
        LocalDate today = LocalDate.now();
        for (int m = 1; m <= months; m++) {
            BigDecimal interestPart = remaining.multiply(monthlyRate).setScale(3, RoundingMode.HALF_UP);
            BigDecimal principalPart;
            BigDecimal payment;
            if (m == months) {
                // Final instalment clears any rounding drift.
                principalPart = remaining;
                payment = principalPart.add(interestPart).setScale(3, RoundingMode.HALF_UP);
                remaining = BigDecimal.ZERO;
            } else {
                principalPart = monthlyPayment.subtract(interestPart).setScale(3, RoundingMode.HALF_UP);
                payment = monthlyPayment;
                remaining = remaining.subtract(principalPart).setScale(3, RoundingMode.HALF_UP);
            }
            rows.add(CreditSimulationResponse.ScheduleEntry.builder()
                    .month(m)
                    .dueDate(today.plusMonths(m))
                    .payment(payment)
                    .principalPart(principalPart)
                    .interestPart(interestPart)
                    .remainingBalance(remaining.max(BigDecimal.ZERO))
                    .build());
        }
        return rows;
    }

    private CreditRequestResponse mapToResponse(CreditRequest r) {
        return CreditRequestResponse.builder()
                .id(r.getId())
                .amount(r.getAmount())
                .durationMonths(r.getDurationMonths())
                .interestRate(r.getInterestRate())
                .monthlyPayment(r.getMonthlyPayment())
                .totalCost(r.getTotalCost())
                .purpose(r.getPurpose())
                .status(r.getStatus().name())
                .clientName(r.getClient().getFirstName() + " " + r.getClient().getLastName())
                .reviewedByName(r.getReviewedBy() != null ? r.getReviewedBy().getFirstName() + " " + r.getReviewedBy().getLastName() : null)
                .decisionComment(r.getDecisionComment())
                .reviewedAt(r.getReviewedAt())
                .createdAt(r.getCreatedAt())
                .build();
    }

    private String generateCreditReference() {
        String ref;
        do {
            ref = "CRD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        } while (transactionRepository.existsByReference(ref));
        return ref;
    }
}
