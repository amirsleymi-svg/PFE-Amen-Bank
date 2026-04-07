package com.amenbank.notification;

import com.amenbank.entity.Notification;
import com.amenbank.entity.User;
import com.amenbank.repository.NotificationRepository;
import com.amenbank.repository.UserRepository;
import jakarta.mail.*;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.Properties;

@Service
@Slf4j
public class EmailService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final Session mailSession;
    private final String fromEmail;

    public EmailService(
            NotificationRepository notificationRepository,
            UserRepository userRepository,
            @Value("${spring.mail.host}") String host,
            @Value("${spring.mail.port}") int port,
            @Value("${spring.mail.username}") String username,
            @Value("${spring.mail.password}") String password) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.fromEmail = username;

        Properties props = new Properties();
        props.put("mail.smtp.host", host);
        props.put("mail.smtp.port", String.valueOf(port));
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.starttls.required", "true");
        props.put("mail.smtp.connectiontimeout", "10000");
        props.put("mail.smtp.timeout", "10000");
        props.put("mail.smtp.writetimeout", "10000");

        this.mailSession = Session.getInstance(props, new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(username, password);
            }
        });

        log.info("EmailService initialized: host={}, port={}, user={}, passLen={}", host, port, username, password.length());
    }

    @Async
    public void sendOtpEmail(String to, String code, String purpose) {
        String subject = "Amen Bank - Code de verification";
        String body = String.format(
            "Bonjour,\n\n" +
            "Votre code de verification pour %s est : %s\n\n" +
            "Ce code est valable pendant 5 minutes.\n\n" +
            "Si vous n'avez pas demande ce code, veuillez ignorer cet email.\n\n" +
            "Cordialement,\nAmen Bank",
            purpose, code
        );
        sendEmail(to, subject, body);
        saveAsNotification(to, subject,
            "Votre code de verification pour " + purpose + " est : " + code + " (valable 5 min)");
    }

    @Async
    public void sendActivationEmail(String to, String token) {
        String activationUrl = "http://localhost:4200/activate-account?token=" + token;
        String subject = "Amen Bank - Activation de votre compte";
        String body = String.format(
            "Bonjour,\n\n" +
            "Votre demande d'inscription a ete approuvee.\n\n" +
            "Pour activer votre compte et choisir votre mot de passe, cliquez sur le lien suivant :\n" +
            "%s\n\n" +
            "Ce lien est valable pendant 24 heures.\n\n" +
            "Cordialement,\nAmen Bank",
            activationUrl
        );
        sendEmail(to, subject, body);
        saveAsNotification(to, subject,
            "Votre inscription a ete approuvee ! Lien d'activation : " + activationUrl);
    }

    @Async
    public void sendPasswordResetEmail(String to, String token) {
        String resetUrl = "http://localhost:4200/reset-password?token=" + token;
        String subject = "Amen Bank - Reinitialisation du mot de passe";
        String body = String.format(
            "Bonjour,\n\n" +
            "Votre demande de reinitialisation du mot de passe a ete approuvee.\n\n" +
            "Pour reinitialiser votre mot de passe, cliquez sur le lien suivant :\n" +
            "%s\n\n" +
            "Ce lien est valable pendant 1 heure.\n\n" +
            "Cordialement,\nAmen Bank",
            resetUrl
        );
        sendEmail(to, subject, body);
        saveAsNotification(to, subject,
            "Votre demande de reinitialisation a ete approuvee. Lien : " + resetUrl);
    }

    @Async
    public void sendAccountCreatedEmail(String to, String username, String tempPassword) {
        String subject = "Amen Bank - Votre compte a ete cree";
        String body = String.format(
            "Bonjour,\n\n" +
            "Votre compte Amen Bank a ete cree avec succes.\n\n" +
            "Identifiant : %s\n" +
            "Mot de passe temporaire : %s\n\n" +
            "Veuillez changer votre mot de passe apres votre premiere connexion.\n\n" +
            "Cordialement,\nAmen Bank",
            username, tempPassword
        );
        sendEmail(to, subject, body);
        saveAsNotification(to, subject,
            "Compte cree. Identifiant : " + username + " / Mot de passe temporaire : " + tempPassword);
    }

    private void sendEmail(String to, String subject, String body) {
        log.info("\n====== EMAIL ======\nTo: {}\nSubject: {}\nBody:\n{}\n===================", to, subject, body);

        try {
            MimeMessage message = new MimeMessage(mailSession);
            message.setFrom(new InternetAddress(fromEmail, "Amen Bank"));
            message.setRecipient(Message.RecipientType.TO, new InternetAddress(to));
            message.setSubject(subject, "UTF-8");
            message.setText(body, "UTF-8");
            Transport.send(message);
            log.info("Email sent successfully to {}", to);
        } catch (Exception e) {
            log.error("SMTP sending failed to {}: {}", to, e.getMessage(), e);
        }
    }

    private void saveAsNotification(String email, String title, String message) {
        try {
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isPresent()) {
                Notification notification = Notification.builder()
                        .user(userOpt.get())
                        .title(title)
                        .message(message)
                        .type(Notification.NotificationType.INFO)
                        .build();
                notificationRepository.save(notification);
                log.info("Email saved as notification for user: {}", email);
            }
        } catch (Exception e) {
            log.warn("Could not save email as notification: {}", e.getMessage());
        }
    }
}
