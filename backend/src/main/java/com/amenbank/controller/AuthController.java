package com.amenbank.controller;

import com.amenbank.dto.request.*;
import com.amenbank.dto.response.ApiResponse;
import com.amenbank.dto.response.AuthResponse;
import com.amenbank.security.UserDetailsImpl;
import com.amenbank.service.AuthService;
import com.amenbank.service.RegistrationService;
import com.amenbank.service.PasswordResetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final RegistrationService registrationService;
    private final PasswordResetService passwordResetService;

    @SuppressWarnings("unchecked")
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<?>> login(@Valid @RequestBody LoginRequest request) {
        Object result = authService.login(request);
        if (result instanceof Map) {
            Map<String, String> map = (Map<String, String>) result;
            return ResponseEntity.ok(ApiResponse.success("2FA code sent to your email", map));
        }
        // 2FA disabled — return tokens directly
        return ResponseEntity.ok(ApiResponse.success("Login successful", (AuthResponse) result));
    }

    @PostMapping("/verify-2fa")
    public ResponseEntity<ApiResponse<AuthResponse>> verify2fa(@Valid @RequestBody Verify2FARequest request) {
        AuthResponse response = authService.verify2FA(request);
        return ResponseEntity.ok(ApiResponse.success("Authentication successful", response));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@RequestBody Map<String, String> request) {
        AuthResponse response = authService.refreshToken(request.get("refreshToken"));
        return ResponseEntity.ok(ApiResponse.success("Token refreshed", response));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@AuthenticationPrincipal UserDetailsImpl user) {
        authService.logout(user.getId());
        return ResponseEntity.ok(ApiResponse.success("Logged out successfully"));
    }

    @PostMapping("/activate-account")
    public ResponseEntity<ApiResponse<Void>> activateAccount(@RequestBody Map<String, String> request) {
        String token = request.get("token");
        String password = request.get("password");
        if (token == null || token.isBlank()) {
            throw new com.amenbank.exception.BusinessException("Token is required", "MISSING_TOKEN");
        }
        if (password == null || password.length() < 8) {
            throw new com.amenbank.exception.BusinessException("Password must be at least 8 characters", "WEAK_PASSWORD");
        }
        registrationService.activateAccount(token, password);
        return ResponseEntity.ok(ApiResponse.success("Account activated successfully"));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.submitRequest(request.getEmail());
        return ResponseEntity.ok(ApiResponse.success("Password reset request submitted. An administrator will review it."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Password reset successfully"));
    }
}
