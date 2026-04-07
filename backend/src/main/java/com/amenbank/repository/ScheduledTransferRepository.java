package com.amenbank.repository;

import com.amenbank.entity.ScheduledTransfer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface ScheduledTransferRepository extends JpaRepository<ScheduledTransfer, Long> {
    List<ScheduledTransfer> findByIsActiveTrueAndNextExecutionDateLessThanEqual(LocalDate date);
    List<ScheduledTransfer> findBySourceAccountClientId(Long clientId);
}
