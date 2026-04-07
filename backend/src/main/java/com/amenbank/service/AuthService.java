package com.amenbank.service;

import com.amenbank.audit.AuditService;
import com.amenbank.dto.request.LoginRequest;
import com.amenbank.dto.request.Verify2FARequest;
import com.amenbank.dto.response.AuthResponse;
import com.amenbank.dto.response.UserResponse;
import com.amenbank.entity.RefreshToken;
import com.amenbank.entity.TwoFactorCode;
import com.amenbank.entity.User;
import com.amenbank.exception.BusinessException;
import com.amenbank.repository.RefreshTokenRepository;
import com.amenbank.repository.UserRepository;
import com.amenbank.security.JwtService;
import com.amenbank.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final OtpService otpService;
    private final AuditService auditService;

    @Value("${app.account-lock.max-attempts}")
    private int maxAttempts;

    @Value("${app.account-lock.lock-duration-minutes}")
    private int lockDurationMinutes;

    @Value("${app.jwt.refresh-token-expiration}")
    private long refreshTokenExpiration;

    @Transactional
    public Object login(LoginRequest request) {
        User user = userRepository.findByEmailOrUsername(request.getLogin(), request.getLogin())
                .orElseThrow(() -> new BusinessException("Invalid credentials", "INVALID_CREDENTIALS", HttpStatus.UNAUTHORIZED));

        if (user.isAccountLocked()) {
            throw new BusinessException("Account is locked. Try again later.", "ACCOUNT_LOCKED", HttpStatus.FORBIDDEN);
        }

        if (user.getStatus() == User.UserStatus.PENDING) {
            throw new BusinessException("Account is pending activation", "ACCOUNT_PENDING", HttpStatus.FORBIDDEN);
        }

        if (user.getStatus() == User.UserStatus.DISABLED) {
            throw new BusinessException("Account is disabled", "ACCOUNT_DISABLED", HttpStatus.FORBIDDEN);
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            handleFailedLogin(user);
            throw new BusinessException("Invalid credentials", "INVALID_CREDENTIALS", HttpStatus.UNAUTHORIZED);
        }

        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        if (user.getTwoFactorEnabled()) {
            otpService.generateAndSend(user, TwoFactorCode.OtpPurpose.LOGIN);
            auditService.log(user, "LOGIN_2FA_SENT", "2FA code sent to " + user.getEmail());
            return java.util.Map.of("status", "2FA_REQUIRED", "email", user.getEmail());
        }

        // 2FA disabled — login directly
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);
        auditService.log(user, "LOGIN_SUCCESS", "User logged in successfully (2FA disabled)");
        return generateAuthResponse(user);
    }

    @Transactional
    public AuthResponse verify2FA(Verify2FARequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessException("User not found", "USER_NOT_FOUND", HttpStatus.NOT_FOUND));

        TwoFactorCode.OtpPurpose purpose = request.getPurpose() != null
                ? TwoFactorCode.OtpPurpose.valueOf(request.getPurpose())
                : TwoFactorCode.OtpPurpose.LOGIN;

        if (!otpService.verify(user, request.getCode(), purpose)) {
            throw new BusinessException("Invalid or expired 2FA code", "INVALID_2FA", HttpStatus.UNAUTHORIZED);
        }

        if (purpose == TwoFactorCode.OtpPurpose.LOGIN) {
            user.setLastLoginAt(LocalDateTime.now());
            userRepository.save(user);
            auditService.log(user, "LOGIN_SUCCESS", "User logged in successfully");
            return generateAuthResponse(user);
        }

        // For transfer/sensitive action, just return success without new tokens
        return null;
    }

    @Transactional
    public AuthResponse refreshToken(String token) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(token)
                .orElseThrow(() -> new BusinessException("Invalid refresh token", "INVALID_REFRESH_TOKEN", HttpStatus.UNAUTHORIZED));

        if (refreshToken.getRevoked() || refreshToken.isExpired()) {
            throw new BusinessException("Refresh token expired or revoked", "REFRESH_TOKEN_EXPIRED", HttpStatus.UNAUTHORIZED);
        }

        refreshToken.setRevoked(true);
        refreshTokenRepository.save(refreshToken);

        User user = refreshToken.getUser();
        return generateAuthResponse(user);
    }

    @Transactional
    public void logout(Long userId) {
        refreshTokenRepository.revokeAllByUserId(userId);
        User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            auditService.log(user, "LOGOUT", "User logged out");
        }
    }

    private void handleFailedLogin(User user) {
        int attempts = user.getFailedLoginAttempts() + 1;
        user.setFailedLoginAttempts(attempts);

        if (attempts >= maxAttempts) {
            user.setStatus(User.UserStatus.LOCKED);
            user.setLockedUntil(LocalDateTime.now().plusMinutes(lockDurationMinutes));
            auditService.log(user, "ACCOUNT_LOCKED", "Account locked after " + attempts + " failed attempts");
        }
        userRepository.save(user);
    }

    private AuthResponse generateAuthResponse(User user) {
        UserDetailsImpl userDetails = new UserDetailsImpl(user);
        String accessToken = jwtService.generateAccessToken(userDetails);
        String refreshTokenStr = UUID.randomUUID().toString();

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(refreshTokenStr)
                .expiresAt(LocalDateTime.now().plusSeconds(refreshTokenExpiration / 1000))
                .build();
        refreshTokenRepository.save(refreshToken);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshTokenStr)
                .tokenType("Bearer")
                .expiresIn(jwtService.getAccessTokenExpiration() / 1000)
                .user(mapUserToResponse(user))
                .build();
    }

    private UserResponse mapUserToResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .username(user.getUsername())
                .phone(user.getPhone())
                .role(user.getRole().getName())
                .status(user.getStatus().name())
                .twoFactorEnabled(user.getTwoFactorEnabled())
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .build();
    }
}
