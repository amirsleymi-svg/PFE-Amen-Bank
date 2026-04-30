package com.amenbank.dto.response;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FraudAlertResponse {
    private Long id;
    private Long transactionId;
    private String transactionReference;
    private BigDecimal transactionAmount;
    private String alertType;
    private String description;
    private String severity;
    private String status;
    private LocalDateTime detectedAt;
    private String reviewedByName;
    private String reviewComment;
    private LocalDateTime reviewedAt;
}
