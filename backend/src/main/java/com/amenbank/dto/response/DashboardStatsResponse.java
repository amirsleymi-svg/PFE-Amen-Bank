package com.amenbank.dto.response;

import lombok.*;
import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DashboardStatsResponse {
    private long totalUsers;
    private long totalClients;
    private long totalEmployees;
    private long pendingRegistrations;
    private long pendingTransfers;
    private long pendingCredits;
    private long pendingPasswordResets;
    private BigDecimal totalBalance;
}
