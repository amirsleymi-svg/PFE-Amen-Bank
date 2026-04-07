package com.amenbank.repository;

import com.amenbank.entity.TwoFactorCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface TwoFactorCodeRepository extends JpaRepository<TwoFactorCode, Long> {
    Optional<TwoFactorCode> findTopByUserIdAndPurposeAndUsedFalseOrderByCreatedAtDesc(
        Long userId, TwoFactorCode.OtpPurpose purpose
    );

    @Modifying
    @Query("UPDATE TwoFactorCode t SET t.used = true WHERE t.user.id = :userId AND t.used = false")
    void invalidateAllByUserId(@Param("userId") Long userId);
}
