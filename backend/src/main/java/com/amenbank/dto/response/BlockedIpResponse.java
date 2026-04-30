package com.amenbank.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BlockedIpResponse {
    private Long id;
    private String ipAddress;
    private String reason;
    private String blockedByName;
    private LocalDateTime blockedAt;
    private Boolean active;
}
