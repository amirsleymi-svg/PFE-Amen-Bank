package com.amenbank.repository;

import com.amenbank.entity.TransferRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TransferRequestRepository extends JpaRepository<TransferRequest, Long> {
    Page<TransferRequest> findByClientId(Long clientId, Pageable pageable);
}
