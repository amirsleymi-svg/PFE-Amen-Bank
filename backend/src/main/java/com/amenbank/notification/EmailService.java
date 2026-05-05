package com.amenbank.notification;

import java.util.Optional;
import java.util.Properties;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.amenbank.entity.Notification;
import com.amenbank.entity.User;
import com.amenbank.repository.UserRepository;

import jakarta.annotation.PostConstruct;
import jakarta.mail.AuthenticationFailedException;
import jakarta.mail.Authenticator;
import jakarta.mail.Message;
import jakarta.mail.PasswordAuthentication;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class EmailService {

    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final Session mailSession;
    private final String fromEmail;
    private final String smtpHost;
    private final int smtpPort;
    private volatile boolean smtpReady = false;

    public EmailService(
            NotificationService notificationService,
            UserRepository userRepository,
            @Value("${spring.mail.host}") String host,
            @Value("${spring.mail.port}") int port,
            @Value("${spring.mail.username}") String username,
            @Value("${spring.mail.password}") String password,
            @Value("${app.mail.from:no-reply@amenbank.com.tn}") String from) {
        this.notificationService = notificationService;
        this.userRepository = userRepository;
        this.fromEmail = from;
        this.smtpHost = host;
        this.smtpPort = port;

        Properties props = new Properties();
        props.put("mail.smtp.host", host);
        props.put("mail.smtp.port", String.valueOf(port));
        props.put("mail.smtp.auth", "false");
        props.put("mail.smtp.starttls.enable", "false");
        props.put("mail.smtp.starttls.required", "false");
        props.put("mail.smtp.connectiontimeout", "10000");
        props.put("mail.smtp.timeout", "10000");
        props.put("mail.smtp.writetimeout", "10000");

        this.mailSession = Session.getInstance(props, new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(username, password);
            }
        });

        log.info("EmailService initialized: host={}, port={}, user={}, from={}, passLen={}",
                host, port, username, fromEmail, password.length());
    }

    @PostConstruct
    void verifyConnectionOnStartup() {
        try (Transport transport = mailSession.getTransport("smtp")) {
            transport.connect();
            smtpReady = true;
            log.info("SMTP connection OK ({}:{} from {})", smtpHost, smtpPort, fromEmail);
        } catch (AuthenticationFailedException e) {
            log.error("SMTP AUTH FAILED ({}:{}) — verifier le username/password Mailtrap (MAIL_USERNAME/MAIL_PASSWORD). "
                    + "Message: {}", smtpHost, smtpPort, e.getMessage());
        } catch (Exception e) {
            log.error("SMTP connection test failed ({}:{}): {}", smtpHost, smtpPort, e.getMessage());
        }
    }

    public boolean isSmtpReady() {
        return smtpReady;
    }

    public String getFromEmail() {
        return fromEmail;
    }

    public String getSmtpHost() {
        return smtpHost;
    }

    public int getSmtpPort() {
        return smtpPort;
    }

    @Async
    public void sendTestEmail(String to) {
        String subject = "Amen Bank - Test de configuration email";
        String body = "Bonjour,\n\n"
                + "Ceci est un email de test envoye par Amen Bank pour verifier la configuration SMTP.\n\n"
                + "Si vous recevez ce message, les notifications (OTP, activation, reinitialisation de mot de passe) "
                + "fonctionneront correctement.\n\n"
                + "Cordialement,\nAmen Bank";
        sendEmail(to, subject, body);
        pushInAppNotification(to, subject, "Email de test envoye (verification de la configuration).");
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
        pushInAppNotification(to, subject,
            "Votre code de verification pour " + purpose + " est : " + code + " (valable 5 min)");
    }

    @Async
    public void sendActivationEmail(String to, String token) {
        String activationUrl = "https://localhost:4200/activate-account?token=" + token;
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
        pushInAppNotification(to, subject,
            "Votre inscription a ete approuvee ! Lien d'activation : " + activationUrl);
    }

    @Async
    public void sendPasswordResetEmail(String to, String token) {
        String resetUrl = "https://localhost:4200/reset-password?token=" + token;
        String subject = "Amen Bank - Reinitialisation du mot de passe";
        String body = String.format(
            "Bonjour,\n\n" +
            "Vous avez demande la reinitialisation de votre mot de passe Amen Bank.\n\n" +
            "Pour choisir un nouveau mot de passe, cliquez sur le lien ci-dessous :\n" +
            "%s\n\n" +
            "Ce lien est valable pendant 1 heure. Si vous n'etes pas a l'origine de cette demande, " +
            "ignorez cet email - votre mot de passe actuel reste inchange.\n\n" +
            "Cordialement,\nAmen Bank",
            resetUrl
        );
        sendEmail(to, subject, body);
        pushInAppNotification(to, subject,
            "Lien de reinitialisation envoye : " + resetUrl);
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
        pushInAppNotification(to, subject,
            "Compte cree. Identifiant : " + username + " / Mot de passe temporaire : " + tempPassword);
    }

    @Async
    public void sendRejectionEmail(String to) {
        String subject = "Amen Bank - Inscription rejetée";
        String body = "Bonjour,\n\n" +
                "Votre demande de création de compte a été rejetée.\n\n" +
                "Cordialement,\nAmen Bank";
        sendEmail(to, subject, body);
        pushInAppNotification(to, subject, "votre création de compte est rejeté");
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
            smtpReady = true;
            log.info("Email sent successfully to {}", to);
        } catch (AuthenticationFailedException e) {
            smtpReady = false;
            log.error("SMTP AUTH FAILED sending to {} — verifier MAIL_USERNAME/MAIL_PASSWORD (Mailtrap). Detail: {}",
                    to, e.getMessage());
        } catch (Exception e) {
            log.error("SMTP sending failed to {}: {}", to, e.getMessage(), e);
        }
    }

    private void pushInAppNotification(String email, String title, String message) {
        try {
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (userOpt.isPresent()) {
                notificationService.send(userOpt.get(), title, message, Notification.NotificationType.INFO);
                log.info("Email mirrored to in-app notification for user: {}", email);
            }
        } catch (Exception e) {
            log.warn("Could not mirror email as in-app notification: {}", e.getMessage());
        }
    }
}
