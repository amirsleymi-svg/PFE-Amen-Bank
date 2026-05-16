package com.amenbank.repository;

import com.amenbank.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    Page<AuditLog> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
    Page<AuditLog> findByActionOrderByCreatedAtDesc(String action, Pageable pageable);
    Page<AuditLog> findByCreatedAtBetweenOrderByCreatedAtDesc(LocalDateTime from, LocalDateTime to, Pageable pageable);
    Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT a FROM AuditLog a WHERE a.action = :action AND a.createdAt BETWEEN :from AND :to ORDER BY a.createdAt ASC")
    List<AuditLog> findByActionAndCreatedAtBetween(
        @Param("action") String action,
        @Param("from") LocalDateTime from,
        @Param("to") LocalDateTime to
    );

    @Query("SELECT a FROM AuditLog a WHERE a.action IN :actions ORDER BY a.createdAt DESC")
    Page<AuditLog> findByActionIn(@Param("actions") Collection<String> actions, Pageable pageable);

    @Query("SELECT a FROM AuditLog a WHERE a.action IN :actions AND a.createdAt >= :since ORDER BY a.createdAt DESC")
    List<AuditLog> findByActionInSince(@Param("actions") Collection<String> actions,
                                       @Param("since") LocalDateTime since);

    @Query("SELECT COUNT(a) FROM AuditLog a WHERE a.user.id = :userId AND a.action = :action AND a.createdAt >= :since")
    long countByUserIdAndActionSince(@Param("userId") Long userId,
                                     @Param("action") String action,
                                     @Param("since") LocalDateTime since);

    long countByIsReadFalse();

    @Query("SELECT COUNT(a) FROM AuditLog a WHERE a.action IN :actions AND a.isRead = false")
    long countByActionInAndIsReadFalse(@Param("actions") Collection<String> actions);

    @Query("""
            SELECT COUNT(a) FROM AuditLog a
            WHERE a.isRead = false AND (
                UPPER(a.action) LIKE '%REGISTRATION%' OR
                UPPER(a.action) LIKE '%TRANSFER%' OR
                UPPER(a.action) LIKE '%CREDIT%' OR
                UPPER(a.action) LIKE '%PASSWORD_RESET%' OR
                UPPER(a.action) LIKE '%FRAUD%' OR
                UPPER(a.action) LIKE '%INCREASE_BALANCE%' OR
                UPPER(a.action) LIKE '%CARD%' OR
                UPPER(a.action) LIKE '%SECURITY%' OR
                UPPER(a.action) LIKE '%LOCK%' OR
                UPPER(a.action) LIKE '%DISABLE%' OR
                UPPER(a.action) LIKE '%FREEZE%'
            )
            """)
    long countUnreadImportant();

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @Query("UPDATE AuditLog a SET a.isRead = true WHERE a.isRead = false")
    void markAllAsRead();
}
