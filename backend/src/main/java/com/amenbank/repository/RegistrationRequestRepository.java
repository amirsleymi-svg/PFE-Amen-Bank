package com.amenbank.repository;

import com.amenbank.entity.RegistrationRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RegistrationRequestRepository extends JpaRepository<RegistrationRequest, Long> {
    Page<RegistrationRequest> findByStatus(RegistrationRequest.RequestStatus status, Pageable pageable);
    boolean existsByEmail(String email);
}
