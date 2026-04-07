package com.amenbank.config;

import com.amenbank.entity.User;
import com.amenbank.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        // Fix seed passwords if they don't match
        updatePasswordIfNeeded("admin", "Admin@2026");
        updatePasswordIfNeeded("sami.employee", "Employee@2026");
        updatePasswordIfNeeded("fatma.client", "Client@2026");
    }

    private void updatePasswordIfNeeded(String username, String rawPassword) {
        userRepository.findByUsername(username).ifPresent(user -> {
            if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
                user.setPasswordHash(passwordEncoder.encode(rawPassword));
                userRepository.save(user);
            }
        });
    }
}
