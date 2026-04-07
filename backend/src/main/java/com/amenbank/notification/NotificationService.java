package com.amenbank.notification;

import com.amenbank.entity.Notification;
import com.amenbank.entity.User;
import com.amenbank.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public void send(User user, String title, String message, Notification.NotificationType type) {
        Notification notification = Notification.builder()
                .user(user)
                .title(title)
                .message(message)
                .type(type)
                .build();
        notificationRepository.save(notification);
    }

    public void sendInfo(User user, String title, String message) {
        send(user, title, message, Notification.NotificationType.INFO);
    }

    public void sendSuccess(User user, String title, String message) {
        send(user, title, message, Notification.NotificationType.SUCCESS);
    }

    public void sendWarning(User user, String title, String message) {
        send(user, title, message, Notification.NotificationType.WARNING);
    }

    public void sendError(User user, String title, String message) {
        send(user, title, message, Notification.NotificationType.ERROR);
    }
}
