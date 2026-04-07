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
            @PageableDefault(size = 20) Pageable pageable) {
        Page<NotificationResponse> page = notificationRepository
                .findByUserIdOrderByCreatedAtDesc(auth.getId(), pageable)
                .map(this::mapToResponse);
        return ResponseEntity.ok(ApiResponse.success("Notifications retrieved", page));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount(
            @AuthenticationPrincipal UserDetailsImpl auth) {
        long count = notificationRepository.countByUserIdAndIsReadFalse(auth.getId());
        return ResponseEntity.ok(ApiResponse.success("Unread count", Map.of("count", count)));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable Long id) {
        notificationRepository.findById(id).ifPresent(n -> {
            n.setIsRead(true);
            notificationRepository.save(n);
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

    private NotificationResponse mapToResponse(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .title(n.getTitle())
                .message(n.getMessage())
                .type(n.getType().name())
                .isRead(n.getIsRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
