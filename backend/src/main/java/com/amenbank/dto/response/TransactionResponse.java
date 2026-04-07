package com.amenbank.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TransactionResponse {
    private Long id;
    private String reference;
    private String type;
    private String status;
    private BigDecimal amount;
    private String currency;
    private String sourceAccountIban;
    private String destinationAccountIban;
    private String destinationExternalIban;
    private String description;
    private String initiatedByName;
    private String approvedByName;
    private LocalDateTime executedAt;
    private LocalDateTime createdAt;
}
