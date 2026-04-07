package com.amenbank.repository;

import com.amenbank.entity.CreditSimulation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CreditSimulationRepository extends JpaRepository<CreditSimulation, Long> {
    List<CreditSimulation> findByClientIdOrderByCreatedAtDesc(Long clientId);
}
