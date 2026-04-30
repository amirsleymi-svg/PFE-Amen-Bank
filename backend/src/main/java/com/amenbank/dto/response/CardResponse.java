package com.amenbank.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CardResponse {
    private Long id;
    private String cardNumberMasked;
    private LocalDate expiryDate;
    private String status;
    private BigDecimal balance;
    private Long accountId;
    private String accountIban;
    private LocalDateTime createdAt;
}
