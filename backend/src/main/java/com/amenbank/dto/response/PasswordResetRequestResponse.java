package com.amenbank.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PasswordResetRequestResponse {
    private Long id;
    private String userName;
    private String userEmail;
    private String status;
    private String reviewedByName;
    private String decisionComment;
    private LocalDateTime reviewedAt;
    private LocalDateTime completedAt;
    private LocalDateTime createdAt;
    private String source; // SELF_SERVICE | ADMIN
}
