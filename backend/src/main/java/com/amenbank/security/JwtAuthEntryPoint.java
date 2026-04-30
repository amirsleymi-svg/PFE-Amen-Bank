package com.amenbank.security;

import com.amenbank.audit.AuditService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthEntryPoint implements AuthenticationEntryPoint {

    @Lazy
    private final AuditService auditService;

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        String path = request.getRequestURI();
        String method = request.getMethod();
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null) ip = request.getRemoteAddr();
        String ua = request.getHeader("User-Agent");

        // Spring dispatches unhandled errors through /error, which re-enters the
        // security filter chain as an anonymous request. Don't double-log those —
        // the original denial has already been recorded.
        boolean isNoise = path == null
                || path.equals("/error")
                || path.startsWith("/error/")
                || path.equals("/favicon.ico");

        if (!isNoise) {
            try {
                auditService.log(null, "UNAUTHORIZED_ACCESS",
                        null, null,
                        String.format("%s %s | ip=%s | ua=%s | reason=%s",
                                method, path, ip, ua, authException.getMessage()));
            } catch (Exception e) {
                log.warn("Failed to audit unauthorized access: {}", e.getMessage());
            }
        }

        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);

        Map<String, Object> body = Map.of(
            "success", false,
            "message", "Unauthorized - Invalid or missing token",
            "errorCode", "UNAUTHORIZED",
            "timestamp", LocalDateTime.now().toString()
        );

        new ObjectMapper().writeValue(response.getOutputStream(), body);
    }
}
