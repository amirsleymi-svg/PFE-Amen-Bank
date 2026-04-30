package com.amenbank.repository;

import com.amenbank.entity.BankAccount;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface BankAccountRepository extends JpaRepository<BankAccount, Long> {
    List<BankAccount> findByClientId(Long clientId);
    Optional<BankAccount> findByAccountNumber(String accountNumber);
    Optional<BankAccount> findByIban(String iban);
    Optional<BankAccount> findByIdAndClientId(Long id, Long clientId);
    boolean existsByAccountNumber(String accountNumber);
    boolean existsByIban(String iban);
    Page<BankAccount> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT COALESCE(SUM(a.balance), 0) FROM BankAccount a WHERE a.status = 'ACTIVE'")
    BigDecimal sumActiveBalances();
}
