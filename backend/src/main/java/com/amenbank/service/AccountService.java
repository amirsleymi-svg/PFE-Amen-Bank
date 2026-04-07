package com.amenbank.service;

import com.amenbank.audit.AuditService;
import com.amenbank.dto.request.LinkCardRequest;
import com.amenbank.dto.response.BankAccountResponse;
import com.amenbank.dto.response.TransactionResponse;
import com.amenbank.entity.*;
import com.amenbank.exception.BusinessException;
import com.amenbank.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final BankAccountRepository bankAccountRepository;
    private final AccountCardRepository accountCardRepository;
    private final TransactionRepository transactionRepository;
    private final AuditService auditService;

    public List<BankAccountResponse> getClientAccounts(Long clientId) {
        return bankAccountRepository.findByClientId(clientId).stream()
                .map(this::mapAccountToResponse)
                .collect(Collectors.toList());
    }

    public Page<TransactionResponse> getAccountTransactions(Long accountId, Long clientId, Pageable pageable) {
        BankAccount account = bankAccountRepository.findByIdAndClientId(accountId, clientId)
                .orElseThrow(() -> new BusinessException("Account not found", "ACCOUNT_NOT_FOUND", HttpStatus.NOT_FOUND));

        return transactionRepository
                .findBySourceAccountIdOrDestinationAccountId(account.getId(), account.getId(), pageable)
                .map(this::mapTransactionToResponse);
    }

    public Page<TransactionResponse> getClientTransactions(Long clientId, Pageable pageable) {
        List<Long> accountIds = bankAccountRepository.findByClientId(clientId).stream()
                .map(BankAccount::getId).collect(Collectors.toList());

        if (accountIds.isEmpty()) {
            return Page.empty(pageable);
        }

        return transactionRepository.findByAccountIds(accountIds, pageable)
                .map(this::mapTransactionToResponse);
    }

    @Transactional
    public void linkCard(Long clientId, LinkCardRequest request, User user) {
        BankAccount account = bankAccountRepository.findByIdAndClientId(request.getAccountId(), clientId)
                .orElseThrow(() -> new BusinessException("Account not found", "ACCOUNT_NOT_FOUND", HttpStatus.NOT_FOUND));

        // Mask card number: show only last 4 digits
        String cardNumber = request.getCardNumber().replaceAll("\\s+", "");
        if (cardNumber.length() < 13 || cardNumber.length() > 19) {
            throw new BusinessException("Invalid card number", "INVALID_CARD");
        }

        String masked = "**** **** **** " + cardNumber.substring(cardNumber.length() - 4);
        String token = generateCardToken(cardNumber);

        // Parse expiry date
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MM/yy");
        LocalDate expiry = LocalDate.parse("01/" + request.getExpiryDate(),
                DateTimeFormatter.ofPattern("dd/MM/yy")).withDayOfMonth(1).plusMonths(1).minusDays(1);

        if (expiry.isBefore(LocalDate.now())) {
            throw new BusinessException("Card is expired", "CARD_EXPIRED");
        }

        if (accountCardRepository.existsByCardToken(token)) {
            throw new BusinessException("Card already linked", "CARD_ALREADY_LINKED");
        }

        AccountCard card = AccountCard.builder()
                .cardNumberMasked(masked)
                .cardToken(token)
                .expiryDate(expiry)
                .client(user)
                .account(account)
                .build();
        accountCardRepository.save(card);

        auditService.log(user, "LINK_CARD", "AccountCard", card.getId(),
                "Card linked to account " + account.getAccountNumber());
    }

    private String generateCardToken(String cardNumber) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest((cardNumber + UUID.randomUUID()).getBytes());
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            return UUID.randomUUID().toString();
        }
    }

    private BankAccountResponse mapAccountToResponse(BankAccount a) {
        return BankAccountResponse.builder()
                .id(a.getId())
                .accountNumber(a.getAccountNumber())
                .iban(a.getIban())
                .balance(a.getBalance())
                .currency(a.getCurrency())
                .status(a.getStatus().name())
                .createdAt(a.getCreatedAt())
                .build();
    }

    private TransactionResponse mapTransactionToResponse(Transaction t) {
        return TransactionResponse.builder()
                .id(t.getId())
                .reference(t.getReference())
                .type(t.getType().name())
                .status(t.getStatus().name())
                .amount(t.getAmount())
                .currency(t.getCurrency())
                .sourceAccountIban(t.getSourceAccount() != null ? t.getSourceAccount().getIban() : null)
                .destinationAccountIban(t.getDestinationAccount() != null ? t.getDestinationAccount().getIban() : null)
                .destinationExternalIban(t.getDestinationExternalIban())
                .description(t.getDescriptionText())
                .initiatedByName(t.getInitiatedBy().getFirstName() + " " + t.getInitiatedBy().getLastName())
                .approvedByName(t.getApprovedBy() != null ? t.getApprovedBy().getFirstName() + " " + t.getApprovedBy().getLastName() : null)
                .executedAt(t.getExecutedAt())
                .createdAt(t.getCreatedAt())
                .build();
    }
}
