package com.amenbank.controller;

import com.amenbank.dto.request.*;
import com.amenbank.dto.response.*;
import com.amenbank.entity.User;
import com.amenbank.repository.UserRepository;
import com.amenbank.security.UserDetailsImpl;
import com.amenbank.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final RegistrationService registrationService;
    private final PasswordResetService passwordResetService;
    private final FraudDetectionService fraudDetectionService;
    private final TransferService transferService;
    private final CreditService creditService;
    private final UserRepository userRepository;

    // ===== DASHBOARD =====

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<DashboardStatsResponse>> getDashboard() {
        return ResponseEntity.ok(ApiResponse.success("Dashboard stats", adminService.getDashboardStats()));
    }

    // ===== USERS =====

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<Page<UserResponse>>> getUsers(
            @RequestParam(required = false) String role,
            @PageableDefault(size = 20) Pageable pageable) {
        if (role != null) {
            return ResponseEntity.ok(ApiResponse.success("Users retrieved", adminService.getUsersByRole(role, pageable)));
        }
        return ResponseEntity.ok(ApiResponse.success("Users retrieved", adminService.getUsers(pageable)));
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<ApiResponse<UserResponse>> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("User retrieved", adminService.getUserById(id)));
    }

    @PostMapping("/users")
    public ResponseEntity<ApiResponse<UserResponse>> createUser(
            @Valid @RequestBody CreateUserRequest request,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User admin = userRepository.findById(auth.getId()).orElseThrow();
        return ResponseEntity.ok(ApiResponse.success("User created", adminService.createUser(request, admin)));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User admin = userRepository.findById(auth.getId()).orElseThrow();
        return ResponseEntity.ok(ApiResponse.success("User updated", adminService.updateUser(id, request, admin)));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User admin = userRepository.findById(auth.getId()).orElseThrow();
        adminService.deleteUser(id, admin);
        return ResponseEntity.ok(ApiResponse.success("User deleted"));
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<ApiResponse<UserResponse>> changeUserRole(
            @PathVariable Long id,
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User admin = userRepository.findById(auth.getId()).orElseThrow();
        String newRole = request != null ? request.get("role") : null;
        if (newRole == null || newRole.isBlank()) {
            throw new com.amenbank.exception.BusinessException("Le role est requis", "MISSING_ROLE");
        }
        return ResponseEntity.ok(ApiResponse.success("Role updated", adminService.changeUserRole(id, newRole, admin)));
    }

    @PostMapping("/users/{id}/activate")
    public ResponseEntity<ApiResponse<Void>> activateUser(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User admin = userRepository.findById(auth.getId()).orElseThrow();
        adminService.activateUser(id, admin);
        return ResponseEntity.ok(ApiResponse.success("User activated"));
    }

    @PostMapping("/users/{id}/deactivate")
    public ResponseEntity<ApiResponse<Void>> deactivateUser(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User admin = userRepository.findById(auth.getId()).orElseThrow();
        adminService.deactivateUser(id, admin);
        return ResponseEntity.ok(ApiResponse.success("User deactivated"));
    }

    // ===== BANK ACCOUNTS =====

    @GetMapping("/bank-accounts")
    public ResponseEntity<ApiResponse<Page<BankAccountResponse>>> getBankAccounts(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Bank accounts retrieved",
                adminService.getAllBankAccounts(pageable)));
    }

    @PostMapping("/bank-accounts/{id}/activate")
    public ResponseEntity<ApiResponse<Void>> activateBankAccount(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User admin = userRepository.findById(auth.getId()).orElseThrow();
        adminService.activateBankAccount(id, admin);
        return ResponseEntity.ok(ApiResponse.success("Bank account activated"));
    }

    @PostMapping("/bank-accounts/{id}/deactivate")
    public ResponseEntity<ApiResponse<Void>> deactivateBankAccount(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User admin = userRepository.findById(auth.getId()).orElseThrow();
        adminService.deactivateBankAccount(id, admin);
        return ResponseEntity.ok(ApiResponse.success("Bank account deactivated"));
    }

    // ===== REGISTRATION REQUESTS =====

    @GetMapping("/registration-requests")
    public ResponseEntity<ApiResponse<Page<RegistrationRequestResponse>>> getRegistrationRequests(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Requests retrieved", registrationService.getPendingRequests(pageable)));
    }

    @PostMapping("/registration-requests/{id}/approve")
    public ResponseEntity<ApiResponse<Void>> approveRegistration(
            @PathVariable Long id,
            @RequestBody(required = false) DecisionRequest request,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User admin = userRepository.findById(auth.getId()).orElseThrow();
        registrationService.approve(id, admin, request != null ? request.getComment() : null);
        return ResponseEntity.ok(ApiResponse.success("Registration approved"));
    }

    @PostMapping("/registration-requests/{id}/reject")
    public ResponseEntity<ApiResponse<Void>> rejectRegistration(
            @PathVariable Long id,
            @RequestBody(required = false) DecisionRequest request,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User admin = userRepository.findById(auth.getId()).orElseThrow();
        registrationService.reject(id, admin, request != null ? request.getComment() : null);
        return ResponseEntity.ok(ApiResponse.success("Registration rejected"));
    }

    // ===== PASSWORD RESET REQUESTS =====

    @GetMapping("/password-reset-requests")
    public ResponseEntity<ApiResponse<Page<PasswordResetRequestResponse>>> getPasswordResetRequests(
            @RequestParam(defaultValue = "ALL") String status,
            @PageableDefault(size = 20, sort = "createdAt", direction = org.springframework.data.domain.Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Requests retrieved",
                passwordResetService.getAllRequests(status, pageable)));
    }

    @GetMapping("/password-reset-requests/stats")
    public ResponseEntity<ApiResponse<com.amenbank.dto.response.PasswordResetStatsResponse>> getPasswordResetStats() {
        return ResponseEntity.ok(ApiResponse.success("Stats retrieved", passwordResetService.getStats()));
    }

    @PostMapping("/password-reset-requests/{id}/approve")
    public ResponseEntity<ApiResponse<Void>> approvePasswordReset(
            @PathVariable Long id,
            @RequestBody(required = false) DecisionRequest request,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User admin = userRepository.findById(auth.getId()).orElseThrow();
        passwordResetService.approve(id, admin, request != null ? request.getComment() : null);
        return ResponseEntity.ok(ApiResponse.success("Password reset approved"));
    }

    @PostMapping("/password-reset-requests/{id}/reject")
    public ResponseEntity<ApiResponse<Void>> rejectPasswordReset(
            @PathVariable Long id,
            @RequestBody(required = false) DecisionRequest request,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User admin = userRepository.findById(auth.getId()).orElseThrow();
        passwordResetService.reject(id, admin, request != null ? request.getComment() : null);
        return ResponseEntity.ok(ApiResponse.success("Password reset rejected"));
    }

    @DeleteMapping("/password-reset-requests/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePasswordResetRequest(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User admin = userRepository.findById(auth.getId()).orElseThrow();
        passwordResetService.deleteRequest(id, admin);
        return ResponseEntity.ok(ApiResponse.success("Password reset request deleted"));
    }

    // ===== AUDIT LOGS =====

    @GetMapping("/audit-logs")
    public ResponseEntity<ApiResponse<Page<AuditLogResponse>>> getAuditLogs(
            @PageableDefault(size = 50) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Audit logs retrieved", adminService.getAuditLogs(pageable)));
    }

    @DeleteMapping("/audit-logs/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAuditLog(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User admin = userRepository.findById(auth.getId()).orElseThrow();
        adminService.deleteAuditLog(id, admin);
        return ResponseEntity.ok(ApiResponse.success("Audit log deleted"));
    }

    @DeleteMapping("/audit-logs")
    public ResponseEntity<ApiResponse<Void>> deleteAllAuditLogs(
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User admin = userRepository.findById(auth.getId()).orElseThrow();
        adminService.deleteAllAuditLogs(admin);
        return ResponseEntity.ok(ApiResponse.success("All audit logs deleted"));
    }

    // ===== REPORTS =====

    @GetMapping("/reports/daily")
    public ResponseEntity<ApiResponse<Page<DailyReportResponse>>> getDailyReports(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Reports retrieved", adminService.getDailyReports(pageable)));
    }

    @PostMapping("/reports/daily/{id}/review")
    public ResponseEntity<ApiResponse<Void>> reviewReport(
            @PathVariable Long id,
            @RequestBody ReviewReportRequest request,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User admin = userRepository.findById(auth.getId()).orElseThrow();
        adminService.reviewReport(id, request.getComment(), request.getRating(), admin);
        return ResponseEntity.ok(ApiResponse.success("Report reviewed"));
    }

    @DeleteMapping("/reports/daily/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteDailyReport(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User admin = userRepository.findById(auth.getId()).orElseThrow();
        adminService.deleteDailyReport(id, admin);
        return ResponseEntity.ok(ApiResponse.success("Report deleted"));
    }

    // ===== TRANSFER MONITORING (read-only) =====

    @GetMapping("/transfers")
    public ResponseEntity<ApiResponse<Page<TransactionResponse>>> getAllTransfers(
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20) Pageable pageable) {
        if (status != null) {
            return ResponseEntity.ok(ApiResponse.success("Transfers retrieved", transferService.getTransfersByStatus(status, pageable)));
        }
        return ResponseEntity.ok(ApiResponse.success("Transfers retrieved", transferService.getAllTransfers(pageable)));
    }

    // ===== CREDIT MONITORING (read-only) =====

    @GetMapping("/credits")
    public ResponseEntity<ApiResponse<Page<CreditRequestResponse>>> getAllCredits(
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20) Pageable pageable) {
        if (status != null) {
            return ResponseEntity.ok(ApiResponse.success("Credits retrieved", creditService.getCreditsByStatus(status, pageable)));
        }
        return ResponseEntity.ok(ApiResponse.success("Credits retrieved", creditService.getAllCredits(pageable)));
    }

    // ===== FRAUD ALERTS =====

    @GetMapping("/fraud-alerts")
    public ResponseEntity<ApiResponse<Page<FraudAlertResponse>>> getFraudAlerts(
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20) Pageable pageable) {
        if (status != null) {
            return ResponseEntity.ok(ApiResponse.success("Fraud alerts", fraudDetectionService.getAlertsByStatus(status, pageable)));
        }
        return ResponseEntity.ok(ApiResponse.success("Fraud alerts", fraudDetectionService.getAllAlerts(pageable)));
    }

    @PostMapping("/fraud-alerts/{id}/status")
    public ResponseEntity<ApiResponse<Void>> updateFraudAlertStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User admin = userRepository.findById(auth.getId()).orElseThrow();
        String status = request != null ? request.get("status") : null;
        if (status == null || status.isBlank()) {
            throw new com.amenbank.exception.BusinessException("Le statut est requis", "MISSING_STATUS");
        }
        fraudDetectionService.updateAlertStatus(id, status, request.get("comment"), admin);
        return ResponseEntity.ok(ApiResponse.success("Alert status updated"));
    }

    /**
     * Confirm a fraud alert and freeze the offending client in one transaction:
     * the alert is marked RESOLVED, then the client's user, bank accounts, cards,
     * and pending transactions are all disabled / cancelled.
     */
    @PostMapping("/fraud-alerts/{id}/confirm-and-freeze")
    public ResponseEntity<ApiResponse<AdminService.FreezeClientResult>> confirmFraudAndFreezeClient(
            @PathVariable Long id,
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User admin = userRepository.findById(auth.getId()).orElseThrow();
        String comment = request != null ? request.getOrDefault("comment", "") : "";
        Long clientId = fraudDetectionService.resolveAlertAndGetClientId(id, comment, admin);
        AdminService.FreezeClientResult result = adminService.freezeClientOnFraud(clientId, admin,
                "Fraude confirmee (alerte #" + id + ")" + (comment.isBlank() ? "" : " - " + comment));
        return ResponseEntity.ok(ApiResponse.success("Client freeze completed", result));
    }

    // ===== SECURITY INCIDENTS =====

    @GetMapping("/security/incidents")
    public ResponseEntity<ApiResponse<Page<SecurityIncidentResponse>>> getSecurityIncidents(
            @PageableDefault(size = 30) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Security incidents", adminService.getSecurityIncidents(pageable)));
    }

    @GetMapping("/security/suspicious-users")
    public ResponseEntity<ApiResponse<java.util.List<SuspiciousUserResponse>>> getSuspiciousUsers(
            @RequestParam(defaultValue = "24") int hours,
            @RequestParam(defaultValue = "3") int threshold) {
        return ResponseEntity.ok(ApiResponse.success("Suspicious users",
                adminService.getSuspiciousUsers(hours, threshold)));
    }

    @PostMapping("/security/block/{userId}")
    public ResponseEntity<ApiResponse<Void>> blockSuspiciousUser(
            @PathVariable Long userId,
            @RequestBody(required = false) Map<String, String> request,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User admin = userRepository.findById(auth.getId()).orElseThrow();
        String reason = request != null ? request.get("reason") : null;
        adminService.blockSuspiciousUser(userId, admin, reason);
        return ResponseEntity.ok(ApiResponse.success("User blocked"));
    }

    @GetMapping("/security/blocked-ips")
    public ResponseEntity<ApiResponse<java.util.List<com.amenbank.dto.response.BlockedIpResponse>>> getBlockedIps() {
        return ResponseEntity.ok(ApiResponse.success("Blocked IPs", adminService.getBlockedIps()));
    }

    @PostMapping("/security/block-ip")
    public ResponseEntity<ApiResponse<com.amenbank.dto.response.BlockedIpResponse>> blockIp(
            @RequestBody Map<String, String> request,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User admin = userRepository.findById(auth.getId()).orElseThrow();
        String ip = request != null ? request.get("ip") : null;
        String reason = request != null ? request.get("reason") : null;
        return ResponseEntity.ok(ApiResponse.success("IP blocked", adminService.blockIp(ip, reason, admin)));
    }

    @DeleteMapping("/security/block-ip/{id}")
    public ResponseEntity<ApiResponse<Void>> unblockIp(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User admin = userRepository.findById(auth.getId()).orElseThrow();
        adminService.unblockIp(id, admin);
        return ResponseEntity.ok(ApiResponse.success("IP unblocked"));
    }

}
