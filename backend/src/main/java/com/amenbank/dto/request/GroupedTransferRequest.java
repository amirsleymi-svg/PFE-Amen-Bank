package com.amenbank.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class GroupedTransferRequest {
    @NotNull(message = "Source account ID is required")
    private Long sourceAccountId;

    @NotEmpty(message = "At least one beneficiary is required")
    @Valid
    private List<BeneficiaryDto> beneficiaries;

    private String description;

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class BeneficiaryDto {
        @NotNull private String beneficiaryName;
        @NotNull private String beneficiaryIban;
        @NotNull @jakarta.validation.constraints.DecimalMin("0.001") private java.math.BigDecimal amount;
    }
}
