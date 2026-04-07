package com.amenbank.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class PermanentTransferRequest {
    @NotNull(message = "Source account ID is required")
    private Long sourceAccountId;

    @NotBlank(message = "Destination IBAN is required")
    private String destinationIban;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.001", message = "Amount must be greater than 0")
    private BigDecimal amount;

    @NotBlank(message = "Frequency is required")
    private String frequency;

    @NotNull(message = "Start date is required")
    private LocalDate startDate;

    private LocalDate endDate;

    private String description;
}
