package com.amenbank.controller;

import com.amenbank.dto.request.CreateUserRequest;
import com.amenbank.dto.request.DecisionRequest;
import com.amenbank.dto.request.UpdateUserRequest;
import com.amenbank.dto.response.*;
import com.amenbank.dto.response.PasswordResetRequestResponse;
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
    private final CreditService creditService;
    private final TransferService transferService;
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
            @RequestBody UpdateUserRequest request,
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
        String newRole = request.get("role");
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
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Requests retrieved",
                passwordResetService.getPendingRequests(pageable)));
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

    // ===== TRANSFERS =====

    @GetMapping("/transfers/pending")
    public ResponseEntity<ApiResponse<Page<TransactionResponse>>> getPendingTransfers(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Pending transfers", transferService.getPendingTransfers(pageable)));
    }

    @PostMapping("/transfers/{id}/approve")
    public ResponseEntity<ApiResponse<Void>> approveTransfer(
            @PathVariable Long id,
            @RequestBody(required = false) DecisionRequest request,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User admin = userRepository.findById(auth.getId()).orElseThrow();
        transferService.approveTransfer(id, admin, request != null ? request.getComment() : null);
        return ResponseEntity.ok(ApiResponse.success("Transfer approved"));
    }

    @PostMapping("/transfers/{id}/reject")
    public ResponseEntity<ApiResponse<Void>> rejectTransfer(
            @PathVariable Long id,
            @RequestBody(required = false) DecisionRequest request,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User admin = userRepository.findById(auth.getId()).orElseThrow();
        transferService.rejectTransfer(id, admin, request != null ? request.getComment() : null);
        return ResponseEntity.ok(ApiResponse.success("Transfer rejected"));
    }

    // ===== CREDITS =====

    @GetMapping("/credits/pending")
    public ResponseEntity<ApiResponse<Page<CreditRequestResponse>>> getPendingCredits(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Pending credits", creditService.getPendingCredits(pageable)));
    }

    @PostMapping("/credits/{id}/approve")
    public ResponseEntity<ApiResponse<Void>> approveCredit(
            @PathVariable Long id,
            @RequestBody(required = false) DecisionRequest request,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User admin = userRepository.findById(auth.getId()).orElseThrow();
        creditService.approve(id, admin, request != null ? request.getComment() : null);
        return ResponseEntity.ok(ApiResponse.success("Credit approved"));
    }

    @PostMapping("/credits/{id}/reject")
    public ResponseEntity<ApiResponse<Void>> rejectCredit(
            @PathVariable Long id,
            @RequestBody(required = false) DecisionRequest request,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User admin = userRepository.findById(auth.getId()).orElseThrow();
        creditService.reject(id, admin, request != null ? request.getComment() : null);
        return ResponseEntity.ok(ApiResponse.success("Credit rejected"));
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
}
