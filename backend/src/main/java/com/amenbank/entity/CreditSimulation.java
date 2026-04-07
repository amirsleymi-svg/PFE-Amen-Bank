package com.amenbank.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "credit_simulations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreditSimulation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private User client;

    @Column(nullable = false, precision = 15, scale = 3)
    private BigDecimal amount;

    @Column(name = "duration_months", nullable = false)
    private Integer durationMonths;

    @Column(name = "interest_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal interestRate;

    @Column(name = "monthly_payment", nullable = false, precision = 15, scale = 3)
    private BigDecimal monthlyPayment;

    @Column(name = "total_cost", nullable = false, precision = 15, scale = 3)
    private BigDecimal totalCost;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
