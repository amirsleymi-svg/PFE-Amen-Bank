package com.amenbank.service;

import com.amenbank.audit.AuditService;
import com.amenbank.dto.request.CreditRequestDto;
import com.amenbank.dto.request.CreditSimulationRequest;
import com.amenbank.dto.response.CreditRequestResponse;
import com.amenbank.dto.response.CreditSimulationResponse;
import com.amenbank.entity.CreditRequest;
import com.amenbank.entity.CreditSimulation;
import com.amenbank.entity.User;
import com.amenbank.exception.BusinessException;
import com.amenbank.notification.NotificationService;
import com.amenbank.repository.CreditRequestRepository;
import com.amenbank.repository.CreditSimulationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class CreditService {

    private final CreditRequestRepository creditRequestRepository;
    private final CreditSimulationRepository creditSimulationRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;

    private static final BigDecimal DEFAULT_INTEREST_RATE = new BigDecimal("7.50");

    public CreditSimulationResponse simulate(CreditSimulationRequest request, User user) {
        CreditSimulationResponse result = calculateCredit(request.getAmount(), request.getDurationMonths());

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
        CreditSimulationResponse calc = calculateCredit(dto.getAmount(), dto.getDurationMonths());

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

        return mapToResponse(request);
    }

    public Page<CreditRequestResponse> getClientCredits(Long clientId, Pageable pageable) {
        return creditRequestRepository.findByClientId(clientId, pageable).map(this::mapToResponse);
    }

    public Page<CreditRequestResponse> getPendingCredits(Pageable pageable) {
        return creditRequestRepository.findByStatus(CreditRequest.CreditStatus.PENDING, pageable).map(this::mapToResponse);
    }

    @Transactional
    public void approve(Long id, User reviewer, String comment) {
        CreditRequest request = creditRequestRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Credit request not found", "CR_NOT_FOUND", HttpStatus.NOT_FOUND));

        if (request.getStatus() != CreditRequest.CreditStatus.PENDING) {
            throw new BusinessException("Request already processed", "CR_ALREADY_PROCESSED");
        }

        request.setStatus(CreditRequest.CreditStatus.APPROVED);
        request.setReviewedBy(reviewer);
        request.setDecisionComment(comment);
        request.setReviewedAt(LocalDateTime.now());
        creditRequestRepository.save(request);

        auditService.log(reviewer, "APPROVE_CREDIT", "CreditRequest", id, "Credit approved");
        notificationService.sendSuccess(request.getClient(), "Credit approuve",
                "Votre demande de credit de " + request.getAmount() + " TND a ete approuvee.");
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
        notificationService.sendError(request.getClient(), "Credit refuse",
                "Votre demande de credit a ete refusee. Motif: " + comment);
    }

    private CreditSimulationResponse calculateCredit(BigDecimal amount, int months) {
        BigDecimal annualRate = DEFAULT_INTEREST_RATE;
        BigDecimal monthlyRate = annualRate.divide(BigDecimal.valueOf(1200), 10, RoundingMode.HALF_UP);

        // Monthly payment = P * r * (1+r)^n / ((1+r)^n - 1)
        BigDecimal onePlusR = BigDecimal.ONE.add(monthlyRate);
        BigDecimal power = onePlusR.pow(months, MathContext.DECIMAL128);
        BigDecimal numerator = amount.multiply(monthlyRate).multiply(power);
        BigDecimal denominator = power.subtract(BigDecimal.ONE);
        BigDecimal monthlyPayment = numerator.divide(denominator, 3, RoundingMode.HALF_UP);

        BigDecimal totalCost = monthlyPayment.multiply(BigDecimal.valueOf(months));
        BigDecimal totalInterest = totalCost.subtract(amount);

        return CreditSimulationResponse.builder()
                .amount(amount)
                .durationMonths(months)
                .interestRate(annualRate)
                .monthlyPayment(monthlyPayment)
                .totalCost(totalCost)
                .totalInterest(totalInterest)
                .build();
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
}
