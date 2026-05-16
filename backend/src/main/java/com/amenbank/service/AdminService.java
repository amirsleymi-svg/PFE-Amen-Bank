package com.amenbank.service;

import com.amenbank.audit.AuditService;
import com.amenbank.dto.request.CreateUserRequest;
import com.amenbank.dto.request.UpdateUserRequest;
import com.amenbank.dto.response.*;
import com.amenbank.entity.*;
import com.amenbank.exception.BusinessException;
import com.amenbank.notification.EmailService;
import com.amenbank.notification.NotificationService;
import com.amenbank.notification.NotificationWebSocketHandler;
import com.amenbank.repository.*;
import com.amenbank.security.TokenHasher;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminService {
    private static final String ROOT_ADMIN_EMAIL = "admin@amenbank.com.tn";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RegistrationRequestRepository registrationRequestRepository;
    private final PasswordResetRequestRepository passwordResetRequestRepository;
    private final CreditRequestRepository creditRequestRepository;
    private final TransactionRepository transactionRepository;
    private final AuditLogRepository auditLogRepository;
    private final DailyReportRepository dailyReportRepository;
    private final FraudAlertRepository fraudAlertRepository;
    private final ActivationTokenRepository activationTokenRepository;
    private final BankAccountRepository bankAccountRepository;
    private final AccountCardRepository accountCardRepository;
    private final BlockedIpRepository blockedIpRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final AuditService auditService;
    private final NotificationService notificationService;
    private final NotificationWebSocketHandler notificationWebSocketHandler;
    private final EntityManager entityManager;
    private final TokenHasher tokenHasher;

    public Page<UserResponse> getUsers(Pageable pageable) {
        return userRepository.findAll(pageable).map(this::mapUserToResponse);
    }

    public Page<UserResponse> getUsersByRole(String roleName, Pageable pageable) {
        return userRepository.findByRoleName(roleName, pageable).map(this::mapUserToResponse);
    }

    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new BusinessException("User not found", "USER_NOT_FOUND", HttpStatus.NOT_FOUND));
        return mapUserToResponse(user);
    }

    public static boolean isRootAdmin(User user) {
        if (user == null) return false;
        String email = user.getEmail();
        return email != null && ROOT_ADMIN_EMAIL.equalsIgnoreCase(email.trim());
    }

    @Transactional
    public UserResponse createUser(CreateUserRequest request, User admin) {
        String roleName = request.getRole();
        if (!"EMPLOYEE".equals(roleName) && !"ADMIN".equals(roleName)) {
            throw new BusinessException("Seuls les comptes employe et administrateur peuvent etre crees", "INVALID_ROLE");
        }
        if ("ADMIN".equals(roleName) && !isRootAdmin(admin)) {
            throw new BusinessException(
                    "Seul l'administrateur racine peut creer un compte administrateur",
                    "ROOT_ADMIN_REQUIRED",
                    HttpStatus.FORBIDDEN);
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessException("Email deja utilise", "EMAIL_EXISTS", HttpStatus.CONFLICT);
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BusinessException("Identifiant deja utilise", "USERNAME_EXISTS", HttpStatus.CONFLICT);
        }

        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new BusinessException("Role not found", "ROLE_NOT_FOUND"));

        // Create user with PENDING status and placeholder password
        User newUser = User.builder()
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .username(request.getUsername())
                .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                .phone(request.getPhone())
                .role(role)
                .status(User.UserStatus.PENDING)
                .twoFactorEnabled(true)
                .build();
        userRepository.save(newUser);

        // Generate activation token and send activation email
        String token = UUID.randomUUID().toString();
        ActivationToken activationToken = ActivationToken.builder()
                .user(newUser)
                .token(tokenHasher.sha256Hex(token))
                .expiresAt(LocalDateTime.now().plusHours(48))
                .build();
        activationTokenRepository.save(activationToken);

        emailService.sendActivationEmail(newUser.getEmail(), token);
        auditService.log(admin, "CREATE_USER", "User", newUser.getId(),
                "Created " + roleName + " user: " + newUser.getUsername() + " (activation link sent)");

        return mapUserToResponse(newUser);
    }

    @Transactional
    public UserResponse updateUser(Long id, UpdateUserRequest request, User admin) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new BusinessException("User not found", "USER_NOT_FOUND", HttpStatus.NOT_FOUND));

        if (request.getFirstName() != null) user.setFirstName(request.getFirstName());
        if (request.getLastName() != null) user.setLastName(request.getLastName());
        if (request.getPhone() != null) user.setPhone(request.getPhone());

        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new BusinessException("Email already exists", "EMAIL_EXISTS", HttpStatus.CONFLICT);
            }
            user.setEmail(request.getEmail());
        }

        if (request.getRole() != null) {
            Role role = roleRepository.findByName(request.getRole())
                    .orElseThrow(() -> new BusinessException("Role not found", "ROLE_NOT_FOUND"));
            user.setRole(role);
        }

        userRepository.save(user);
        auditService.log(admin, "UPDATE_USER", "User", id, "Updated user: " + user.getUsername());

        return mapUserToResponse(user);
    }

    @Transactional
    public UserResponse changeUserRole(Long id, String newRoleName, User admin) {
        String requestedRole = newRoleName == null
                ? ""
                : newRoleName.trim().toUpperCase(java.util.Locale.ROOT);
        boolean rootAdmin = isRootAdmin(admin);

        if ("ADMIN".equals(requestedRole) && !rootAdmin) {
            throw new BusinessException(
                    "Seul l'administrateur racine peut attribuer le role administrateur",
                    "ROOT_ADMIN_REQUIRED",
                    HttpStatus.FORBIDDEN);
        }
        if (!"CLIENT".equals(requestedRole) && !"EMPLOYEE".equals(requestedRole) && !"ADMIN".equals(requestedRole)) {
            throw new BusinessException("Role invalide. Roles autorises: CLIENT, EMPLOYEE, ADMIN", "INVALID_ROLE_CHANGE", HttpStatus.FORBIDDEN);
        }

        User user = userRepository.findById(id)
                .orElseThrow(() -> new BusinessException("User not found", "USER_NOT_FOUND", HttpStatus.NOT_FOUND));

        if (user.getId().equals(admin.getId())) {
            throw new BusinessException("Vous ne pouvez pas changer votre propre role", "SELF_ROLE_CHANGE", HttpStatus.FORBIDDEN);
        }

        if ("ADMIN".equals(user.getRole().getName()) && !rootAdmin) {
            throw new BusinessException(
                    "Seul l'administrateur racine peut gerer le role d'un administrateur",
                    "ROOT_ADMIN_REQUIRED",
                    HttpStatus.FORBIDDEN);
        }

        String oldRoleName = user.getRole().getName();
        if (oldRoleName.equals(requestedRole)) {
            throw new BusinessException("L'utilisateur a deja ce role", "SAME_ROLE");
        }

        Role newRole = roleRepository.findByName(requestedRole)
                .orElseThrow(() -> new BusinessException("Role not found: " + requestedRole, "ROLE_NOT_FOUND"));

        user.setRole(newRole);
        userRepository.save(user);

        auditService.log(admin, "CHANGE_ROLE", "User", id,
                "Changed role of " + user.getUsername() + " from " + oldRoleName + " to " + requestedRole);

        return mapUserToResponse(user);
    }

    @Transactional
    public void activateUser(Long id, User admin) {
        if (id.equals(admin.getId())) {
            throw new BusinessException("Vous ne pouvez pas modifier votre propre compte", "SELF_ACTION_FORBIDDEN", HttpStatus.FORBIDDEN);
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new BusinessException("User not found", "USER_NOT_FOUND", HttpStatus.NOT_FOUND));
        user.setStatus(User.UserStatus.ACTIVE);
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        int accountsReactivated = 0, cardsReactivated = 0;
        if ("CLIENT".equals(user.getRole().getName())) {
            java.util.List<BankAccount> accounts = bankAccountRepository.findByClientId(id);
            for (BankAccount acc : accounts) {
                if (acc.getStatus() == BankAccount.AccountStatus.DISABLED) {
                    acc.setStatus(BankAccount.AccountStatus.ACTIVE);
                    bankAccountRepository.save(acc);
                    accountsReactivated++;
                }
            }
            java.util.List<AccountCard> cards = accountCardRepository.findByClientId(id);
            for (AccountCard card : cards) {
                if (card.getStatus() == AccountCard.CardStatus.DISABLED) {
                    card.setStatus(AccountCard.CardStatus.ACTIVE);
                    accountCardRepository.save(card);
                    cardsReactivated++;
                }
            }
        }

        auditService.log(admin, "ACTIVATE_USER", "User", id,
                "Activated user: " + user.getUsername() +
                        " (cascade: " + accountsReactivated + " accounts, " + cardsReactivated + " cards)");

        if ("CLIENT".equals(user.getRole().getName())) {
            StringBuilder msg = new StringBuilder();
            msg.append("Votre compte client a ete reactive. Vous pouvez de nouveau acceder a vos services bancaires en ligne.");
            if (accountsReactivated > 0 || cardsReactivated > 0) {
                msg.append(" Cascade : ");
                if (accountsReactivated > 0) msg.append(accountsReactivated).append(" compte(s) bancaire(s)");
                if (accountsReactivated > 0 && cardsReactivated > 0) msg.append(" et ");
                if (cardsReactivated > 0) msg.append(cardsReactivated).append(" carte(s) bancaire(s)");
                msg.append(" reactive(s).");
            }
            notificationService.sendSuccess(user, "Compte client reactive", msg.toString());
        }
    }

    @Transactional
    public void deactivateUser(Long id, User admin) {
        if (id.equals(admin.getId())) {
            throw new BusinessException("Vous ne pouvez pas desactiver votre propre compte", "SELF_ACTION_FORBIDDEN", HttpStatus.FORBIDDEN);
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new BusinessException("User not found", "USER_NOT_FOUND", HttpStatus.NOT_FOUND));
        user.setStatus(User.UserStatus.DISABLED);
        userRepository.save(user);

        // Cascade to bank accounts + cards so the scheduler / any other path cannot
        // drain a disabled user's accounts.
        int accountsDisabled = 0, cardsDisabled = 0;
        if ("CLIENT".equals(user.getRole().getName())) {
            java.util.List<BankAccount> accounts = bankAccountRepository.findByClientId(id);
            for (BankAccount acc : accounts) {
                if (acc.getStatus() == BankAccount.AccountStatus.ACTIVE) {
                    acc.setStatus(BankAccount.AccountStatus.DISABLED);
                    bankAccountRepository.save(acc);
                    accountsDisabled++;
                }
            }
            java.util.List<AccountCard> cards = accountCardRepository.findByClientId(id);
            for (AccountCard card : cards) {
                if (card.getStatus() == AccountCard.CardStatus.ACTIVE) {
                    card.setStatus(AccountCard.CardStatus.DISABLED);
                    accountCardRepository.save(card);
                    cardsDisabled++;
                }
            }
        }

        auditService.log(admin, "DEACTIVATE_USER", "User", id,
                "Deactivated user: " + user.getUsername() +
                        " (cascade: " + accountsDisabled + " accounts, " + cardsDisabled + " cards)");

        if ("CLIENT".equals(user.getRole().getName())) {
            StringBuilder msg = new StringBuilder();
            msg.append("Votre compte client a ete desactive par l'administration. ");
            msg.append("Vous ne pouvez plus acceder aux services bancaires en ligne.");
            if (accountsDisabled > 0 || cardsDisabled > 0) {
                msg.append(" Cascade : ");
                if (accountsDisabled > 0) msg.append(accountsDisabled).append(" compte(s) bancaire(s)");
                if (accountsDisabled > 0 && cardsDisabled > 0) msg.append(" et ");
                if (cardsDisabled > 0) msg.append(cardsDisabled).append(" carte(s) bancaire(s)");
                msg.append(" ont ete desactive(s).");
            }
            msg.append(" Pour toute reclamation, veuillez vous presenter au siege d'Amen Bank, Avenue Mohamed V, Tunis, ");
            msg.append("ou contacter le service client au +216 71 148 000.");
            notificationService.sendError(user, "Compte client desactive", msg.toString());
        }
    }

    // ===== BANK ACCOUNT MANAGEMENT =====

    public Page<BankAccountResponse> getAllBankAccounts(Pageable pageable) {
        return bankAccountRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(this::mapBankAccountToResponse);
    }

    @Transactional
    public void activateBankAccount(Long accountId, User admin) {
        BankAccount account = bankAccountRepository.findById(accountId)
                .orElseThrow(() -> new BusinessException("Account not found", "ACCOUNT_NOT_FOUND", HttpStatus.NOT_FOUND));

        User client = account.getClient();
        if (client.getStatus() != User.UserStatus.ACTIVE) {
            throw new BusinessException(
                    "Impossible d'activer le compte : le client est desactive. Activez d'abord le client.",
                    "CLIENT_DISABLED");
        }

        account.setStatus(BankAccount.AccountStatus.ACTIVE);
        bankAccountRepository.save(account);

        int cardsReactivated = 0;
        java.util.List<AccountCard> cards = accountCardRepository.findByAccountId(accountId);
        for (AccountCard card : cards) {
            if (card.getStatus() == AccountCard.CardStatus.DISABLED) {
                card.setStatus(AccountCard.CardStatus.ACTIVE);
                accountCardRepository.save(card);
                cardsReactivated++;
            }
        }

        auditService.log(admin, "ACTIVATE_BANK_ACCOUNT", "BankAccount", accountId,
                "Activated account " + account.getAccountNumber() + " (cascade: " + cardsReactivated + " cards)");

        String cardsSuffix = cardsReactivated > 0
                ? " " + cardsReactivated + " carte(s) bancaire(s) associee(s) ont egalement ete reactivees."
                : "";
        notificationService.sendSuccess(client, "Compte bancaire reactive",
                "Votre compte " + account.getAccountNumber() + " a ete reactive par l'administration. " +
                        "Vous pouvez de nouveau effectuer des virements et operations sur ce compte." + cardsSuffix);

        if (cardsReactivated > 0) {
            notificationService.sendSuccess(client, "Cartes bancaires reactivees",
                    cardsReactivated + " carte(s) bancaire(s) liee(s) au compte " + account.getAccountNumber() +
                            " ont ete reactivees. Vous pouvez a nouveau les utiliser pour vos paiements et retraits.");
        }
    }

    @Transactional
    public void deactivateBankAccount(Long accountId, User admin) {
        BankAccount account = bankAccountRepository.findById(accountId)
                .orElseThrow(() -> new BusinessException("Account not found", "ACCOUNT_NOT_FOUND", HttpStatus.NOT_FOUND));
        account.setStatus(BankAccount.AccountStatus.DISABLED);
        bankAccountRepository.save(account);

        int cardsDisabled = 0;
        java.util.List<AccountCard> cards = accountCardRepository.findByAccountId(accountId);
        for (AccountCard card : cards) {
            if (card.getStatus() == AccountCard.CardStatus.ACTIVE) {
                card.setStatus(AccountCard.CardStatus.DISABLED);
                accountCardRepository.save(card);
                cardsDisabled++;
            }
        }

        auditService.log(admin, "DEACTIVATE_BANK_ACCOUNT", "BankAccount", accountId,
                "Deactivated account " + account.getAccountNumber() + " (cascade: " + cardsDisabled + " cards)");

        String cardsSuffix = cardsDisabled > 0
                ? " Par consequent, " + cardsDisabled + " carte(s) bancaire(s) associee(s) a ce compte ont egalement ete desactivees."
                : "";
        notificationService.sendWarning(account.getClient(), "Compte bancaire desactive",
                "Votre compte bancaire " + account.getAccountNumber() + " a ete desactive par l'administration. " +
                        "Les virements et operations sur ce compte ne sont plus autorises." + cardsSuffix + " " +
                        "Pour plus d'informations, veuillez vous presenter au siege d'Amen Bank, Avenue Mohamed V, Tunis, " +
                        "ou contacter le service client au +216 71 148 000.");

        if (cardsDisabled > 0) {
            notificationService.sendWarning(account.getClient(), "Cartes bancaires desactivees",
                    cardsDisabled + " carte(s) bancaire(s) liee(s) au compte " + account.getAccountNumber() +
                            " ont ete desactivees suite a la desactivation du compte. " +
                            "Vos cartes ne peuvent plus etre utilisees pour des paiements ou retraits.");
        }
    }

    /**
     * Cascade freeze triggered by a confirmed fraud alert:
     * disables the user, all bank accounts, all cards, and cancels any pending
     * transactions initiated from the client's accounts.
     */
    @Transactional
    public FreezeClientResult freezeClientOnFraud(Long clientId, User admin, String reason) {
        if (admin != null && clientId.equals(admin.getId())) {
            throw new BusinessException("Vous ne pouvez pas geler votre propre compte", "SELF_ACTION_FORBIDDEN", HttpStatus.FORBIDDEN);
        }
        User client = userRepository.findById(clientId)
                .orElseThrow(() -> new BusinessException("Client not found", "USER_NOT_FOUND", HttpStatus.NOT_FOUND));

        int accountsDisabled = 0;
        int cardsDisabled = 0;
        int transactionsCancelled = 0;

        // 1) Disable user
        if (client.getStatus() != User.UserStatus.DISABLED) {
            client.setStatus(User.UserStatus.DISABLED);
            userRepository.save(client);
        }

        // 2) Disable bank accounts
        java.util.List<BankAccount> accounts = bankAccountRepository.findByClientId(clientId);
        java.util.List<Long> accountIds = new java.util.ArrayList<>();
        for (BankAccount acc : accounts) {
            accountIds.add(acc.getId());
            if (acc.getStatus() == BankAccount.AccountStatus.ACTIVE) {
                acc.setStatus(BankAccount.AccountStatus.DISABLED);
                bankAccountRepository.save(acc);
                accountsDisabled++;
            }
        }

        // 3) Disable cards
        java.util.List<AccountCard> cards = accountCardRepository.findByClientId(clientId);
        for (AccountCard card : cards) {
            if (card.getStatus() == AccountCard.CardStatus.ACTIVE) {
                card.setStatus(AccountCard.CardStatus.DISABLED);
                accountCardRepository.save(card);
                cardsDisabled++;
            }
        }

        // 4) Cancel pending / approved-but-not-yet-executed transactions on client's accounts
        if (!accountIds.isEmpty()) {
            java.util.List<Transaction.TransactionStatus> openStatuses = java.util.List.of(
                    Transaction.TransactionStatus.PENDING,
                    Transaction.TransactionStatus.APPROVED
            );
            java.util.List<Transaction> open = transactionRepository
                    .findByStatusInAndSourceAccountIds(openStatuses, accountIds);
            for (Transaction tx : open) {
                tx.setStatus(Transaction.TransactionStatus.CANCELLED);
                transactionRepository.save(tx);
                transactionsCancelled++;
            }
        }

        // 5) Notify + audit
        String msg = "Votre compte bancaire a ete desactive suite a une alerte de fraude confirmee. " +
                "Tous vos comptes et cartes associees sont bloques. " +
                (reason != null && !reason.isBlank() ? "Motif: " + reason + ". " : "") +
                "Pour plus d'informations, veuillez vous presenter au siege d'Amen Bank, Avenue Mohamed V, Tunis, " +
                "ou contacter le service client au +216 71 148 000.";
        notificationService.sendError(client, "Compte bancaire desactive - alerte de fraude", msg);
        auditService.log(admin, "FREEZE_CLIENT_ON_FRAUD", "User", clientId,
                "Freeze cascade: " + accountsDisabled + " accounts, " + cardsDisabled +
                        " cards, " + transactionsCancelled + " transactions cancelled. Reason: " + reason);

        return new FreezeClientResult(accountsDisabled, cardsDisabled, transactionsCancelled);
    }

    public record FreezeClientResult(int accountsDisabled, int cardsDisabled, int transactionsCancelled) {}

    // ===== SECURITY INCIDENTS =====

    private static final java.util.List<String> SECURITY_ACTIONS = java.util.List.of(
            "LOGIN_FAILED",
            "LOGIN_BLOCKED_LOCKED",
            "LOGIN_BLOCKED_DISABLED",
            "ACCOUNT_LOCKED",
            "UNAUTHORIZED_ACCESS",
            "BLOCK_SUSPICIOUS_USER"
    );

    public Page<SecurityIncidentResponse> getSecurityIncidents(Pageable pageable) {
        return auditLogRepository.findByActionIn(SECURITY_ACTIONS, pageable).map(this::mapIncident);
    }

    /**
     * Aggregate the last N hours of failed-login / unauthorized-access audit rows
     * per user and return those that crossed the suspicion threshold.
     */
    public java.util.List<SuspiciousUserResponse> getSuspiciousUsers(int hours, int threshold) {
        LocalDateTime since = LocalDateTime.now().minusHours(hours);
        java.util.List<AuditLog> incidents = auditLogRepository.findByActionInSince(SECURITY_ACTIONS, since);

        java.util.Map<Long, SuspiciousUserResponse> agg = new java.util.LinkedHashMap<>();
        long anonymousUnauthorized = 0;
        String anonymousLastIp = null;
        LocalDateTime anonymousLastAt = null;

        for (AuditLog log : incidents) {
            User u = log.getUser();
            if (u == null) {
                anonymousUnauthorized++;
                if (anonymousLastAt == null || log.getCreatedAt().isAfter(anonymousLastAt)) {
                    anonymousLastAt = log.getCreatedAt();
                    anonymousLastIp = log.getIpAddress();
                }
                continue;
            }
            SuspiciousUserResponse r = agg.computeIfAbsent(u.getId(), k -> SuspiciousUserResponse.builder()
                    .userId(u.getId())
                    .email(u.getEmail())
                    .username(u.getUsername())
                    .status(u.getStatus().name())
                    .failedLoginCount(0L)
                    .unauthorizedCount(0L)
                    .build());
            if ("LOGIN_FAILED".equals(log.getAction())) {
                r.setFailedLoginCount(r.getFailedLoginCount() + 1);
            } else if ("UNAUTHORIZED_ACCESS".equals(log.getAction())) {
                r.setUnauthorizedCount(r.getUnauthorizedCount() + 1);
            } else {
                r.setFailedLoginCount(r.getFailedLoginCount() + 1);
            }
            if (r.getLastIncidentAt() == null || log.getCreatedAt().isAfter(r.getLastIncidentAt())) {
                r.setLastIncidentAt(log.getCreatedAt());
                if (log.getIpAddress() != null) r.setLastIp(log.getIpAddress());
            }
        }

        java.util.List<SuspiciousUserResponse> list = agg.values().stream()
                .filter(r -> (r.getFailedLoginCount() + r.getUnauthorizedCount()) >= threshold)
                .sorted((a, b) -> Long.compare(
                        b.getFailedLoginCount() + b.getUnauthorizedCount(),
                        a.getFailedLoginCount() + a.getUnauthorizedCount()))
                .collect(java.util.stream.Collectors.toList());

        if (anonymousUnauthorized >= threshold) {
            list.add(0, SuspiciousUserResponse.builder()
                    .userId(null)
                    .email("(anonyme)")
                    .username("(token invalide)")
                    .status("ANONYMOUS")
                    .failedLoginCount(0L)
                    .unauthorizedCount(anonymousUnauthorized)
                    .lastIncidentAt(anonymousLastAt)
                    .lastIp(anonymousLastIp)
                    .build());
        }
        return list;
    }

    @Transactional
    public void blockSuspiciousUser(Long userId, User admin, String reason) {
        if (userId.equals(admin.getId())) {
            throw new BusinessException("Vous ne pouvez pas bloquer votre propre compte", "SELF_ACTION_FORBIDDEN", HttpStatus.FORBIDDEN);
        }
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found", "USER_NOT_FOUND", HttpStatus.NOT_FOUND));

        if (user.getStatus() == User.UserStatus.DISABLED) {
            throw new BusinessException("Utilisateur deja desactive", "ALREADY_DISABLED", HttpStatus.CONFLICT);
        }

        user.setStatus(User.UserStatus.DISABLED);
        userRepository.save(user);

        int accountsDisabled = 0, cardsDisabled = 0;
        if ("CLIENT".equals(user.getRole().getName())) {
            for (BankAccount acc : bankAccountRepository.findByClientId(userId)) {
                if (acc.getStatus() == BankAccount.AccountStatus.ACTIVE) {
                    acc.setStatus(BankAccount.AccountStatus.DISABLED);
                    bankAccountRepository.save(acc);
                    accountsDisabled++;
                }
            }
            for (AccountCard card : accountCardRepository.findByClientId(userId)) {
                if (card.getStatus() == AccountCard.CardStatus.ACTIVE) {
                    card.setStatus(AccountCard.CardStatus.DISABLED);
                    accountCardRepository.save(card);
                    cardsDisabled++;
                }
            }
        }

        String safeReason = (reason == null || reason.isBlank()) ? "Acces non autorise detecte" : reason;
        auditService.log(admin, "BLOCK_SUSPICIOUS_USER", "User", userId,
                "Blocked " + user.getEmail() + " | reason: " + safeReason +
                        " | cascade: " + accountsDisabled + " accounts, " + cardsDisabled + " cards");

        notificationService.sendError(user,
                "Compte suspendu",
                "Votre compte a ete suspendu suite a des tentatives d'acces non autorisees. " +
                        "Motif : " + safeReason + ". Contactez le service client au +216 71 148 000 pour le reactiver.");
    }

    // ===== IP BLOCKING =====

    public java.util.List<BlockedIpResponse> getBlockedIps() {
        return blockedIpRepository.findByActiveTrueOrderByBlockedAtDesc().stream()
                .map(this::mapBlockedIp)
                .collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public BlockedIpResponse blockIp(String ipAddress, String reason, User admin) {
        if (ipAddress == null || ipAddress.isBlank()) {
            throw new BusinessException("Adresse IP requise", "IP_REQUIRED");
        }
        String normalized = ipAddress.trim();
        if (blockedIpRepository.existsByIpAddressAndActiveTrue(normalized)) {
            throw new BusinessException("Cette adresse IP est deja bloquee", "IP_ALREADY_BLOCKED", HttpStatus.CONFLICT);
        }
        String safeReason = (reason == null || reason.isBlank()) ? "Tentatives d'acces non autorisees" : reason.trim();

        BlockedIp entity = BlockedIp.builder()
                .ipAddress(normalized)
                .reason(safeReason)
                .blockedBy(admin)
                .active(true)
                .build();
        blockedIpRepository.save(entity);

        auditService.log(admin, "BLOCK_IP", "BlockedIp", entity.getId(),
                "Blocked IP " + normalized + " | reason: " + safeReason);
        return mapBlockedIp(entity);
    }

    @Transactional
    public void unblockIp(Long id, User admin) {
        BlockedIp entity = blockedIpRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Blocage IP introuvable", "BLOCKED_IP_NOT_FOUND", HttpStatus.NOT_FOUND));
        if (Boolean.FALSE.equals(entity.getActive())) {
            throw new BusinessException("Cette adresse IP est deja debloquee", "IP_ALREADY_UNBLOCKED", HttpStatus.CONFLICT);
        }
        entity.setActive(false);
        blockedIpRepository.save(entity);
        auditService.log(admin, "UNBLOCK_IP", "BlockedIp", id,
                "Unblocked IP " + entity.getIpAddress());
    }

    private BlockedIpResponse mapBlockedIp(BlockedIp b) {
        String by = null;
        if (b.getBlockedBy() != null) {
            String first = b.getBlockedBy().getFirstName() != null ? b.getBlockedBy().getFirstName() : "";
            String last = b.getBlockedBy().getLastName() != null ? b.getBlockedBy().getLastName() : "";
            String full = (first + " " + last).trim();
            by = full.isEmpty() ? b.getBlockedBy().getUsername() : full;
        }
        return BlockedIpResponse.builder()
                .id(b.getId())
                .ipAddress(b.getIpAddress())
                .reason(b.getReason())
                .blockedByName(by)
                .blockedAt(b.getBlockedAt())
                .active(b.getActive())
                .build();
    }

    private SecurityIncidentResponse mapIncident(AuditLog a) {
        User u = a.getUser();
        return SecurityIncidentResponse.builder()
                .id(a.getId())
                .action(a.getAction())
                .details(a.getDetails())
                .ipAddress(a.getIpAddress())
                .userAgent(a.getUserAgent())
                .userId(u != null ? u.getId() : null)
                .userEmail(u != null ? u.getEmail() : null)
                .username(u != null ? u.getUsername() : null)
                .userStatus(u != null ? u.getStatus().name() : null)
                .createdAt(a.getCreatedAt())
                .build();
    }

    private BankAccountResponse mapBankAccountToResponse(BankAccount a) {
        User c = a.getClient();
        return BankAccountResponse.builder()
                .id(a.getId())
                .accountNumber(a.getAccountNumber())
                .iban(a.getIban())
                .balance(a.getBalance())
                .currency(a.getCurrency())
                .status(a.getStatus().name())
                .createdAt(a.getCreatedAt())
                .clientId(c != null ? c.getId() : null)
                .clientName(c != null ? (c.getFirstName() + " " + c.getLastName()) : null)
                .clientEmail(c != null ? c.getEmail() : null)
                .build();
    }

    @Transactional
    public void deleteUser(Long id, User admin) {
        if (id.equals(admin.getId())) {
            throw new BusinessException("Vous ne pouvez pas supprimer votre propre compte", "SELF_ACTION_FORBIDDEN", HttpStatus.FORBIDDEN);
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new BusinessException("User not found", "USER_NOT_FOUND", HttpStatus.NOT_FOUND));

        if ("ADMIN".equals(user.getRole().getName()) && !isRootAdmin(admin)) {
            throw new BusinessException(
                    "Seul l'administrateur racine peut supprimer un compte administrateur",
                    "DELETE_ADMIN_FORBIDDEN",
                    HttpStatus.FORBIDDEN);
        }

        String deletedUsername = user.getUsername();
        String deletedEmail = user.getEmail();
        String deletedRole = user.getRole().getName();

        java.util.Set<String> tables = loadExistingTableNames();
        java.util.List<Long> clientAccountIds = loadClientAccountIds(id, tables);

        // Delete registration requests matching this user's email (so email can be reused)
        executeNativeIfTablesExist(
                tables,
                "DELETE FROM registration_requests WHERE email = :email",
                params("email", deletedEmail),
                "registration_requests");

        // Delete all related data (order matters for FK constraints)
        executeNativeIfTablesExist(tables, "DELETE FROM two_factor_codes WHERE user_id = :uid", params("uid", id), "two_factor_codes");
        executeNativeIfTablesExist(tables, "DELETE FROM refresh_tokens WHERE user_id = :uid", params("uid", id), "refresh_tokens");
        executeNativeIfTablesExist(tables, "DELETE FROM activation_tokens WHERE user_id = :uid", params("uid", id), "activation_tokens");
        executeNativeIfTablesExist(tables, "DELETE FROM reset_tokens WHERE user_id = :uid", params("uid", id), "reset_tokens");
        executeNativeIfTablesExist(tables, "DELETE FROM notifications WHERE user_id = :uid", params("uid", id), "notifications");
        executeNativeIfTablesExist(tables, "DELETE FROM credit_simulations WHERE client_id = :uid", params("uid", id), "credit_simulations");
        executeNativeIfTablesExist(tables, "DELETE FROM daily_reports WHERE employee_id = :uid", params("uid", id), "daily_reports");
        executeNativeIfTablesExist(tables, "UPDATE daily_reports SET reviewed_by = NULL WHERE reviewed_by = :uid", params("uid", id), "daily_reports");
        executeNativeIfTablesExist(tables, "DELETE FROM password_reset_requests WHERE user_id = :uid", params("uid", id), "password_reset_requests");
        executeNativeIfTablesExist(tables, "UPDATE password_reset_requests SET reviewed_by = NULL WHERE reviewed_by = :uid", params("uid", id), "password_reset_requests");
        executeNativeIfTablesExist(tables, "DELETE FROM chat_conversations WHERE client_id = :uid", params("uid", id), "chat_conversations");

        // Nullify fraud alert reviewer references
        executeNativeIfTablesExist(tables, "UPDATE fraud_alerts SET reviewed_by = NULL WHERE reviewed_by = :uid", params("uid", id), "fraud_alerts");
        executeNativeIfTablesExist(tables, "UPDATE blocked_ips SET blocked_by = NULL WHERE blocked_by = :uid", params("uid", id), "blocked_ips");

        // Nullify references in audit_logs, transactions, credit_requests where user is reviewer
        executeNativeIfTablesExist(tables, "UPDATE audit_logs SET user_id = NULL WHERE user_id = :uid", params("uid", id), "audit_logs");
        executeNativeIfTablesExist(tables, "UPDATE transactions SET approved_by = NULL WHERE approved_by = :uid", params("uid", id), "transactions");
        executeNativeIfTablesExist(tables, "UPDATE credit_requests SET reviewed_by = NULL WHERE reviewed_by = :uid", params("uid", id), "credit_requests");
        executeNativeIfTablesExist(tables, "UPDATE registration_requests SET reviewed_by = NULL WHERE reviewed_by = :uid", params("uid", id), "registration_requests");

        // Delete transaction history for user's transactions
        executeNativeIfTablesExist(
                tables,
                "DELETE th FROM transaction_history th INNER JOIN transactions t ON th.transaction_id = t.id WHERE t.initiated_by = :uid",
                params("uid", id),
                "transaction_history", "transactions");
        executeNativeIfTablesExist(tables, "DELETE FROM transaction_history WHERE changed_by = :uid", params("uid", id), "transaction_history");

        // Delete transfers, transactions initiated by user
        executeNativeIfTablesExist(
                tables,
                "DELETE FROM transfer_beneficiaries WHERE transfer_request_id IN (SELECT id FROM transfer_requests WHERE client_id = :uid)",
                params("uid", id),
                "transfer_beneficiaries", "transfer_requests");
        executeNativeIfTablesExist(
                tables,
                "DELETE FROM scheduled_transfers WHERE transfer_request_id IN (SELECT id FROM transfer_requests WHERE client_id = :uid)",
                params("uid", id),
                "scheduled_transfers", "transfer_requests");
        executeNativeIfTablesExist(tables, "DELETE FROM transfer_requests WHERE client_id = :uid", params("uid", id), "transfer_requests");
        executeNativeIfTablesExist(tables, "DELETE FROM transactions WHERE initiated_by = :uid", params("uid", id), "transactions");
        executeNativeIfTablesExist(tables, "DELETE FROM credit_requests WHERE client_id = :uid", params("uid", id), "credit_requests");

        // If the schema contains extra relations to bank_accounts (or rows where
        // this user's accounts are referenced by other users' transactions),
        // clean them generically before removing cards/accounts.
        cleanupResidualAccountReferences(clientAccountIds, tables);

        // Delete bank accounts and cards
        executeNativeIfTablesExist(tables, "DELETE FROM account_cards WHERE client_id = :uid", params("uid", id), "account_cards");
        executeNativeIfTablesExist(tables, "DELETE FROM bank_accounts WHERE client_id = :uid", params("uid", id), "bank_accounts");

        // Finally delete the user
        try {
            userRepository.deleteById(id);
            entityManager.flush();
        } catch (RuntimeException ex) {
            if (!isForeignKeyConstraintError(ex)) {
                throw ex;
            }
            cleanupResidualUserReferences(id, tables);
            userRepository.deleteById(id);
            entityManager.flush();
        }

        auditService.log(admin, "DELETE_USER", "User", id,
                "Hard-deleted " + deletedRole + " user: " + deletedUsername);
    }

    @SuppressWarnings("unchecked")
    private java.util.Set<String> loadExistingTableNames() {
        java.util.List<Object> rows = entityManager.createNativeQuery(
                "SELECT LOWER(table_name) FROM information_schema.tables WHERE table_schema = DATABASE()")
                .getResultList();
        java.util.Set<String> tables = new java.util.HashSet<>();
        for (Object row : rows) {
            if (row != null) tables.add(row.toString().toLowerCase(java.util.Locale.ROOT));
        }
        return tables;
    }

    private java.util.Map<String, Object> params(Object... keyValues) {
        java.util.Map<String, Object> map = new java.util.HashMap<>();
        for (int i = 0; i + 1 < keyValues.length; i += 2) {
            map.put(String.valueOf(keyValues[i]), keyValues[i + 1]);
        }
        return map;
    }

    private void executeNativeIfTablesExist(
            java.util.Set<String> existingTables,
            String sql,
            java.util.Map<String, Object> parameters,
            String... requiredTables
    ) {
        for (String table : requiredTables) {
            if (table == null) continue;
            if (!existingTables.contains(table.toLowerCase(java.util.Locale.ROOT))) return;
        }
        jakarta.persistence.Query query = entityManager.createNativeQuery(sql);
        if (parameters != null) {
            parameters.forEach(query::setParameter);
        }
        try {
            query.executeUpdate();
        } catch (RuntimeException ex) {
            if (isMissingSchemaObject(ex)) {
                return;
            }
            throw ex;
        }
    }

    private boolean isMissingSchemaObject(Throwable error) {
        Throwable current = error;
        while (current != null) {
            if (current instanceof java.sql.SQLException sql) {
                int code = sql.getErrorCode();
                String state = sql.getSQLState();
                if (code == 1146 || code == 1054 || "42S02".equals(state) || "42S22".equals(state)) {
                    return true;
                }
            }
            current = current.getCause();
        }
        return false;
    }

    @SuppressWarnings("unchecked")
    private java.util.List<Long> loadClientAccountIds(Long userId, java.util.Set<String> existingTables) {
        if (userId == null) return java.util.Collections.emptyList();
        if (!existingTables.contains("bank_accounts")) return java.util.Collections.emptyList();
        java.util.List<Object> rows = entityManager
                .createNativeQuery("SELECT id FROM bank_accounts WHERE client_id = :uid")
                .setParameter("uid", userId)
                .getResultList();
        java.util.List<Long> ids = new java.util.ArrayList<>();
        for (Object row : rows) {
            if (row instanceof Number n) ids.add(n.longValue());
            else if (row != null) ids.add(Long.parseLong(row.toString()));
        }
        return ids;
    }

    private void cleanupResidualAccountReferences(java.util.List<Long> accountIds, java.util.Set<String> existingTables) {
        if (accountIds == null || accountIds.isEmpty()) return;
        cleanupResidualReferencesByParentIds("bank_accounts", "id", accountIds, existingTables);
    }

    @SuppressWarnings("unchecked")
    private void cleanupResidualReferencesByParentIds(
            String parentTable,
            String parentColumn,
            java.util.List<Long> parentIds,
            java.util.Set<String> existingTables
    ) {
        if (parentTable == null || parentColumn == null || parentIds == null || parentIds.isEmpty()) return;

        java.util.List<Long> distinctIds = parentIds.stream()
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        if (distinctIds.isEmpty()) return;

        String idCsv = distinctIds.stream().map(String::valueOf).collect(java.util.stream.Collectors.joining(","));
        if (idCsv.isBlank()) return;

        java.util.List<Object[]> refs = entityManager.createNativeQuery(
                        "SELECT kcu.TABLE_NAME, kcu.COLUMN_NAME, cols.IS_NULLABLE " +
                                "FROM information_schema.KEY_COLUMN_USAGE kcu " +
                                "JOIN information_schema.COLUMNS cols " +
                                "  ON cols.TABLE_SCHEMA = kcu.TABLE_SCHEMA " +
                                " AND cols.TABLE_NAME = kcu.TABLE_NAME " +
                                " AND cols.COLUMN_NAME = kcu.COLUMN_NAME " +
                                "WHERE kcu.TABLE_SCHEMA = DATABASE() " +
                                "  AND kcu.REFERENCED_TABLE_NAME = :parentTable " +
                                "  AND kcu.REFERENCED_COLUMN_NAME = :parentColumn " +
                                "  AND kcu.TABLE_NAME <> :parentTable")
                .setParameter("parentTable", parentTable)
                .setParameter("parentColumn", parentColumn)
                .getResultList();

        for (Object[] ref : refs) {
            if (ref == null || ref.length < 3) continue;
            String table = ref[0] != null ? ref[0].toString() : null;
            String column = ref[1] != null ? ref[1].toString() : null;
            String nullable = ref[2] != null ? ref[2].toString() : "NO";
            if (table == null || column == null) continue;
            if (!existingTables.contains(table.toLowerCase(java.util.Locale.ROOT))) continue;

            String safeTable = "`" + table.replace("`", "``") + "`";
            String safeColumn = "`" + column.replace("`", "``") + "`";
            String sql = "YES".equalsIgnoreCase(nullable)
                    ? ("UPDATE " + safeTable + " SET " + safeColumn + " = NULL WHERE " + safeColumn + " IN (" + idCsv + ")")
                    : ("DELETE FROM " + safeTable + " WHERE " + safeColumn + " IN (" + idCsv + ")");

            try {
                entityManager.createNativeQuery(sql).executeUpdate();
            } catch (RuntimeException ex) {
                if (isMissingSchemaObject(ex) || isForeignKeyConstraintError(ex)) {
                    continue;
                }
                throw ex;
            }
        }
    }

    @SuppressWarnings("unchecked")
    private void cleanupResidualUserReferences(Long userId, java.util.Set<String> existingTables) {
        java.util.List<Object[]> refs = entityManager.createNativeQuery(
                        "SELECT kcu.TABLE_NAME, kcu.COLUMN_NAME, cols.IS_NULLABLE " +
                                "FROM information_schema.KEY_COLUMN_USAGE kcu " +
                                "JOIN information_schema.COLUMNS cols " +
                                "  ON cols.TABLE_SCHEMA = kcu.TABLE_SCHEMA " +
                                " AND cols.TABLE_NAME = kcu.TABLE_NAME " +
                                " AND cols.COLUMN_NAME = kcu.COLUMN_NAME " +
                                "WHERE kcu.TABLE_SCHEMA = DATABASE() " +
                                "  AND kcu.REFERENCED_TABLE_NAME = 'users' " +
                                "  AND kcu.REFERENCED_COLUMN_NAME = 'id' " +
                                "  AND kcu.TABLE_NAME <> 'users'")
                .getResultList();

        for (Object[] ref : refs) {
            if (ref == null || ref.length < 3) continue;
            String table = ref[0] != null ? ref[0].toString() : null;
            String column = ref[1] != null ? ref[1].toString() : null;
            String nullable = ref[2] != null ? ref[2].toString() : "NO";
            if (table == null || column == null) continue;
            if (!existingTables.contains(table.toLowerCase(java.util.Locale.ROOT))) continue;

            String safeTable = "`" + table.replace("`", "``") + "`";
            String safeColumn = "`" + column.replace("`", "``") + "`";
            String sql = "YES".equalsIgnoreCase(nullable)
                    ? ("UPDATE " + safeTable + " SET " + safeColumn + " = NULL WHERE " + safeColumn + " = :uid")
                    : ("DELETE FROM " + safeTable + " WHERE " + safeColumn + " = :uid");

            try {
                entityManager.createNativeQuery(sql).setParameter("uid", userId).executeUpdate();
            } catch (RuntimeException ex) {
                if (isMissingSchemaObject(ex) || isForeignKeyConstraintError(ex)) {
                    continue;
                }
                throw ex;
            }
        }
    }

    private boolean isForeignKeyConstraintError(Throwable error) {
        Throwable current = error;
        while (current != null) {
            if (current instanceof java.sql.SQLException sql) {
                int code = sql.getErrorCode();
                String state = sql.getSQLState();
                if (code == 1451 || code == 1452 || "23000".equals(state)) {
                    return true;
                }
            }
            current = current.getCause();
        }
        return false;
    }

    @Transactional(readOnly = true)
    public Page<AuditLogResponse> getAuditLogs(Pageable pageable) {
        return auditLogRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(this::mapAuditToResponse);
    }

    private static final java.util.Map<String, String> ACTION_LABELS_FR = java.util.Map.ofEntries(
            java.util.Map.entry("LOGIN_SUCCESS", "Connexion reussie"),
            java.util.Map.entry("LOGIN_FAILED", "Echec de connexion"),
            java.util.Map.entry("LOGOUT", "Deconnexion"),
            java.util.Map.entry("REFRESH_TOKEN", "Rafraichissement du jeton"),
            java.util.Map.entry("REGISTER_REQUEST", "Demande d'inscription"),
            java.util.Map.entry("SUBMIT_REGISTRATION_REQUEST", "Demande d'inscription"),
            java.util.Map.entry("APPROVE_REGISTRATION", "Approbation d'inscription"),
            java.util.Map.entry("REJECT_REGISTRATION", "Refus d'inscription"),
            java.util.Map.entry("ACTIVATE_ACCOUNT", "Activation du compte utilisateur"),
            java.util.Map.entry("PASSWORD_RESET_REQUESTED", "Demande de reinitialisation de mot de passe"),
            java.util.Map.entry("APPROVE_PASSWORD_RESET", "Approbation de reinitialisation"),
            java.util.Map.entry("REJECT_PASSWORD_RESET", "Refus de reinitialisation"),
            java.util.Map.entry("PASSWORD_RESET_COMPLETED", "Mot de passe reinitialise"),
            java.util.Map.entry("CREATE_USER", "Creation d'utilisateur"),
            java.util.Map.entry("UPDATE_USER", "Modification d'utilisateur"),
            java.util.Map.entry("DELETE_USER", "Suppression d'utilisateur"),
            java.util.Map.entry("CHANGE_ROLE", "Changement de role"),
            java.util.Map.entry("ACTIVATE_USER", "Activation d'utilisateur"),
            java.util.Map.entry("DEACTIVATE_USER", "Desactivation d'utilisateur"),
            java.util.Map.entry("CREATE_CARD", "Demande de creation de carte"),
            java.util.Map.entry("ACTIVATE_CARD", "Activation de carte"),
            java.util.Map.entry("DEACTIVATE_CARD", "Desactivation de carte"),
            java.util.Map.entry("DELETE_CARD", "Suppression de carte"),
            java.util.Map.entry("CARD_ACCOUNT_TRANSFER", "Recharge de carte"),
            java.util.Map.entry("INITIATE_SIMPLE_TRANSFER", "Virement simple initie"),
            java.util.Map.entry("INITIATE_GROUPED_TRANSFER", "Virement groupe initie"),
            java.util.Map.entry("INITIATE_PERMANENT_TRANSFER", "Virement permanent initie"),
            java.util.Map.entry("APPROVE_TRANSFER", "Approbation de virement"),
            java.util.Map.entry("REJECT_TRANSFER", "Refus de virement"),
            java.util.Map.entry("TRANSFER_CREATED", "Creation d'un virement"),
            java.util.Map.entry("TRANSFER_APPROVED", "Approbation de virement"),
            java.util.Map.entry("TRANSFER_REJECTED", "Refus de virement"),
            java.util.Map.entry("TRANSFER_EXECUTED", "Virement execute"),
            java.util.Map.entry("CREATE_CREDIT_REQUEST", "Demande de credit"),
            java.util.Map.entry("APPROVE_CREDIT", "Approbation de credit"),
            java.util.Map.entry("REJECT_CREDIT", "Refus de credit"),
            java.util.Map.entry("CREDIT_DISBURSEMENT", "Versement de credit"),
            java.util.Map.entry("INCREASE_BALANCE", "Depot a crediter"),
            java.util.Map.entry("CREDIT_REQUEST_CREATED", "Demande de credit"),
            java.util.Map.entry("CREDIT_APPROVED", "Approbation de credit"),
            java.util.Map.entry("CREDIT_REJECTED", "Refus de credit"),
            java.util.Map.entry("CREDIT_DISBURSED", "Deblocage de credit"),
            java.util.Map.entry("ACTIVATE_BANK_ACCOUNT", "Activation de compte bancaire"),
            java.util.Map.entry("DEACTIVATE_BANK_ACCOUNT", "Desactivation de compte bancaire"),
            java.util.Map.entry("FRAUD_ALERT_RESOLVED", "Alerte fraude resolue"),
            java.util.Map.entry("FRAUD_ALERT_CREATED", "Alerte fraude detectee"),
            java.util.Map.entry("FREEZE_CLIENT", "Gel de client suite a fraude"),
            java.util.Map.entry("DELETE_AUDIT_LOG", "Suppression d'un log d'audit"),
            java.util.Map.entry("DELETE_ALL_AUDIT_LOGS", "Suppression de tous les logs d'audit")
    );

    private String translateAction(String action) {
        if (action == null) return "";
        return ACTION_LABELS_FR.getOrDefault(action, action.replace('_', ' ').toLowerCase());
    }

    @Transactional
    public void deleteAuditLog(Long id, User admin) {
        if (!auditLogRepository.existsById(id)) {
            throw new BusinessException("Audit log not found", "AUDIT_LOG_NOT_FOUND", HttpStatus.NOT_FOUND);
        }
        auditLogRepository.deleteById(id);
    }

    @Transactional
    public void deleteAllAuditLogs(User admin) {
        long count = auditLogRepository.count();
        auditLogRepository.deleteAllInBatch();
        auditService.log(admin, "DELETE_ALL_AUDIT_LOGS", "AuditLog", null,
                "Deleted all audit logs (" + count + " entries)");
    }

    public Page<DailyReportResponse> getDailyReports(Pageable pageable) {
        return dailyReportRepository.findAllByOrderByReportDateDesc(pageable)
                .map(this::mapReportToResponse);
    }

    @Transactional
    public void deleteDailyReport(Long id, User admin) {
        DailyReport report = dailyReportRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Report not found", "REPORT_NOT_FOUND", HttpStatus.NOT_FOUND));
        String summary = "Report '" + report.getTitle() + "' of " + report.getReportDate()
                + " (employee: " + report.getEmployee().getFirstName() + " " + report.getEmployee().getLastName() + ")";
        dailyReportRepository.delete(report);
        auditService.log(admin, "DELETE_DAILY_REPORT", "DailyReport", id, "Deleted daily report - " + summary);
    }

    @Transactional
    public void reviewReport(Long id, String comment, Integer rating, User admin) {
        DailyReport report = dailyReportRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Report not found", "REPORT_NOT_FOUND", HttpStatus.NOT_FOUND));

        if (rating != null && (rating < 1 || rating > 5)) {
            throw new BusinessException("Rating must be between 1 and 5", "INVALID_RATING");
        }

        report.setStatus(DailyReport.ReportStatus.REVIEWED);
        report.setReviewedBy(admin);
        report.setReviewComment(comment);
        report.setRating(rating);
        dailyReportRepository.save(report);

        notificationService.send(report.getEmployee(), "Rapport examine",
                "Votre rapport du " + report.getReportDate() + " a ete examine." +
                        (rating != null ? " Note: " + rating + "/5" : ""),
                com.amenbank.entity.Notification.NotificationType.REPORT);

        auditService.log(admin, "REVIEW_REPORT", "DailyReport", id,
                "Report reviewed" + (rating != null ? " with rating " + rating + "/5" : ""));
        notificationWebSocketHandler.broadcastBadgeRefresh();
    }

    public DashboardStatsResponse getDashboardStats() {
        java.util.List<com.amenbank.entity.Transaction.TransactionType> transferTypes = java.util.List.of(
                com.amenbank.entity.Transaction.TransactionType.TRANSFER_SIMPLE,
                com.amenbank.entity.Transaction.TransactionType.TRANSFER_GROUPED,
                com.amenbank.entity.Transaction.TransactionType.TRANSFER_PERMANENT
        );
        return DashboardStatsResponse.builder()
                .totalUsers(userRepository.count())
                .totalClients(userRepository.countByRoleName("CLIENT"))
                .totalEmployees(userRepository.countByRoleName("EMPLOYEE"))
                .totalAdmins(userRepository.countByRoleName("ADMIN"))
                .activeUsers(userRepository.countByStatus(User.UserStatus.ACTIVE))
                .disabledUsers(userRepository.countByStatus(User.UserStatus.DISABLED))
                .pendingUsers(userRepository.countByStatus(User.UserStatus.PENDING))
                .pendingRegistrations(registrationRequestRepository.findByStatus(
                        RegistrationRequest.RequestStatus.PENDING, Pageable.unpaged()).getTotalElements())
                .pendingTransfers(transactionRepository.countByStatusAndTypeIn(
                        com.amenbank.entity.Transaction.TransactionStatus.PENDING, transferTypes))
                .pendingCredits(creditRequestRepository.findByStatus(
                        CreditRequest.CreditStatus.PENDING, Pageable.unpaged()).getTotalElements())
                .pendingPasswordResets(passwordResetRequestRepository.findByStatus(
                        PasswordResetRequest.ResetStatus.PENDING, Pageable.unpaged()).getTotalElements())
                .openFraudAlerts(fraudAlertRepository.countByStatus(
                        com.amenbank.entity.FraudAlert.AlertStatus.OPEN))
                .totalBalance(bankAccountRepository.sumActiveBalances())
                .build();
    }

    private UserResponse mapUserToResponse(User u) {
        return UserResponse.builder()
                .id(u.getId())
                .firstName(u.getFirstName())
                .lastName(u.getLastName())
                .email(u.getEmail())
                .username(u.getUsername())
                .phone(u.getPhone())
                .role(u.getRole().getName())
                .status(u.getStatus().name())
                .twoFactorEnabled(u.getTwoFactorEnabled())
                .rootAdmin(isRootAdmin(u))
                .createdAt(u.getCreatedAt())
                .lastLoginAt(u.getLastLoginAt())
                .build();
    }

    private AuditLogResponse mapAuditToResponse(AuditLog a) {
        String userName;
        if (a.getUser() != null) {
            String first = a.getUser().getFirstName() != null ? a.getUser().getFirstName() : "";
            String last = a.getUser().getLastName() != null ? a.getUser().getLastName() : "";
            String full = (first + " " + last).trim();
            userName = full.isEmpty() ? a.getUser().getEmail() : full;
        } else {
            userName = "Systeme";
        }
        return AuditLogResponse.builder()
                .id(a.getId())
                .userName(userName)
                .action(translateAction(a.getAction()))
                .entityType(a.getEntityType())
                .entityId(a.getEntityId())
                .details(a.getDetails())
                .ipAddress(a.getIpAddress())
                .createdAt(a.getCreatedAt())
                .build();
    }

    private DailyReportResponse mapReportToResponse(DailyReport r) {
        return DailyReportResponse.builder()
                .id(r.getId())
                .employeeName(r.getEmployee().getFirstName() + " " + r.getEmployee().getLastName())
                .reportDate(r.getReportDate())
                .title(r.getTitle())
                .content(r.getContent())
                .status(r.getStatus().name())
                .reviewedByName(r.getReviewedBy() != null ? r.getReviewedBy().getFirstName() + " " + r.getReviewedBy().getLastName() : null)
                .reviewComment(r.getReviewComment())
                .rating(r.getRating())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
