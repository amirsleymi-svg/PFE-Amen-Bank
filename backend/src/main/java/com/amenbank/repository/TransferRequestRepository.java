package com.amenbank.repository;

import com.amenbank.entity.TransferRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TransferRequestRepository extends JpaRepository<TransferRequest, Long> {
    Page<TransferRequest> findByClientId(Long clientId, Pageable pageable);
    Optional<TransferRequest> findByTransactionId(Long transactionId);
}
