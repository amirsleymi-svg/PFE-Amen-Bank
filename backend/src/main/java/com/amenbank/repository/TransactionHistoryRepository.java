package com.amenbank.repository;

import com.amenbank.entity.TransactionHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TransactionHistoryRepository extends JpaRepository<TransactionHistory, Long> {
    List<TransactionHistory> findByTransactionIdOrderByChangedAtDesc(Long transactionId);
}
