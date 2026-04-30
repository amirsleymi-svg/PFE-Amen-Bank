package com.amenbank.service;

import com.amenbank.audit.AuditService;
import com.amenbank.dto.request.CardTransferRequest;
import com.amenbank.dto.response.CardResponse;
import com.amenbank.entity.AccountCard;
import com.amenbank.entity.BankAccount;
import com.amenbank.entity.Notification;
import com.amenbank.entity.Transaction;
import com.amenbank.entity.User;
import com.amenbank.exception.BusinessException;
import com.amenbank.notification.NotificationService;
import com.amenbank.repository.AccountCardRepository;
import com.amenbank.repository.BankAccountRepository;
import com.amenbank.repository.TransactionRepository;
import com.amenbank.security.TokenHasher;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CardService {

    private final AccountCardRepository accountCardRepository;
    private final BankAccountRepository bankAccountRepository;
    private final TransactionRepository transactionRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final FraudDetectionService fraudDetectionService;
    private final TokenHasher tokenHasher;

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String CARD_BIN = "453210"; // Visa-style test BIN
    private static final int CARD_VALIDITY_YEARS = 5;

    public List<CardResponse> getClientCards(Long clientId) {
        return accountCardRepository.findByClientId(clientId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public CardResponse requestNewCard(Long accountId, Long clientId, User user) {
        BankAccount account = bankAccountRepository.findByIdAndClientId(accountId, clientId)
                .orElseThrow(() -> new BusinessException("Account not found", "ACCOUNT_NOT_FOUND", HttpStatus.NOT_FOUND));

        if (account.getStatus() != BankAccount.AccountStatus.ACTIVE) {
            throw new BusinessException("Le compte bancaire doit etre actif pour creer une carte",
                    "ACCOUNT_NOT_ACTIVE", HttpStatus.FORBIDDEN);
        }

        if (accountCardRepository.existsByAccountId(accountId)) {
            throw new BusinessException("Ce compte possede deja une carte bancaire",
                    "CARD_ALREADY_EXISTS", HttpStatus.CONFLICT);
        }

        String cardNumber = generateCardNumber();
        String masked = "**** **** **** " + cardNumber.substring(cardNumber.length() - 4);
        String token = tokenHasher.sha256Hex(cardNumber);
        LocalDate expiry = LocalDate.now().plusYears(CARD_VALIDITY_YEARS);

        AccountCard card = AccountCard.builder()
                .cardNumberMasked(masked)
                .cardToken(token)
                .expiryDate(expiry)
                .balance(BigDecimal.ZERO)
                .status(AccountCard.CardStatus.ACTIVE)
                .client(user)
                .account(account)
                .build();
        accountCardRepository.save(card);

        auditService.log(user, "CREATE_CARD", "AccountCard", card.getId(),
                "Card created for account " + account.getAccountNumber() + ": " + masked);

        notificationService.send(user, "Carte bancaire creee avec succes",
                "Votre carte bancaire a ete creee avec succes. Vous pouvez la recuperer a l'agence Amen Bank la plus proche " +
                        "ou au siege d'Amen Bank, Avenue Mohamed V, Tunis.\n\n" +
                        "Details :\n" +
                        "  - Numero : " + masked + "\n" +
                        "  - Expiration : " + String.format("%02d/%02d", expiry.getMonthValue(), expiry.getYear() % 100) + "\n" +
                        "  - Compte associe : " + account.getAccountNumber() + "\n" +
                        "  - Solde initial : 0.000 TND\n\n" +
                        "Pour charger votre carte, effectuez un virement depuis votre compte bancaire.",
                Notification.NotificationType.CARD);

        return mapToResponse(card);
    }

    @Transactional
    public CardResponse transferBetweenCardAndAccount(Long cardId, Long clientId,
                                                      CardTransferRequest request, User user) {
        AccountCard card = accountCardRepository.findByIdAndClientId(cardId, clientId)
                .orElseThrow(() -> new BusinessException("Card not found", "CARD_NOT_FOUND", HttpStatus.NOT_FOUND));

        if (card.getStatus() != AccountCard.CardStatus.ACTIVE) {
            throw new BusinessException("La carte doit etre active", "CARD_NOT_ACTIVE", HttpStatus.FORBIDDEN);
        }

        BankAccount account = card.getAccount();
        if (account.getStatus() != BankAccount.AccountStatus.ACTIVE) {
            throw new BusinessException("Le compte bancaire doit etre actif",
                    "ACCOUNT_NOT_ACTIVE", HttpStatus.FORBIDDEN);
        }

        BigDecimal amount = request.getAmount();
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Montant invalide", "INVALID_AMOUNT");
        }

        if (request.getDirection() != CardTransferRequest.Direction.ACCOUNT_TO_CARD) {
            throw new BusinessException(
                    "Vous pouvez uniquement charger la carte depuis le compte bancaire. Le sens inverse n'est pas autorise.",
                    "CARD_TO_ACCOUNT_FORBIDDEN", HttpStatus.FORBIDDEN);
        }
        if (account.getBalance().compareTo(amount) < 0) {
            throw new BusinessException("Solde du compte insuffisant", "INSUFFICIENT_FUNDS");
        }
        account.setBalance(account.getBalance().subtract(amount));
        card.setBalance(card.getBalance().add(amount));
        String direction = "Compte -> Carte";

        bankAccountRepository.save(account);
        accountCardRepository.save(card);

        Transaction rechargeTx = Transaction.builder()
                .reference(generateCardTxReference())
                .type(Transaction.TransactionType.CARD_RECHARGE)
                .status(Transaction.TransactionStatus.EXECUTED)
                .amount(amount)
                .sourceAccount(account)
                .descriptionText("Recharge carte " + card.getCardNumberMasked())
                .initiatedBy(user)
                .executedAt(LocalDateTime.now())
                .build();
        transactionRepository.save(rechargeTx);

        auditService.log(user, "CARD_ACCOUNT_TRANSFER", "AccountCard", cardId,
                direction + " montant " + amount + " TND (carte " + card.getCardNumberMasked() +
                        ", compte " + account.getAccountNumber() + ", ref " + rechargeTx.getReference() + ")");

        notificationService.send(user, "Virement carte/compte effectue",
                direction + " : " + amount + " TND. Nouveau solde carte: " + card.getBalance() +
                        " TND, compte: " + account.getBalance() + " TND.",
                Notification.NotificationType.CARD);

        fraudDetectionService.analyzeTransaction(rechargeTx);

        return mapToResponse(card);
    }

    private String generateCardTxReference() {
        String ref;
        do {
            ref = "CRG-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        } while (transactionRepository.existsByReference(ref));
        return ref;
    }

    @Transactional
    public void activateCard(Long cardId, Long clientId, User user) {
        AccountCard card = accountCardRepository.findByIdAndClientId(cardId, clientId)
                .orElseThrow(() -> new BusinessException("Card not found", "CARD_NOT_FOUND", HttpStatus.NOT_FOUND));

        if (card.getStatus() == AccountCard.CardStatus.ACTIVE) {
            throw new BusinessException("Card is already active", "CARD_ALREADY_ACTIVE");
        }
        if (card.getStatus() == AccountCard.CardStatus.EXPIRED) {
            throw new BusinessException("Cannot activate an expired card", "CARD_EXPIRED");
        }
        if (card.getAccount().getStatus() != BankAccount.AccountStatus.ACTIVE) {
            throw new BusinessException(
                    "Impossible d'activer la carte : le compte bancaire associe est desactive.",
                    "ACCOUNT_DISABLED", HttpStatus.FORBIDDEN);
        }

        card.setStatus(AccountCard.CardStatus.ACTIVE);
        accountCardRepository.save(card);

        auditService.log(user, "ACTIVATE_CARD", "AccountCard", cardId, "Card activated: " + card.getCardNumberMasked());
        notificationService.send(user, "Carte activee",
                "Votre carte " + card.getCardNumberMasked() + " a ete activee avec succes.",
                Notification.NotificationType.CARD);
    }

    @Transactional
    public void deactivateCard(Long cardId, Long clientId, User user) {
        AccountCard card = accountCardRepository.findByIdAndClientId(cardId, clientId)
                .orElseThrow(() -> new BusinessException("Card not found", "CARD_NOT_FOUND", HttpStatus.NOT_FOUND));

        if (card.getStatus() == AccountCard.CardStatus.DISABLED) {
            throw new BusinessException("Card is already disabled", "CARD_ALREADY_DISABLED");
        }

        card.setStatus(AccountCard.CardStatus.DISABLED);
        accountCardRepository.save(card);

        auditService.log(user, "DEACTIVATE_CARD", "AccountCard", cardId, "Card deactivated: " + card.getCardNumberMasked());
        notificationService.send(user, "Carte desactivee",
                "Votre carte " + card.getCardNumberMasked() + " a ete desactivee.",
                Notification.NotificationType.CARD);
    }

    @Transactional
    public void deleteCard(Long cardId, Long clientId, User user) {
        AccountCard card = accountCardRepository.findByIdAndClientId(cardId, clientId)
                .orElseThrow(() -> new BusinessException("Card not found", "CARD_NOT_FOUND", HttpStatus.NOT_FOUND));

        String masked = card.getCardNumberMasked();
        BigDecimal remainingBalance = card.getBalance();
        BankAccount account = card.getAccount();

        // Transfer any remaining card balance back to the linked bank account before deletion,
        // so the client does not lose funds when supprimant the card.
        if (remainingBalance.compareTo(BigDecimal.ZERO) > 0) {
            account.setBalance(account.getBalance().add(remainingBalance));
            card.setBalance(BigDecimal.ZERO);
            bankAccountRepository.save(account);

            Transaction refundTx = Transaction.builder()
                    .reference(generateCardTxReference())
                    .type(Transaction.TransactionType.CARD_RECHARGE)
                    .status(Transaction.TransactionStatus.EXECUTED)
                    .amount(remainingBalance)
                    .destinationAccount(account)
                    .descriptionText("Restitution solde carte " + masked + " (suppression)")
                    .initiatedBy(user)
                    .executedAt(LocalDateTime.now())
                    .build();
            transactionRepository.save(refundTx);

            auditService.log(user, "CARD_ACCOUNT_TRANSFER", "AccountCard", cardId,
                    "Refund " + remainingBalance + " TND from card " + masked +
                            " to account " + account.getAccountNumber() + " (card deletion, ref " + refundTx.getReference() + ")");
        }

        accountCardRepository.delete(card);

        auditService.log(user, "DELETE_CARD", "AccountCard", cardId,
                "Card deleted: " + masked + (remainingBalance.compareTo(BigDecimal.ZERO) > 0
                        ? " — solde " + remainingBalance + " TND retourne au compte " + account.getAccountNumber()
                        : ""));

        String notifMsg = "Votre carte " + masked + " a ete supprimee.";
        if (remainingBalance.compareTo(BigDecimal.ZERO) > 0) {
            notifMsg += " Le solde restant de " + remainingBalance + " TND a ete retourne sur le compte "
                    + account.getAccountNumber() + ".";
        }
        notificationService.send(user, "Carte supprimee", notifMsg, Notification.NotificationType.CARD);
    }

    private String generateCardNumber() {
        for (int attempt = 0; attempt < 5; attempt++) {
            StringBuilder sb = new StringBuilder(CARD_BIN);
            for (int i = 0; i < 10; i++) {
                sb.append(RANDOM.nextInt(10));
            }
            String candidate = sb.toString();
            String token = tokenHasher.sha256Hex(candidate);
            if (!accountCardRepository.existsByCardToken(token)) {
                return candidate;
            }
        }
        throw new BusinessException("Impossible de generer un numero de carte unique",
                "CARD_GENERATION_FAILED", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    private CardResponse mapToResponse(AccountCard c) {
        return CardResponse.builder()
                .id(c.getId())
                .cardNumberMasked(c.getCardNumberMasked())
                .expiryDate(c.getExpiryDate())
                .status(c.getStatus().name())
                .balance(c.getBalance())
                .accountId(c.getAccount().getId())
                .accountIban(c.getAccount().getIban())
                .createdAt(c.getCreatedAt())
                .build();
    }
}
