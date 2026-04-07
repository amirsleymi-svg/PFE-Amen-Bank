package com.amenbank.service;

import com.amenbank.audit.AuditService;
import com.amenbank.dto.request.RegistrationRequestDto;
import com.amenbank.dto.response.RegistrationRequestResponse;
import com.amenbank.entity.*;
import com.amenbank.exception.BusinessException;
import com.amenbank.notification.EmailService;
import com.amenbank.notification.NotificationService;
import com.amenbank.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RegistrationService {

    private final RegistrationRequestRepository registrationRequestRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ActivationTokenRepository activationTokenRepository;
    private final BankAccountRepository bankAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final AuditService auditService;
    private final NotificationService notificationService;

    @Transactional
    public void submitRequest(RegistrationRequestDto dto) {
        if (userRepository.existsByEmail(dto.getEmail()) || registrationRequestRepository.existsByEmail(dto.getEmail())) {
            throw new BusinessException("Email already in use or pending", "EMAIL_EXISTS", HttpStatus.CONFLICT);
        }

        RegistrationRequest request = RegistrationRequest.builder()
                .firstName(dto.getFirstName())
                .lastName(dto.getLastName())
                .email(dto.getEmail())
                .phone(dto.getPhone())
                .build();
        registrationRequestRepository.save(request);
    }

    public Page<RegistrationRequestResponse> getPendingRequests(Pageable pageable) {
        return registrationRequestRepository.findByStatus(RegistrationRequest.RequestStatus.PENDING, pageable)
                .map(this::mapToResponse);
    }

    public Page<RegistrationRequestResponse> getAllRequests(Pageable pageable) {
        return registrationRequestRepository.findAll(pageable).map(this::mapToResponse);
    }

    @Transactional
    public void approve(Long id, User admin, String comment) {
        RegistrationRequest request = registrationRequestRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Registration request not found", "REQUEST_NOT_FOUND", HttpStatus.NOT_FOUND));

        if (request.getStatus() != RegistrationRequest.RequestStatus.PENDING) {
            throw new BusinessException("Request already processed", "REQUEST_ALREADY_PROCESSED");
        }

        request.setStatus(RegistrationRequest.RequestStatus.APPROVED);
        request.setReviewedBy(admin);
        request.setDecisionComment(comment);
        request.setReviewedAt(LocalDateTime.now());
        registrationRequestRepository.save(request);

        // Create user account
        Role clientRole = roleRepository.findByName("CLIENT")
                .orElseThrow(() -> new BusinessException("Client role not found", "ROLE_NOT_FOUND"));

        String username = generateUsername(request.getFirstName(), request.getLastName());
        String tempPassword = UUID.randomUUID().toString().substring(0, 12);

        User newUser = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .username(username)
                .passwordHash(passwordEncoder.encode(tempPassword))
                .phone(request.getPhone())
                .role(clientRole)
                .status(User.UserStatus.PENDING)
                .twoFactorEnabled(true)
                .build();
        userRepository.save(newUser);

        // Create activation token
        String token = UUID.randomUUID().toString();
        ActivationToken activationToken = ActivationToken.builder()
                .user(newUser)
                .token(token)
                .expiresAt(LocalDateTime.now().plusHours(24))
                .build();
        activationTokenRepository.save(activationToken);

        // Create default bank account
        BankAccount account = BankAccount.builder()
                .accountNumber(generateAccountNumber())
                .iban(generateIban())
                .client(newUser)
                .build();
        bankAccountRepository.save(account);

        emailService.sendActivationEmail(request.getEmail(), token);
        auditService.log(admin, "APPROVE_REGISTRATION", "RegistrationRequest", id,
                "Approved registration for " + request.getEmail());
    }

    @Transactional
    public void reject(Long id, User admin, String comment) {
        RegistrationRequest request = registrationRequestRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Registration request not found", "REQUEST_NOT_FOUND", HttpStatus.NOT_FOUND));

        if (request.getStatus() != RegistrationRequest.RequestStatus.PENDING) {
            throw new BusinessException("Request already processed", "REQUEST_ALREADY_PROCESSED");
        }

        request.setStatus(RegistrationRequest.RequestStatus.REJECTED);
        request.setReviewedBy(admin);
        request.setDecisionComment(comment);
        request.setReviewedAt(LocalDateTime.now());
        registrationRequestRepository.save(request);

        auditService.log(admin, "REJECT_REGISTRATION", "RegistrationRequest", id,
                "Rejected registration for " + request.getEmail());
    }

    @Transactional
    public void activateAccount(String token, String password) {
        ActivationToken activationToken = activationTokenRepository.findByToken(token)
                .orElseThrow(() -> new BusinessException("Invalid activation token", "INVALID_TOKEN", HttpStatus.BAD_REQUEST));

        if (activationToken.getUsed()) {
            throw new BusinessException("Token already used", "TOKEN_USED");
        }
        if (activationToken.isExpired()) {
            throw new BusinessException("Token expired", "TOKEN_EXPIRED");
        }

        activationToken.setUsed(true);
        activationTokenRepository.save(activationToken);

        User user = activationToken.getUser();
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setStatus(User.UserStatus.ACTIVE);
        userRepository.save(user);

        auditService.log(user, "ACCOUNT_ACTIVATED", "Account activated via token");
    }

    private String generateUsername(String firstName, String lastName) {
        String base = (firstName.toLowerCase() + "." + lastName.toLowerCase()).replaceAll("[^a-z.]", "");
        String username = base;
        int counter = 1;
        while (userRepository.existsByUsername(username)) {
            username = base + counter;
            counter++;
        }
        return username;
    }

    private String generateAccountNumber() {
        String num;
        do {
            num = String.format("%011d", (long)(Math.random() * 99999999999L));
        } while (bankAccountRepository.existsByAccountNumber(num));
        return num;
    }

    private String generateIban() {
        String iban;
        do {
            iban = "TN59" + String.format("%020d", (long)(Math.random() * 99999999999999999L));
        } while (bankAccountRepository.existsByIban(iban));
        return iban;
    }

    private RegistrationRequestResponse mapToResponse(RegistrationRequest r) {
        return RegistrationRequestResponse.builder()
                .id(r.getId())
                .firstName(r.getFirstName())
                .lastName(r.getLastName())
                .email(r.getEmail())
                .phone(r.getPhone())
                .status(r.getStatus().name())
                .reviewedByName(r.getReviewedBy() != null ? r.getReviewedBy().getFirstName() + " " + r.getReviewedBy().getLastName() : null)
                .decisionComment(r.getDecisionComment())
                .reviewedAt(r.getReviewedAt())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
