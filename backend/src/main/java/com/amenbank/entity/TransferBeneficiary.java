package com.amenbank.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "transfer_beneficiaries")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TransferBeneficiary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transfer_request_id", nullable = false)
    private TransferRequest transferRequest;

    @Column(name = "beneficiary_name", nullable = false, length = 200)
    private String beneficiaryName;

    @Column(name = "beneficiary_iban", nullable = false, length = 34)
    private String beneficiaryIban;

    @Column(nullable = false, precision = 15, scale = 3)
    private BigDecimal amount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destination_account_id")
    private BankAccount destinationAccount;
}
