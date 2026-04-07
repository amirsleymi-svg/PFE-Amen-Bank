package com.amenbank.service;

import com.amenbank.audit.AuditService;
import com.amenbank.dto.request.CreateUserRequest;
import com.amenbank.dto.request.UpdateUserRequest;
import com.amenbank.dto.response.*;
import com.amenbank.entity.*;
import com.amenbank.exception.BusinessException;
import com.amenbank.notification.EmailService;
import com.amenbank.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final BankAccountRepository bankAccountRepository;
    private final RegistrationRequestRepository registrationRequestRepository;
    private final PasswordResetRequestRepository passwordResetRequestRepository;
    private final CreditRequestRepository creditRequestRepository;
    private final TransactionRepository transactionRepository;
    private final AuditLogRepository auditLogRepository;
    private final DailyReportRepository dailyReportRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final AuditService auditService;
    private final EntityManager entityManager;

    public Page<UserResponse> getUsers(Pageable pageable) {
        return userRepository.findAll(pageable).map(this::mapUserToResponse);
    }

    public Page<UserResponse> getUsersByRole(String roleName, Pageable pageable) {
        return userRepository.findByRoleName(roleName, pageable).map(this::mapUserToResponse);
    }

    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new BusinessException("User not found", "USER_NOT_FOUND", HttpStatus.NOT_FOUND));
        return mapUserToResponse(user);
    }

    @Transactional
    public UserResponse createUser(CreateUserRequest request, User admin) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessException("Email already exists", "EMAIL_EXISTS", HttpStatus.CONFLICT);
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BusinessException("Username already exists", "USERNAME_EXISTS", HttpStatus.CONFLICT);
        }

        Role role = roleRepository.findByName(request.getRole())
                .orElseThrow(() -> new BusinessException("Role not found", "ROLE_NOT_FOUND"));

        String tempPassword = request.getPassword() != null ? request.getPassword() : UUID.randomUUID().toString().substring(0, 12);

        User newUser = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .username(request.getUsername())
                .passwordHash(passwordEncoder.encode(tempPassword))
                .phone(request.getPhone())
                .role(role)
                .status(User.UserStatus.ACTIVE)
                .twoFactorEnabled(true)
                .build();
        userRepository.save(newUser);

        if ("CLIENT".equals(role.getName())) {
            BankAccount account = BankAccount.builder()
                    .accountNumber(generateAccountNumber())
                    .iban(generateIban())
                    .client(newUser)
                    .build();
            bankAccountRepository.save(account);
        }

        emailService.sendAccountCreatedEmail(newUser.getEmail(), newUser.getUsername(), tempPassword);
        auditService.log(admin, "CREATE_USER", "User", newUser.getId(),
                "Created " + role.getName() + " user: " + newUser.getUsername());

        return mapUserToResponse(newUser);
    }

    @Transactional
    public UserResponse updateUser(Long id, UpdateUserRequest request, User admin) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new BusinessException("User not found", "USER_NOT_FOUND", HttpStatus.NOT_FOUND));

        if (request.getFirstName() != null) user.setFirstName(request.getFirstName());
        if (request.getLastName() != null) user.setLastName(request.getLastName());
        if (request.getPhone() != null) user.setPhone(request.getPhone());

        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new BusinessException("Email already exists", "EMAIL_EXISTS", HttpStatus.CONFLICT);
            }
            user.setEmail(request.getEmail());
        }

        if (request.getRole() != null) {
            Role role = roleRepository.findByName(request.getRole())
                    .orElseThrow(() -> new BusinessException("Role not found", "ROLE_NOT_FOUND"));
            user.setRole(role);
        }

        userRepository.save(user);
        auditService.log(admin, "UPDATE_USER", "User", id, "Updated user: " + user.getUsername());

        return mapUserToResponse(user);
    }

    @Transactional
    public UserResponse changeUserRole(Long id, String newRoleName, User admin) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new BusinessException("User not found", "USER_NOT_FOUND", HttpStatus.NOT_FOUND));

        if (user.getId().equals(admin.getId())) {
            throw new BusinessException("Cannot change your own role", "SELF_ROLE_CHANGE", HttpStatus.FORBIDDEN);
        }

        String oldRoleName = user.getRole().getName();
        if (oldRoleName.equals(newRoleName)) {
            throw new BusinessException("User already has this role", "SAME_ROLE");
        }

        Role newRole = roleRepository.findByName(newRoleName)
                .orElseThrow(() -> new BusinessException("Role not found: " + newRoleName, "ROLE_NOT_FOUND"));

        user.setRole(newRole);
        userRepository.save(user);

        auditService.log(admin, "CHANGE_ROLE", "User", id,
                "Changed role of " + user.getUsername() + " from " + oldRoleName + " to " + newRoleName);

        return mapUserToResponse(user);
    }

    @Transactional
    public void activateUser(Long id, User admin) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new BusinessException("User not found", "USER_NOT_FOUND", HttpStatus.NOT_FOUND));
        user.setStatus(User.UserStatus.ACTIVE);
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);
        auditService.log(admin, "ACTIVATE_USER", "User", id, "Activated user: " + user.getUsername());
    }

    @Transactional
    public void deactivateUser(Long id, User admin) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new BusinessException("User not found", "USER_NOT_FOUND", HttpStatus.NOT_FOUND));
        user.setStatus(User.UserStatus.DISABLED);
        userRepository.save(user);
        auditService.log(admin, "DEACTIVATE_USER", "User", id, "Deactivated user: " + user.getUsername());
    }

    @Transactional
    public void deleteUser(Long id, User admin) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new BusinessException("User not found", "USER_NOT_FOUND", HttpStatus.NOT_FOUND));

        if ("ADMIN".equals(user.getRole().getName())) {
            throw new BusinessException("Cannot delete admin accounts", "DELETE_ADMIN_FORBIDDEN", HttpStatus.FORBIDDEN);
        }

        String deletedUsername = user.getUsername();
        String deletedEmail = user.getEmail();
        String deletedRole = user.getRole().getName();

        // Delete registration requests matching this user's email (so email can be reused)
        entityManager.createNativeQuery("DELETE FROM registration_requests WHERE email = :email").setParameter("email", deletedEmail).executeUpdate();

        // Delete all related data (order matters for FK constraints)
        entityManager.createNativeQuery("DELETE FROM two_factor_codes WHERE user_id = :uid").setParameter("uid", id).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM refresh_tokens WHERE user_id = :uid").setParameter("uid", id).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM activation_tokens WHERE user_id = :uid").setParameter("uid", id).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM reset_tokens WHERE user_id = :uid").setParameter("uid", id).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM notifications WHERE user_id = :uid").setParameter("uid", id).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM credit_simulations WHERE client_id = :uid").setParameter("uid", id).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM daily_reports WHERE employee_id = :uid OR reviewed_by = :uid").setParameter("uid", id).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM password_reset_requests WHERE user_id = :uid").setParameter("uid", id).executeUpdate();

        // Nullify references in audit_logs, transactions, credit_requests where user is reviewer
        entityManager.createNativeQuery("UPDATE audit_logs SET user_id = NULL WHERE user_id = :uid").setParameter("uid", id).executeUpdate();
        entityManager.createNativeQuery("UPDATE transactions SET approved_by = NULL WHERE approved_by = :uid").setParameter("uid", id).executeUpdate();
        entityManager.createNativeQuery("UPDATE credit_requests SET reviewed_by = NULL WHERE reviewed_by = :uid").setParameter("uid", id).executeUpdate();
        entityManager.createNativeQuery("UPDATE registration_requests SET reviewed_by = NULL WHERE reviewed_by = :uid").setParameter("uid", id).executeUpdate();

        // Delete transaction history for user's transactions
        entityManager.createNativeQuery("DELETE th FROM transaction_history th INNER JOIN transactions t ON th.transaction_id = t.id WHERE t.initiated_by = :uid").setParameter("uid", id).executeUpdate();
        entityManager.createNativeQuery("UPDATE transaction_history SET changed_by = NULL WHERE changed_by = :uid").setParameter("uid", id).executeUpdate();

        // Delete transfers, transactions initiated by user
        entityManager.createNativeQuery("DELETE FROM transfer_beneficiaries WHERE transfer_request_id IN (SELECT id FROM transfer_requests WHERE client_id = :uid)").setParameter("uid", id).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM scheduled_transfers WHERE transfer_request_id IN (SELECT id FROM transfer_requests WHERE client_id = :uid)").setParameter("uid", id).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM transfer_requests WHERE client_id = :uid").setParameter("uid", id).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM transactions WHERE initiated_by = :uid").setParameter("uid", id).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM credit_requests WHERE client_id = :uid").setParameter("uid", id).executeUpdate();

        // Delete bank accounts and cards
        entityManager.createNativeQuery("DELETE FROM account_cards WHERE client_id = :uid").setParameter("uid", id).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM bank_accounts WHERE client_id = :uid").setParameter("uid", id).executeUpdate();

        // Finally delete the user
        userRepository.deleteById(id);
        entityManager.flush();

        auditService.log(admin, "DELETE_USER", "User", id,
                "Hard-deleted " + deletedRole + " user: " + deletedUsername);
    }

    public Page<AuditLogResponse> getAuditLogs(Pageable pageable) {
        return auditLogRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(this::mapAuditToResponse);
    }

    @Transactional
    public void deleteAuditLog(Long id, User admin) {
        if (!auditLogRepository.existsById(id)) {
            throw new BusinessException("Audit log not found", "AUDIT_LOG_NOT_FOUND", HttpStatus.NOT_FOUND);
        }
        auditLogRepository.deleteById(id);
    }

    @Transactional
    public void deleteAllAuditLogs(User admin) {
        long count = auditLogRepository.count();
        auditLogRepository.deleteAllInBatch();
        auditService.log(admin, "DELETE_ALL_AUDIT_LOGS", "AuditLog", null,
                "Deleted all audit logs (" + count + " entries)");
    }

    public Page<DailyReportResponse> getDailyReports(Pageable pageable) {
        return dailyReportRepository.findAllByOrderByReportDateDesc(pageable)
                .map(this::mapReportToResponse);
    }

    public DashboardStatsResponse getDashboardStats() {
        return DashboardStatsResponse.builder()
                .totalUsers(userRepository.count())
                .totalClients(userRepository.countByRoleName("CLIENT"))
                .totalEmployees(userRepository.countByRoleName("EMPLOYEE"))
                .pendingRegistrations(registrationRequestRepository.findByStatus(
                        RegistrationRequest.RequestStatus.PENDING, Pageable.unpaged()).getTotalElements())
                .pendingCredits(creditRequestRepository.findByStatus(
                        CreditRequest.CreditStatus.PENDING, Pageable.unpaged()).getTotalElements())
                .pendingPasswordResets(passwordResetRequestRepository.findByStatus(
                        PasswordResetRequest.ResetStatus.PENDING, Pageable.unpaged()).getTotalElements())
                .build();
    }

    private String generateAccountNumber() {
        String num;
        do {
            num = String.format("%011d", (long)(Math.random() * 99999999999L));
        } while (bankAccountRepository.existsByAccountNumber(num));
        return num;
    }

    private String generateIban() {
        String iban;
        do {
            iban = "TN59" + String.format("%020d", (long)(Math.random() * 99999999999999999L));
        } while (bankAccountRepository.existsByIban(iban));
        return iban;
    }

    private UserResponse mapUserToResponse(User u) {
        return UserResponse.builder()
                .id(u.getId())
                .firstName(u.getFirstName())
                .lastName(u.getLastName())
                .email(u.getEmail())
                .username(u.getUsername())
                .phone(u.getPhone())
                .role(u.getRole().getName())
                .status(u.getStatus().name())
                .twoFactorEnabled(u.getTwoFactorEnabled())
                .createdAt(u.getCreatedAt())
                .lastLoginAt(u.getLastLoginAt())
                .build();
    }

    private AuditLogResponse mapAuditToResponse(AuditLog a) {
        return AuditLogResponse.builder()
                .id(a.getId())
                .userName(a.getUser() != null ? a.getUser().getFirstName() + " " + a.getUser().getLastName() : "System")
                .action(a.getAction())
                .entityType(a.getEntityType())
                .entityId(a.getEntityId())
                .details(a.getDetails())
                .ipAddress(a.getIpAddress())
                .createdAt(a.getCreatedAt())
                .build();
    }

    private DailyReportResponse mapReportToResponse(DailyReport r) {
        return DailyReportResponse.builder()
                .id(r.getId())
                .employeeName(r.getEmployee().getFirstName() + " " + r.getEmployee().getLastName())
                .reportDate(r.getReportDate())
                .title(r.getTitle())
                .content(r.getContent())
                .status(r.getStatus().name())
                .reviewedByName(r.getReviewedBy() != null ? r.getReviewedBy().getFirstName() + " " + r.getReviewedBy().getLastName() : null)
                .reviewComment(r.getReviewComment())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
