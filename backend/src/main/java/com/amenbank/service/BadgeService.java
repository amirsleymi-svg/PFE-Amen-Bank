package com.amenbank.service;

import com.amenbank.entity.*;
import com.amenbank.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class BadgeService {

    private final RegistrationRequestRepository registrationRequestRepository;
    private final TransactionRepository transactionRepository;
    private final CreditRequestRepository creditRequestRepository;
    private final DailyReportRepository dailyReportRepository;
    private final FraudAlertRepository fraudAlertRepository;
    private final AuditLogRepository auditLogRepository;

    private static final List<Transaction.TransactionType> TRANSFER_TYPES = List.of(
            Transaction.TransactionType.TRANSFER_SIMPLE,
            Transaction.TransactionType.TRANSFER_GROUPED,
            Transaction.TransactionType.TRANSFER_PERMANENT
    );

    private static final List<String> SECURITY_ACTIONS = List.of(
            "LOGIN_FAILED",
            "LOGIN_BLOCKED_LOCKED",
            "LOGIN_BLOCKED_DISABLED",
            "ACCOUNT_LOCKED",
            "UNAUTHORIZED_ACCESS",
            "BLOCK_SUSPICIOUS_USER"
    );

    public Map<String, Long> getBadgeCounts(User user) {
        Map<String, Long> counts = new HashMap<>();
        String role = user.getRole().getName();

        if ("ADMIN".equals(role)) {
            counts.put("inscriptions", registrationRequestRepository.countByStatus(RegistrationRequest.RequestStatus.PENDING));
            counts.put("virements", transactionRepository.countByStatusAndTypeInAndAmountGreaterThanEqual(
                    Transaction.TransactionStatus.PENDING, TRANSFER_TYPES, new BigDecimal("1000")));
            counts.put("credits", creditRequestRepository.countByStatus(CreditRequest.CreditStatus.PENDING));
            counts.put("rapports", dailyReportRepository.countByStatus(DailyReport.ReportStatus.SUBMITTED));
            counts.put("fraudAlerts", fraudAlertRepository.countByStatus(FraudAlert.AlertStatus.OPEN));
            counts.put("suspiciousConnections", auditLogRepository.countByActionInAndIsReadFalse(SECURITY_ACTIONS));
            counts.put("auditLogs", auditLogRepository.countUnreadImportant());
        } else if ("EMPLOYEE".equals(role)) {
            counts.put("virements", transactionRepository.countByStatusAndTypeInAndAmountGreaterThanEqual(
                    Transaction.TransactionStatus.PENDING, TRANSFER_TYPES, new BigDecimal("1000")));
            counts.put("credits", creditRequestRepository.countByStatus(CreditRequest.CreditStatus.PENDING));
            counts.put("rapports", dailyReportRepository.countByEmployeeIdAndStatus(user.getId(), DailyReport.ReportStatus.DRAFT));
        }

        return counts;
    }
}
