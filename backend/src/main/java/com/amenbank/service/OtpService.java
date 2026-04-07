package com.amenbank.service;

import com.amenbank.entity.TwoFactorCode;
import com.amenbank.entity.User;
import com.amenbank.notification.EmailService;
import com.amenbank.repository.TwoFactorCodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class OtpService {

    private final TwoFactorCodeRepository twoFactorCodeRepository;
    private final EmailService emailService;
    private final SecureRandom random = new SecureRandom();

    @Value("${app.otp.expiration-minutes}")
    private int otpExpirationMinutes;

    @Value("${app.otp.length}")
    private int otpLength;

    @Transactional
    public void generateAndSend(User user, TwoFactorCode.OtpPurpose purpose) {
        twoFactorCodeRepository.invalidateAllByUserId(user.getId());

        String code = generateCode();

        TwoFactorCode otp = TwoFactorCode.builder()
                .user(user)
                .code(code)
                .purpose(purpose)
                .expiresAt(LocalDateTime.now().plusMinutes(otpExpirationMinutes))
                .build();
        twoFactorCodeRepository.save(otp);

        String purposeLabel = switch (purpose) {
            case LOGIN -> "la connexion";
            case TRANSFER -> "le virement";
            case SENSITIVE_ACTION -> "l'action sensible";
        };
        emailService.sendOtpEmail(user.getEmail(), code, purposeLabel);
    }

    public boolean verify(User user, String code, TwoFactorCode.OtpPurpose purpose) {
        return twoFactorCodeRepository
                .findTopByUserIdAndPurposeAndUsedFalseOrderByCreatedAtDesc(user.getId(), purpose)
                .map(otp -> {
                    if (otp.isExpired()) return false;
                    if (!otp.getCode().equals(code)) return false;
                    otp.setUsed(true);
                    twoFactorCodeRepository.save(otp);
                    return true;
                })
                .orElse(false);
    }

    private String generateCode() {
        int bound = (int) Math.pow(10, otpLength);
        int code = random.nextInt(bound);
        return String.format("%0" + otpLength + "d", code);
    }
}
