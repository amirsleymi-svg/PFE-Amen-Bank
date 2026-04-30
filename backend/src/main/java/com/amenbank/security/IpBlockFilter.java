package com.amenbank.security;

import com.amenbank.repository.BlockedIpRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Rejects any request coming from an IP present in the blocked_ips table
 * before the rest of the filter chain runs. This means blocked IPs cannot
 * even attempt to authenticate.
 */
@Component
@RequiredArgsConstructor
public class IpBlockFilter extends OncePerRequestFilter {

    private final BlockedIpRepository blockedIpRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String ip = clientIp(request);
        if (ip != null && blockedIpRepository.existsByIpAddressAndActiveTrue(ip)) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write(
                    "{\"success\":false,\"message\":\"Acces refuse depuis cette adresse IP.\",\"errorCode\":\"IP_BLOCKED\"}"
            );
            return;
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
