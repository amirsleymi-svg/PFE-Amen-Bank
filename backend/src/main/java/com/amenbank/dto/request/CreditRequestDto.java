package com.amenbank.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class CreditRequestDto {
    @NotNull(message = "Amount is required")
    @DecimalMin(value = "1000", message = "Minimum credit amount is 1000 TND")
    private BigDecimal amount;

    @NotNull(message = "Duration in months is required")
    @Min(value = 6, message = "Minimum duration is 6 months")
    private Integer durationMonths;

    private String purpose;
}
