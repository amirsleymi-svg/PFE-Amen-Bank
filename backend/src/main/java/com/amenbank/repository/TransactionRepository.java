package com.amenbank.repository;

import com.amenbank.entity.Transaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    Page<Transaction> findBySourceAccountIdOrDestinationAccountId(Long sourceId, Long destId, Pageable pageable);

    @Query("SELECT t FROM Transaction t WHERE t.sourceAccount.id IN :accountIds OR t.destinationAccount.id IN :accountIds")
    Page<Transaction> findByAccountIds(@Param("accountIds") java.util.List<Long> accountIds, Pageable pageable);

    Page<Transaction> findByStatus(Transaction.TransactionStatus status, Pageable pageable);
    Page<Transaction> findByType(Transaction.TransactionType type, Pageable pageable);

    @Query("SELECT t FROM Transaction t WHERE t.status = :status AND t.type IN :types")
    Page<Transaction> findByStatusAndTypeIn(
        @Param("status") Transaction.TransactionStatus status,
        @Param("types") java.util.List<Transaction.TransactionType> types,
        Pageable pageable
    );

    @Query("SELECT t FROM Transaction t WHERE (t.sourceAccount.id IN :accountIds OR t.destinationAccount.id IN :accountIds) " +
           "AND t.createdAt BETWEEN :from AND :to")
    Page<Transaction> findByAccountIdsAndDateRange(
        @Param("accountIds") java.util.List<Long> accountIds,
        @Param("from") LocalDateTime from,
        @Param("to") LocalDateTime to,
        Pageable pageable
    );

    boolean existsByReference(String reference);
}
