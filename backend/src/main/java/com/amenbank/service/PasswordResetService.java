package com.amenbank.service;

import com.amenbank.audit.AuditService;
import com.amenbank.dto.request.ResetPasswordRequest;
import com.amenbank.entity.*;
import com.amenbank.exception.BusinessException;
import com.amenbank.notification.EmailService;
import com.amenbank.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.amenbank.dto.response.PasswordResetRequestResponse;
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
    private final AuditService auditService;

    @Transactional
    public void submitRequest(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("User not found", "USER_NOT_FOUND", HttpStatus.NOT_FOUND));

        PasswordResetRequest request = PasswordResetRequest.builder()
                .user(user)
                .build();
        passwordResetRequestRepository.save(request);

        auditService.log(user, "PASSWORD_RESET_REQUESTED", "Password reset requested");
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
                .token(token)
                .expiresAt(LocalDateTime.now().plusHours(1))
                .build();
        resetTokenRepository.save(resetToken);

        emailService.sendPasswordResetEmail(request.getUser().getEmail(), token);
        auditService.log(admin, "APPROVE_PASSWORD_RESET", "PasswordResetRequest", id,
                "Approved password reset for " + request.getUser().getEmail());
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
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest dto) {
        ResetToken resetToken = resetTokenRepository.findByToken(dto.getToken())
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

        auditService.log(user, "PASSWORD_RESET_COMPLETED", "Password reset completed");
    }

    public Page<PasswordResetRequestResponse> getPendingRequests(Pageable pageable) {
        return passwordResetRequestRepository.findByStatus(PasswordResetRequest.ResetStatus.PENDING, pageable)
                .map(this::mapToResponse);
    }

    private PasswordResetRequestResponse mapToResponse(PasswordResetRequest r) {
        return PasswordResetRequestResponse.builder()
                .id(r.getId())
                .userName(r.getUser().getFirstName() + " " + r.getUser().getLastName())
                .userEmail(r.getUser().getEmail())
                .status(r.getStatus().name())
                .reviewedByName(r.getReviewedBy() != null ? r.getReviewedBy().getFirstName() + " " + r.getReviewedBy().getLastName() : null)
                .decisionComment(r.getDecisionComment())
                .reviewedAt(r.getReviewedAt())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
