package com.amenbank.controller;

import com.amenbank.dto.request.RegistrationRequestDto;
import com.amenbank.dto.response.ApiResponse;
import com.amenbank.service.RegistrationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/registration-requests")
@RequiredArgsConstructor
public class RegistrationController {

    private final RegistrationService registrationService;

    @PostMapping
    public ResponseEntity<ApiResponse<Void>> submitRegistration(@Valid @RequestBody RegistrationRequestDto request) {
        registrationService.submitRequest(request);
        return ResponseEntity.ok(ApiResponse.success("Registration request submitted successfully. You will receive an email once reviewed."));
    }
}
