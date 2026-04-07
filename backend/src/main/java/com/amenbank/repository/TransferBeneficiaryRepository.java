package com.amenbank.repository;

import com.amenbank.entity.TransferBeneficiary;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TransferBeneficiaryRepository extends JpaRepository<TransferBeneficiary, Long> {
    List<TransferBeneficiary> findByTransferRequestId(Long transferRequestId);
}
