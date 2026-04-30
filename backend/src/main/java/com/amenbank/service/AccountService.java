package com.amenbank.service;

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

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final BankAccountRepository bankAccountRepository;
    private final TransactionRepository transactionRepository;

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
