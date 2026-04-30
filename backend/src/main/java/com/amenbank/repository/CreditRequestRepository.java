package com.amenbank.repository;

import com.amenbank.entity.CreditRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;

public interface CreditRequestRepository extends JpaRepository<CreditRequest, Long> {
    Page<CreditRequest> findByClientId(Long clientId, Pageable pageable);
    Page<CreditRequest> findByStatus(CreditRequest.CreditStatus status, Pageable pageable);
    Page<CreditRequest> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT c FROM CreditRequest c WHERE c.createdAt BETWEEN :from AND :to ORDER BY c.createdAt ASC")
    java.util.List<CreditRequest> findByCreatedAtBetween(
        @Param("from") LocalDateTime from,
        @Param("to") LocalDateTime to
    );

    @Query("SELECT c FROM CreditRequest c WHERE c.reviewedAt BETWEEN :from AND :to ORDER BY c.reviewedAt ASC")
    java.util.List<CreditRequest> findByReviewedAtBetween(
        @Param("from") LocalDateTime from,
        @Param("to") LocalDateTime to
    );
}
