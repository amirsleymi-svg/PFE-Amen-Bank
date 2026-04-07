package com.amenbank.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class LinkCardRequest {
    @NotNull(message = "Account ID is required")
    private Long accountId;

    @NotBlank(message = "Card number is required")
    private String cardNumber;

    @NotBlank(message = "Expiry date is required (MM/YY)")
    private String expiryDate;
}
