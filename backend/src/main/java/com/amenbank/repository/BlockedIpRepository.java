package com.amenbank.repository;

import com.amenbank.entity.BlockedIp;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BlockedIpRepository extends JpaRepository<BlockedIp, Long> {
    Optional<BlockedIp> findByIpAddressAndActiveTrue(String ipAddress);
    boolean existsByIpAddressAndActiveTrue(String ipAddress);
    List<BlockedIp> findByActiveTrueOrderByBlockedAtDesc();
}
