package com.amenbank.dto.response;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PasswordResetStatsResponse {
    private long total;
    private long pending;
    private long approved; // link sent, waiting for user
    private long completed; // user finished reset
    private long rejected;
    private long last24h;
}
