package com.amenbank.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final long WINDOW_MS = 60_000L;
    private static final int MAX_REQUESTS_PER_WINDOW = 10;

    private static final Map<String, String> PROTECTED = Map.of(
            "/api/auth/login", "POST",
            "/api/auth/forgot-password", "POST",
            "/api/auth/refresh", "POST",
            "/api/auth/verify-2fa", "POST"
    );

    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        String method = request.getMethod();
        String allowed = PROTECTED.get(path);
        if (allowed == null || !allowed.equals(method)) {
            chain.doFilter(request, response);
            return;
        }

        String key = clientIp(request) + "|" + path;
        long now = System.currentTimeMillis();
        Deque<Long> window = hits.computeIfAbsent(key, k -> new ConcurrentLinkedDeque<>());
        synchronized (window) {
            while (!window.isEmpty() && window.peekFirst() < now - WINDOW_MS) {
                window.pollFirst();
            }
            if (window.size() >= MAX_REQUESTS_PER_WINDOW) {
                response.setStatus(429);
                response.setContentType("application/json");
                response.getWriter().write(
                        "{\"success\":false,\"message\":\"Too many requests. Please try again later.\",\"errorCode\":\"RATE_LIMITED\"}"
                );
                return;
            }
            window.addLast(now);
        }

        chain.doFilter(request, response);
    }

    private String clientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
