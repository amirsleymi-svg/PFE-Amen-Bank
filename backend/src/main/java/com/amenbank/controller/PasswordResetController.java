package com.amenbank.controller;

import com.amenbank.dto.request.ForgotPasswordRequest;
import com.amenbank.dto.response.ApiResponse;
import com.amenbank.service.PasswordResetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/password-reset-requests")
@RequiredArgsConstructor
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    @PostMapping
    public ResponseEntity<ApiResponse<Void>> submitRequest(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.submitRequest(request.getEmail());
        return ResponseEntity.ok(ApiResponse.success("Password reset request submitted. An admin will review it."));
    }
}
