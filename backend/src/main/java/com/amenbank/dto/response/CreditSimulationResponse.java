package com.amenbank.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreditSimulationResponse {
    private BigDecimal amount;
    private Integer durationMonths;
    private BigDecimal interestRate;
    private BigDecimal monthlyPayment;
    private BigDecimal totalCost;
    private BigDecimal totalInterest;

    /** Month-by-month amortization schedule. */
    private List<ScheduleEntry> schedule;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ScheduleEntry {
        private Integer month;
        private LocalDate dueDate;
        private BigDecimal payment;
        private BigDecimal principalPart;
        private BigDecimal interestPart;
        private BigDecimal remainingBalance;
    }
}
