package com.amenbank.service;

import com.amenbank.audit.AuditService;
import com.amenbank.dto.request.ResetPasswordRequest;
import com.amenbank.entity.*;
import com.amenbank.exception.BusinessException;
import com.amenbank.notification.EmailService;
import com.amenbank.notification.NotificationService;
import com.amenbank.repository.*;
import com.amenbank.security.TokenHasher;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.amenbank.dto.response.PasswordResetRequestResponse;
import com.amenbank.dto.response.PasswordResetStatsResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private final PasswordResetRequestRepository passwordResetRequestRepository;
    private final UserRepository userRepository;
    private final ResetTokenRepository resetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final TokenHasher tokenHasher;

    @Transactional
    public void submitRequest(String email) {
        // Silently return if email is unknown to avoid user enumeration.
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return;
        }

        // Self-service reset: no admin review required. Record the request for audit,
        // issue a short-lived token, and email the reset link immediately.
        PasswordResetRequest request = PasswordResetRequest.builder()
                .user(user)
                .status(PasswordResetRequest.ResetStatus.APPROVED)
                .decisionComment("Auto-approuve (libre-service)")
                .reviewedAt(LocalDateTime.now())
                .build();
        passwordResetRequestRepository.save(request);

        String token = UUID.randomUUID().toString();
        ResetToken resetToken = ResetToken.builder()
                .user(user)
                .token(tokenHasher.sha256Hex(token))
                .expiresAt(LocalDateTime.now().plusHours(1))
                .build();
        resetTokenRepository.save(resetToken);

        emailService.sendPasswordResetEmail(user.getEmail(), token);
        auditService.log(user, "PASSWORD_RESET_REQUESTED",
                "Self-service password reset requested; link emailed");
        notifyAdmins("Reinitialisation de mot de passe",
                "Demande de reinitialisation pour " + user.getEmail() +
                        " en libre-service. Evenement centralise dans les Audit Logs.");
    }

    @Transactional
    public void approve(Long id, User admin, String comment) {
        PasswordResetRequest request = passwordResetRequestRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Request not found", "REQUEST_NOT_FOUND", HttpStatus.NOT_FOUND));

        if (request.getStatus() != PasswordResetRequest.ResetStatus.PENDING) {
            throw new BusinessException("Request already processed", "REQUEST_ALREADY_PROCESSED");
        }

        request.setStatus(PasswordResetRequest.ResetStatus.APPROVED);
        request.setReviewedBy(admin);
        request.setDecisionComment(comment);
        request.setReviewedAt(LocalDateTime.now());
        passwordResetRequestRepository.save(request);

        String token = UUID.randomUUID().toString();
        ResetToken resetToken = ResetToken.builder()
                .user(request.getUser())
                .token(tokenHasher.sha256Hex(token))
                .expiresAt(LocalDateTime.now().plusHours(1))
                .build();
        resetTokenRepository.save(resetToken);

        emailService.sendPasswordResetEmail(request.getUser().getEmail(), token);
        auditService.log(admin, "APPROVE_PASSWORD_RESET", "PasswordResetRequest", id,
                "Approved password reset for " + request.getUser().getEmail());
        notifyAdmins("Reinitialisation MDP approuvee",
                "Demande #" + id + " approuvee pour " + request.getUser().getEmail() + ".");
    }

    @Transactional
    public void reject(Long id, User admin, String comment) {
        PasswordResetRequest request = passwordResetRequestRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Request not found", "REQUEST_NOT_FOUND", HttpStatus.NOT_FOUND));

        if (request.getStatus() != PasswordResetRequest.ResetStatus.PENDING) {
            throw new BusinessException("Request already processed", "REQUEST_ALREADY_PROCESSED");
        }

        request.setStatus(PasswordResetRequest.ResetStatus.REJECTED);
        request.setReviewedBy(admin);
        request.setDecisionComment(comment);
        request.setReviewedAt(LocalDateTime.now());
        passwordResetRequestRepository.save(request);

        auditService.log(admin, "REJECT_PASSWORD_RESET", "PasswordResetRequest", id,
                "Rejected password reset for " + request.getUser().getEmail());
        notifyAdmins("Reinitialisation MDP rejetee",
                "Demande #" + id + " rejetee pour " + request.getUser().getEmail() + ".");
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest dto) {
        ResetToken resetToken = resetTokenRepository.findByToken(tokenHasher.sha256Hex(dto.getToken()))
                .orElseThrow(() -> new BusinessException("Invalid token", "INVALID_TOKEN", HttpStatus.BAD_REQUEST));

        if (resetToken.getUsed()) {
            throw new BusinessException("Token already used", "TOKEN_USED");
        }
        if (resetToken.isExpired()) {
            throw new BusinessException("Token expired", "TOKEN_EXPIRED");
        }

        resetToken.setUsed(true);
        resetTokenRepository.save(resetToken);

        User user = resetToken.getUser();
        user.setPasswordHash(passwordEncoder.encode(dto.getNewPassword()));
        user.setStatus(User.UserStatus.ACTIVE);
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        // Flip the latest APPROVED request to COMPLETED so admins can track closure.
        passwordResetRequestRepository
                .findFirstByUserIdAndStatusOrderByCreatedAtDesc(user.getId(), PasswordResetRequest.ResetStatus.APPROVED)
                .ifPresent(req -> {
                    req.setStatus(PasswordResetRequest.ResetStatus.COMPLETED);
                    req.setCompletedAt(LocalDateTime.now());
                    passwordResetRequestRepository.save(req);
                });

        auditService.log(user, "PASSWORD_RESET_COMPLETED", "Password reset completed");
        notifyAdmins("Mot de passe reinitialise",
                "Le mot de passe de " + user.getEmail() + " a ete reinitialise avec succes.");
    }

    public Page<PasswordResetRequestResponse> getPendingRequests(Pageable pageable) {
        return passwordResetRequestRepository.findByStatus(PasswordResetRequest.ResetStatus.PENDING, pageable)
                .map(this::mapToResponse);
    }

    public Page<PasswordResetRequestResponse> getAllRequests(String statusFilter, Pageable pageable) {
        Page<PasswordResetRequest> page;
        if (statusFilter == null || statusFilter.isBlank() || "ALL".equalsIgnoreCase(statusFilter)) {
            page = passwordResetRequestRepository.findAll(pageable);
        } else {
            try {
                PasswordResetRequest.ResetStatus s = PasswordResetRequest.ResetStatus.valueOf(statusFilter.toUpperCase());
                page = passwordResetRequestRepository.findByStatus(s, pageable);
            } catch (IllegalArgumentException e) {
                page = passwordResetRequestRepository.findAll(pageable);
            }
        }
        return page.map(this::mapToResponse);
    }

    @Transactional
    public void deleteRequest(Long id, User admin) {
        PasswordResetRequest request = passwordResetRequestRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Request not found", "REQUEST_NOT_FOUND", HttpStatus.NOT_FOUND));
        // Refuse to delete active entries so admins cannot hide in-flight activity.
        if (request.getStatus() == PasswordResetRequest.ResetStatus.PENDING
                || request.getStatus() == PasswordResetRequest.ResetStatus.APPROVED) {
            throw new BusinessException(
                    "Impossible de supprimer une demande active. Attendez qu'elle soit terminee ou rejetee.",
                    "REQUEST_ACTIVE", HttpStatus.CONFLICT);
        }
        String userEmail = request.getUser().getEmail();
        String status = request.getStatus().name();
        passwordResetRequestRepository.delete(request);
        auditService.log(admin, "DELETE_PASSWORD_RESET_REQUEST", "PasswordResetRequest", id,
                "Deleted " + status + " reset request for " + userEmail);
    }

    public PasswordResetStatsResponse getStats() {
        return PasswordResetStatsResponse.builder()
                .total(passwordResetRequestRepository.count())
                .pending(passwordResetRequestRepository.countByStatus(PasswordResetRequest.ResetStatus.PENDING))
                .approved(passwordResetRequestRepository.countByStatus(PasswordResetRequest.ResetStatus.APPROVED))
                .completed(passwordResetRequestRepository.countByStatus(PasswordResetRequest.ResetStatus.COMPLETED))
                .rejected(passwordResetRequestRepository.countByStatus(PasswordResetRequest.ResetStatus.REJECTED))
                .last24h(passwordResetRequestRepository.countByCreatedAtAfter(LocalDateTime.now().minusHours(24)))
                .build();
    }

    private PasswordResetRequestResponse mapToResponse(PasswordResetRequest r) {
        String source = (r.getReviewedBy() != null) ? "ADMIN" : "SELF_SERVICE";
        return PasswordResetRequestResponse.builder()
                .id(r.getId())
                .userName(r.getUser().getFirstName() + " " + r.getUser().getLastName())
                .userEmail(r.getUser().getEmail())
                .status(r.getStatus().name())
                .reviewedByName(r.getReviewedBy() != null ? r.getReviewedBy().getFirstName() + " " + r.getReviewedBy().getLastName() : null)
                .decisionComment(r.getDecisionComment())
                .reviewedAt(r.getReviewedAt())
                .completedAt(r.getCompletedAt())
                .createdAt(r.getCreatedAt())
                .source(source)
                .build();
    }

    private void notifyAdmins(String title, String message) {
        for (User admin : userRepository.findAllByRoleName("ADMIN")) {
            notificationService.send(admin, title, message, Notification.NotificationType.WARNING);
        }
    }
}
