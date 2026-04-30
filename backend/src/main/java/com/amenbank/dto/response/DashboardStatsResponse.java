package com.amenbank.dto.response;

import lombok.*;
import java.math.BigDecimal;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DashboardStatsResponse {
    private long totalUsers;
    private long totalClients;
    private long totalEmployees;
    private long totalAdmins;
    private long activeUsers;
    private long disabledUsers;
    private long pendingUsers;
    private long pendingRegistrations;
    private long pendingTransfers;
    private long pendingCredits;
    private long pendingPasswordResets;
    private long openFraudAlerts;
    private BigDecimal totalBalance;
}
