package com.amenbank.controller;

import com.amenbank.dto.request.*;
import com.amenbank.dto.response.*;
import com.amenbank.entity.User;
import com.amenbank.repository.UserRepository;
import com.amenbank.security.UserDetailsImpl;
import com.amenbank.service.AccountService;
import com.amenbank.service.CreditService;
import com.amenbank.service.TransferService;
import com.amenbank.service.OtpService;
import com.amenbank.entity.TwoFactorCode;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/client")
@RequiredArgsConstructor
public class ClientController {

    private final AccountService accountService;
    private final TransferService transferService;
    private final CreditService creditService;
    private final OtpService otpService;
    private final UserRepository userRepository;

    // ===== ACCOUNTS =====

    @GetMapping("/accounts")
    public ResponseEntity<ApiResponse<List<BankAccountResponse>>> getAccounts(
            @AuthenticationPrincipal UserDetailsImpl auth) {
        return ResponseEntity.ok(ApiResponse.success("Accounts retrieved", accountService.getClientAccounts(auth.getId())));
    }

    @GetMapping("/accounts/{id}/transactions")
    public ResponseEntity<ApiResponse<Page<TransactionResponse>>> getAccountTransactions(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl auth,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Transactions retrieved",
                accountService.getAccountTransactions(id, auth.getId(), pageable)));
    }

    @PostMapping("/accounts/link-card")
    public ResponseEntity<ApiResponse<Void>> linkCard(
            @Valid @RequestBody LinkCardRequest request,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User user = userRepository.findById(auth.getId()).orElseThrow();
        accountService.linkCard(auth.getId(), request, user);
        return ResponseEntity.ok(ApiResponse.success("Card linked successfully"));
    }

    // ===== TRANSFERS =====

    @PostMapping("/transfers/simple")
    public ResponseEntity<ApiResponse<TransactionResponse>> simpleTransfer(
            @Valid @RequestBody SimpleTransferRequest request,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User user = userRepository.findById(auth.getId()).orElseThrow();
        TransactionResponse response = transferService.createSimpleTransfer(auth.getId(), request, user);
        return ResponseEntity.ok(ApiResponse.success("Transfer initiated. Pending approval.", response));
    }

    @PostMapping("/transfers/grouped")
    public ResponseEntity<ApiResponse<TransactionResponse>> groupedTransfer(
            @Valid @RequestBody GroupedTransferRequest request,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User user = userRepository.findById(auth.getId()).orElseThrow();
        TransactionResponse response = transferService.createGroupedTransfer(auth.getId(), request, user);
        return ResponseEntity.ok(ApiResponse.success("Grouped transfer initiated. Pending approval.", response));
    }

    @PostMapping("/transfers/permanent")
    public ResponseEntity<ApiResponse<TransactionResponse>> permanentTransfer(
            @Valid @RequestBody PermanentTransferRequest request,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User user = userRepository.findById(auth.getId()).orElseThrow();
        TransactionResponse response = transferService.createPermanentTransfer(auth.getId(), request, user);
        return ResponseEntity.ok(ApiResponse.success("Permanent transfer initiated. Pending approval.", response));
    }

    @GetMapping("/transfers")
    public ResponseEntity<ApiResponse<Page<TransactionResponse>>> getTransfers(
            @AuthenticationPrincipal UserDetailsImpl auth,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Transfers retrieved",
                transferService.getClientTransfers(auth.getId(), pageable)));
    }

    // ===== TRANSFERS 2FA =====

    @PostMapping("/transfers/request-2fa")
    public ResponseEntity<ApiResponse<Void>> requestTransfer2fa(
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User user = userRepository.findById(auth.getId()).orElseThrow();
        otpService.generateAndSend(user, TwoFactorCode.OtpPurpose.TRANSFER);
        return ResponseEntity.ok(ApiResponse.success("2FA code sent for transfer confirmation"));
    }

    // ===== CREDITS =====

    @PostMapping("/credits/simulate")
    public ResponseEntity<ApiResponse<CreditSimulationResponse>> simulateCredit(
            @Valid @RequestBody CreditSimulationRequest request,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User user = userRepository.findById(auth.getId()).orElseThrow();
        return ResponseEntity.ok(ApiResponse.success("Simulation completed", creditService.simulate(request, user)));
    }

    @PostMapping("/credits/request")
    public ResponseEntity<ApiResponse<CreditRequestResponse>> requestCredit(
            @Valid @RequestBody CreditRequestDto request,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User user = userRepository.findById(auth.getId()).orElseThrow();
        return ResponseEntity.ok(ApiResponse.success("Credit request submitted", creditService.createRequest(request, user)));
    }

    @GetMapping("/credits")
    public ResponseEntity<ApiResponse<Page<CreditRequestResponse>>> getCredits(
            @AuthenticationPrincipal UserDetailsImpl auth,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Credits retrieved", creditService.getClientCredits(auth.getId(), pageable)));
    }
}
