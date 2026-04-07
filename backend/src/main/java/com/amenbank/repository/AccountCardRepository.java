package com.amenbank.repository;

import com.amenbank.entity.AccountCard;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AccountCardRepository extends JpaRepository<AccountCard, Long> {
    List<AccountCard> findByClientId(Long clientId);
    List<AccountCard> findByAccountId(Long accountId);
    Optional<AccountCard> findByCardToken(String cardToken);
    boolean existsByCardToken(String cardToken);
}
