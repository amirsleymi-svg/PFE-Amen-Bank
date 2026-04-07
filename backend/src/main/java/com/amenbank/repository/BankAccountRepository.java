package com.amenbank.repository;

import com.amenbank.entity.BankAccount;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface BankAccountRepository extends JpaRepository<BankAccount, Long> {
    List<BankAccount> findByClientId(Long clientId);
    Optional<BankAccount> findByAccountNumber(String accountNumber);
    Optional<BankAccount> findByIban(String iban);
    Optional<BankAccount> findByIdAndClientId(Long id, Long clientId);
    boolean existsByAccountNumber(String accountNumber);
    boolean existsByIban(String iban);
}
