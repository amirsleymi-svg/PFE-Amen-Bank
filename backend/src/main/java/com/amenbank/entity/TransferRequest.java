package com.amenbank.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "transfer_requests")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TransferRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_id", nullable = false, unique = true)
    private Transaction transaction;

    @Enumerated(EnumType.STRING)
    @Column(name = "transfer_type", nullable = false, length = 15)
    private TransferType transferType;

    @Column(name = "requires_2fa_confirmation", nullable = false)
    @Builder.Default
    private Boolean requires2faConfirmation = true;

    @Column(name = "two_fa_confirmed", nullable = false)
    @Builder.Default
    private Boolean twoFaConfirmed = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private User client;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum TransferType {
        SIMPLE, GROUPED, PERMANENT
    }
}
