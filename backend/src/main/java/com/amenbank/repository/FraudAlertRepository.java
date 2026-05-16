package com.amenbank.repository;

import com.amenbank.entity.FraudAlert;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;

public interface FraudAlertRepository extends JpaRepository<FraudAlert, Long> {
    Page<FraudAlert> findByStatusOrderByDetectedAtDesc(FraudAlert.AlertStatus status, Pageable pageable);
    Page<FraudAlert> findAllByOrderByDetectedAtDesc(Pageable pageable);
    long countByStatus(FraudAlert.AlertStatus status);
    boolean existsByTransactionIdAndAlertTypeAndStatusIn(
            Long transactionId,
            FraudAlert.AlertType alertType,
            Collection<FraudAlert.AlertStatus> statuses
    );
}
