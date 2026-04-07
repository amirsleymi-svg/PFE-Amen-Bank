package com.amenbank.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BankAccountResponse {
    private Long id;
    private String accountNumber;
    private String iban;
    private BigDecimal balance;
    private String currency;
    private String status;
    private LocalDateTime createdAt;
}
