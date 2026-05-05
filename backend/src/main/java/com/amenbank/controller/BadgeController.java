package com.amenbank.controller;

import com.amenbank.dto.response.ApiResponse;
import com.amenbank.dto.response.BadgeResponse;
import com.amenbank.entity.User;
import com.amenbank.repository.UserRepository;
import com.amenbank.security.UserDetailsImpl;
import com.amenbank.service.BadgeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/badges")
@RequiredArgsConstructor
public class BadgeController {

    private final BadgeService badgeService;
    private final UserRepository userRepository;
    private final com.amenbank.repository.AuditLogRepository auditLogRepository;

    @GetMapping("/counts")
    public ResponseEntity<ApiResponse<BadgeResponse>> getBadgeCounts(@AuthenticationPrincipal UserDetailsImpl auth) {
        User user = userRepository.findById(auth.getId()).orElseThrow();
        BadgeResponse response = BadgeResponse.builder()
                .counts(badgeService.getBadgeCounts(user))
                .build();
        return ResponseEntity.ok(ApiResponse.success("Badge counts retrieved", response));
    }

    @org.springframework.web.bind.annotation.PostMapping("/mark-seen")
    public ResponseEntity<ApiResponse<Void>> markAllSeen() {
        auditLogRepository.markAllAsRead();
        return ResponseEntity.ok(ApiResponse.success("All logs marked as seen"));
    }
}
