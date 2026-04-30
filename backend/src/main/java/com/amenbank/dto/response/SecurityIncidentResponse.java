package com.amenbank.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SecurityIncidentResponse {
    private Long id;
    private String action;
    private String details;
    private String ipAddress;
    private String userAgent;
    private Long userId;
    private String userEmail;
    private String username;
    private String userStatus;
    private LocalDateTime createdAt;
}
