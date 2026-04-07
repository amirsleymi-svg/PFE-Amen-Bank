package com.amenbank.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreditRequestResponse {
    private Long id;
    private BigDecimal amount;
    private Integer durationMonths;
    private BigDecimal interestRate;
    private BigDecimal monthlyPayment;
    private BigDecimal totalCost;
    private String purpose;
    private String status;
    private String clientName;
    private String reviewedByName;
    private String decisionComment;
    private LocalDateTime reviewedAt;
    private LocalDateTime createdAt;
}
