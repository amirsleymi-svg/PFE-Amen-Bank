package com.amenbank.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CardTransferRequest {

    @NotNull(message = "Direction is required")
    private Direction direction;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.001", message = "Amount must be greater than 0")
    private BigDecimal amount;

    public enum Direction {
        ACCOUNT_TO_CARD,
        CARD_TO_ACCOUNT
    }
}
