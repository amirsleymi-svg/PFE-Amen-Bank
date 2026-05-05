package com.amenbank.notification;

import com.amenbank.entity.Notification;
import lombok.Builder;

import java.time.LocalDateTime;

@Builder
public record NotificationRealtimeEvent(
        Long userId,
        String title,
        String message,
        Notification.NotificationType type,
        String role, // ADDED
        LocalDateTime createdAt
) {
}
