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

    @Query("SELECT COUNT(t) FROM Transaction t WHERE t.sourceAccount.id = :accountId AND t.createdAt >= :since")
    long countBySourceAccountSince(@Param("accountId") Long accountId, @Param("since") LocalDateTime since);

    @Query("SELECT t FROM Transaction t WHERE t.sourceAccount.id = :accountId AND t.createdAt >= :since ORDER BY t.createdAt DESC")
    java.util.List<Transaction> findRecentBySourceAccountSince(
        @Param("accountId") Long accountId,
        @Param("since") LocalDateTime since
    );

    @Query("SELECT COUNT(t) FROM Transaction t WHERE t.initiatedBy.id = :userId AND t.destinationExternalIban = :iban AND t.id <> :transactionId")
    long countPreviousExternalDestinationUsage(
        @Param("userId") Long userId,
        @Param("iban") String iban,
        @Param("transactionId") Long transactionId
    );

    @Query("SELECT t FROM Transaction t WHERE t.type IN :types ORDER BY t.createdAt DESC")
    Page<Transaction> findByTypeIn(@Param("types") java.util.List<Transaction.TransactionType> types, Pageable pageable);

    @Query("SELECT t FROM Transaction t WHERE t.status = :status AND t.type IN :types ORDER BY t.createdAt DESC")
    Page<Transaction> findByStatusAndTypeInOrdered(
        @Param("status") Transaction.TransactionStatus status,
        @Param("types") java.util.List<Transaction.TransactionType> types,
        Pageable pageable
    );

    @Query("SELECT t FROM Transaction t WHERE t.status IN :statuses AND t.sourceAccount.id IN :accountIds")
    java.util.List<Transaction> findByStatusInAndSourceAccountIds(
        @Param("statuses") java.util.List<Transaction.TransactionStatus> statuses,
        @Param("accountIds") java.util.List<Long> accountIds
    );

    @Query("SELECT COUNT(t) FROM Transaction t WHERE t.status = :status AND t.type IN :types")
    long countByStatusAndTypeIn(
        @Param("status") Transaction.TransactionStatus status,
        @Param("types") java.util.List<Transaction.TransactionType> types
    );

    @Query("SELECT COUNT(t) FROM Transaction t WHERE t.status = :status AND t.type IN :types AND t.amount >= :minAmount")
    long countByStatusAndTypeInAndAmountGreaterThanEqual(
        @Param("status") Transaction.TransactionStatus status,
        @Param("types") java.util.List<Transaction.TransactionType> types,
        @Param("minAmount") java.math.BigDecimal minAmount
    );

    @Query("SELECT t FROM Transaction t WHERE t.type IN :types AND t.createdAt BETWEEN :from AND :to ORDER BY t.createdAt ASC")
    java.util.List<Transaction> findByTypeInAndCreatedAtBetween(
        @Param("types") java.util.List<Transaction.TransactionType> types,
        @Param("from") LocalDateTime from,
        @Param("to") LocalDateTime to
    );
}
