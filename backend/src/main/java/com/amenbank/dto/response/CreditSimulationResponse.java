package com.amenbank.dto.response;

import lombok.*;
import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreditSimulationResponse {
    private BigDecimal amount;
    private Integer durationMonths;
    private BigDecimal interestRate;
    private BigDecimal monthlyPayment;
    private BigDecimal totalCost;
    private BigDecimal totalInterest;
}
