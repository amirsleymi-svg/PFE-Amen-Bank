package com.amenbank.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class CreditSimulationRequest {
    @NotNull(message = "Amount is required")
    @DecimalMin(value = "1000", message = "Minimum credit amount is 1000 TND")
    private BigDecimal amount;

    @NotNull(message = "Duration in months is required")
    @Min(value = 6, message = "Minimum duration is 6 months")
    @Max(value = 360, message = "Maximum duration is 360 months")
    private Integer durationMonths;

    /** Optional custom annual rate (%). Falls back to the bank's default when null. */
    @DecimalMin(value = "0.1", message = "Minimum rate is 0.1%")
    @DecimalMax(value = "30.0", message = "Maximum rate is 30%")
    private BigDecimal interestRate;
}
