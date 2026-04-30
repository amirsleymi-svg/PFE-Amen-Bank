package com.amenbank.repository;

import com.amenbank.entity.PasswordResetRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface PasswordResetRequestRepository extends JpaRepository<PasswordResetRequest, Long> {
    Page<PasswordResetRequest> findByStatus(PasswordResetRequest.ResetStatus status, Pageable pageable);
    Page<PasswordResetRequest> findByUserId(Long userId, Pageable pageable);

    long countByStatus(PasswordResetRequest.ResetStatus status);
    long countByCreatedAtAfter(LocalDateTime after);

    Optional<PasswordResetRequest> findFirstByUserIdAndStatusOrderByCreatedAtDesc(
            Long userId, PasswordResetRequest.ResetStatus status);
}
