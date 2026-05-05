package com.amenbank.audit;

import com.amenbank.entity.AuditLog;
import com.amenbank.entity.User;
import com.amenbank.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final com.amenbank.notification.NotificationWebSocketHandler notificationWebSocketHandler;

    private static final java.util.List<String> SECURITY_ACTIONS = java.util.List.of(
            "LOGIN_FAILED",
            "LOGIN_BLOCKED_LOCKED",
            "LOGIN_BLOCKED_DISABLED",
            "ACCOUNT_LOCKED",
            "UNAUTHORIZED_ACCESS",
            "BLOCK_SUSPICIOUS_USER"
    );

    public void log(User user, String action, String entityType, Long entityId, String details) {
        String ip = null;
        String userAgent = null;

        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest request = attrs.getRequest();
                ip = request.getHeader("X-Forwarded-For");
                if (ip == null) ip = request.getRemoteAddr();
                userAgent = request.getHeader("User-Agent");
            }
        } catch (Exception ignored) {}

        AuditLog log = AuditLog.builder()
                .user(user)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .details(details)
                .ipAddress(ip)
                .userAgent(userAgent)
                .build();

        auditLogRepository.save(log);

        if (SECURITY_ACTIONS.contains(action) || "APPROVE_REGISTRATION".equals(action) || "TRANSFER_CREATED".equals(action) || "CREDIT_REQUEST_CREATED".equals(action)) {
            notificationWebSocketHandler.broadcastBadgeRefresh();
        }
    }

    public void log(User user, String action, String details) {
        log(user, action, null, null, details);
    }
}
