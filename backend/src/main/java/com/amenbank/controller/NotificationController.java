package com.amenbank.controller;

import com.amenbank.dto.response.ApiResponse;
import com.amenbank.dto.response.NotificationResponse;
import com.amenbank.entity.Notification;
import com.amenbank.repository.NotificationRepository;
import com.amenbank.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository notificationRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<NotificationResponse>>> getNotifications(
            @AuthenticationPrincipal UserDetailsImpl auth,
            @RequestParam(required = false) Long userId, // IMPROVED
            @PageableDefault(size = 20) Pageable pageable) {
        Long targetUserId = userId != null ? userId : auth.getId(); // IMPROVED
        Page<NotificationResponse> page = notificationRepository
                .findByUserIdOrderByCreatedAtDesc(targetUserId, pageable)
                .map(this::mapToResponse);
        return ResponseEntity.ok(ApiResponse.success("Notifications retrieved", page));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getUnreadCount(
            @AuthenticationPrincipal UserDetailsImpl auth,
            @RequestParam(required = false) Long userId) { // IMPROVED
        Long targetUserId = userId != null ? userId : auth.getId(); // IMPROVED
        long count = notificationRepository.countByUserIdAndIsReadFalse(targetUserId);
        String role = auth.getAuthorities().iterator().next().getAuthority(); // ADDED
        return ResponseEntity.ok(ApiResponse.success("Unread count", Map.of(
            "count", count,
            "role", role // ADDED
        )));
    }

    @PatchMapping("/{id}/read") // IMPROVED (Changed from @PostMapping)
    public ResponseEntity<ApiResponse<Void>> markAsRead(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        notificationRepository.findById(id).ifPresent(n -> {
            if (n.getUser().getId().equals(auth.getId())) {
                n.setIsRead(true);
                notificationRepository.save(n);
            }
        });
        return ResponseEntity.ok(ApiResponse.success("Marked as read"));
    }

    @PostMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(
            @AuthenticationPrincipal UserDetailsImpl auth) {
        notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(auth.getId(), Pageable.unpaged())
                .forEach(n -> {
                    n.setIsRead(true);
                    notificationRepository.save(n);
                });
        return ResponseEntity.ok(ApiResponse.success("All notifications marked as read"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        notificationRepository.findById(id).ifPresent(n -> {
            if (n.getUser().getId().equals(auth.getId())) {
                notificationRepository.delete(n);
            }
        });
        return ResponseEntity.ok(ApiResponse.success("Notification deleted"));
    }

    @DeleteMapping
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<ApiResponse<Void>> deleteAllNotifications(
            @AuthenticationPrincipal UserDetailsImpl auth) {
        notificationRepository.deleteByUserId(auth.getId());
        return ResponseEntity.ok(ApiResponse.success("All notifications deleted"));
    }

    private NotificationResponse mapToResponse(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .title(n.getTitle())
                .message(n.getMessage())
                .type(n.getType().name())
                .role(n.getRole()) // ADDED
                .isRead(n.getIsRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
