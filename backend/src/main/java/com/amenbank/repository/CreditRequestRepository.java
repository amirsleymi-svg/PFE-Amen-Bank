package com.amenbank.repository;

import com.amenbank.entity.CreditRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CreditRequestRepository extends JpaRepository<CreditRequest, Long> {
    Page<CreditRequest> findByClientId(Long clientId, Pageable pageable);
    Page<CreditRequest> findByStatus(CreditRequest.CreditStatus status, Pageable pageable);
}
