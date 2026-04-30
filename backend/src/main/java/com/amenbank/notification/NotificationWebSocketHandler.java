package com.amenbank.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@RequiredArgsConstructor
public class NotificationWebSocketHandler extends TextWebSocketHandler {

    private final ObjectMapper objectMapper;
    private final Map<String, Long> sessionUserMap = new ConcurrentHashMap<>();
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        Long userId = extractUserId(session);
        if (userId == null) {
            return;
        }
        sessions.put(session.getId(), session);
        sessionUserMap.put(session.getId(), userId);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        sessions.remove(session.getId());
        sessionUserMap.remove(session.getId());
    }

    public void sendToUser(Long userId, NotificationRealtimeEvent event) {
        sessions.forEach((sessionId, session) -> {
            Long connectedUserId = sessionUserMap.get(sessionId);
            if (connectedUserId == null || !connectedUserId.equals(userId) || !session.isOpen()) {
                return;
            }
            try {
                String payload = objectMapper.writeValueAsString(event);
                session.sendMessage(new TextMessage(payload));
            } catch (IOException ignored) {
                // Keep REST notification persistence resilient even if websocket send fails.
            }
        });
    }

    private Long extractUserId(WebSocketSession session) {
        if (session.getUri() == null || session.getUri().getQuery() == null) {
            return null;
        }
        String[] parts = session.getUri().getQuery().split("&");
        for (String part : parts) {
            if (part.startsWith("userId=")) {
                try {
                    return Long.parseLong(part.substring("userId=".length()));
                } catch (NumberFormatException ignored) {
                    return null;
                }
            }
        }
        return null;
    }
}
