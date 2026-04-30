package com.amenbank.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SuspiciousUserResponse {
    private Long userId;
    private String email;
    private String username;
    private String status;
    private Long failedLoginCount;
    private Long unauthorizedCount;
    private LocalDateTime lastIncidentAt;
    private String lastIp;
}
