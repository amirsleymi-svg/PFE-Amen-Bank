package com.amenbank.controller;

import com.amenbank.dto.request.*;
import com.amenbank.dto.response.*;
import com.amenbank.dto.response.CardResponse;
import com.amenbank.entity.User;
import com.amenbank.repository.UserRepository;
import com.amenbank.security.UserDetailsImpl;
import com.amenbank.service.AccountService;
import com.amenbank.service.CardService;
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
    private final CardService cardService;
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

    // ===== CARDS =====

    @GetMapping("/cards")
    public ResponseEntity<ApiResponse<List<CardResponse>>> getCards(
            @AuthenticationPrincipal UserDetailsImpl auth) {
        return ResponseEntity.ok(ApiResponse.success("Cards retrieved", cardService.getClientCards(auth.getId())));
    }

    @PostMapping("/cards/request")
    public ResponseEntity<ApiResponse<CardResponse>> requestCard(
            @Valid @RequestBody CreateCardRequest request,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User user = userRepository.findById(auth.getId()).orElseThrow();
        CardResponse card = cardService.requestNewCard(request.getAccountId(), auth.getId(), user);
        return ResponseEntity.ok(ApiResponse.success("Votre carte bancaire est creee avec succes", card));
    }

    @PostMapping("/cards/{id}/transfer")
    public ResponseEntity<ApiResponse<CardResponse>> cardTransfer(
            @PathVariable Long id,
            @Valid @RequestBody CardTransferRequest request,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User user = userRepository.findById(auth.getId()).orElseThrow();
        CardResponse card = cardService.transferBetweenCardAndAccount(id, auth.getId(), request, user);
        return ResponseEntity.ok(ApiResponse.success("Virement effectue", card));
    }

    @PostMapping("/cards/{id}/activate")
    public ResponseEntity<ApiResponse<Void>> activateCard(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User user = userRepository.findById(auth.getId()).orElseThrow();
        cardService.activateCard(id, auth.getId(), user);
        return ResponseEntity.ok(ApiResponse.success("Card activated"));
    }

    @PostMapping("/cards/{id}/deactivate")
    public ResponseEntity<ApiResponse<Void>> deactivateCard(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User user = userRepository.findById(auth.getId()).orElseThrow();
        cardService.deactivateCard(id, auth.getId(), user);
        return ResponseEntity.ok(ApiResponse.success("Card deactivated"));
    }

    @DeleteMapping("/cards/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCard(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User user = userRepository.findById(auth.getId()).orElseThrow();
        cardService.deleteCard(id, auth.getId(), user);
        return ResponseEntity.ok(ApiResponse.success("Card deleted"));
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
