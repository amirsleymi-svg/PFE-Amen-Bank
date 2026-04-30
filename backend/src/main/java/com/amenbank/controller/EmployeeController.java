package com.amenbank.controller;

import com.amenbank.dto.request.DailyReportRequest;
import com.amenbank.dto.request.DecisionRequest;
import com.amenbank.dto.response.*;
import com.amenbank.entity.BankAccount;
import com.amenbank.entity.User;
import com.amenbank.repository.UserRepository;
import com.amenbank.security.UserDetailsImpl;
import com.amenbank.service.CreditService;
import com.amenbank.service.EmployeeService;
import com.amenbank.service.TransferService;
import com.amenbank.repository.BankAccountRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/employee")
@RequiredArgsConstructor
public class EmployeeController {

    private final TransferService transferService;
    private final CreditService creditService;
    private final EmployeeService employeeService;
    private final BankAccountRepository bankAccountRepository;
    private final UserRepository userRepository;

    // ===== TRANSFERS =====

    @GetMapping("/transfers/pending")
    public ResponseEntity<ApiResponse<Page<TransactionResponse>>> getPendingTransfers(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Pending transfers", transferService.getPendingTransfers(pageable)));
    }

    @PostMapping("/transfers/{id}/approve")
    public ResponseEntity<ApiResponse<Void>> approveTransfer(
            @PathVariable Long id,
            @RequestBody(required = false) DecisionRequest request,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User employee = userRepository.findById(auth.getId()).orElseThrow();
        transferService.approveTransfer(id, employee, request != null ? request.getComment() : null);
        return ResponseEntity.ok(ApiResponse.success("Transfer approved"));
    }

    @PostMapping("/transfers/{id}/reject")
    public ResponseEntity<ApiResponse<Void>> rejectTransfer(
            @PathVariable Long id,
            @RequestBody(required = false) DecisionRequest request,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User employee = userRepository.findById(auth.getId()).orElseThrow();
        transferService.rejectTransfer(id, employee, request != null ? request.getComment() : null);
        return ResponseEntity.ok(ApiResponse.success("Transfer rejected"));
    }

    // ===== CREDITS =====

    @GetMapping("/credits/pending")
    public ResponseEntity<ApiResponse<Page<CreditRequestResponse>>> getPendingCredits(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Pending credits", creditService.getPendingCredits(pageable)));
    }

    @PostMapping("/credits/{id}/approve")
    public ResponseEntity<ApiResponse<Void>> approveCredit(
            @PathVariable Long id,
            @RequestBody(required = false) DecisionRequest request,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User employee = userRepository.findById(auth.getId()).orElseThrow();
        creditService.approve(id, employee, request != null ? request.getComment() : null);
        return ResponseEntity.ok(ApiResponse.success("Credit approved"));
    }

    @PostMapping("/credits/{id}/reject")
    public ResponseEntity<ApiResponse<Void>> rejectCredit(
            @PathVariable Long id,
            @RequestBody(required = false) DecisionRequest request,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User employee = userRepository.findById(auth.getId()).orElseThrow();
        creditService.reject(id, employee, request != null ? request.getComment() : null);
        return ResponseEntity.ok(ApiResponse.success("Credit rejected"));
    }

    // ===== CLIENT MANAGEMENT =====

    @PostMapping("/clients/{id}/activate")
    public ResponseEntity<ApiResponse<Void>> activateClient(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User employee = userRepository.findById(auth.getId()).orElseThrow();
        employeeService.activateClient(id, employee);
        return ResponseEntity.ok(ApiResponse.success("Client activated"));
    }

    @PostMapping("/clients/{id}/deactivate")
    public ResponseEntity<ApiResponse<Void>> deactivateClient(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User employee = userRepository.findById(auth.getId()).orElseThrow();
        employeeService.deactivateClient(id, employee);
        return ResponseEntity.ok(ApiResponse.success("Client deactivated"));
    }

    // ===== REPORTS =====

    @PostMapping("/reports/daily")
    public ResponseEntity<ApiResponse<DailyReportResponse>> createDailyReport(
            @Valid @RequestBody DailyReportRequest request,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User employee = userRepository.findById(auth.getId()).orElseThrow();
        return ResponseEntity.ok(ApiResponse.success("Report created", employeeService.createDailyReport(request, employee)));
    }

    @GetMapping("/reports/my")
    public ResponseEntity<ApiResponse<Page<DailyReportResponse>>> getMyReports(
            @AuthenticationPrincipal UserDetailsImpl auth,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Reports retrieved", employeeService.getMyReports(auth.getId(), pageable)));
    }

    @PostMapping("/reports/daily/auto-generate")
    public ResponseEntity<ApiResponse<DailyReportResponse>> autoGenerateDailyReport(
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User employee = userRepository.findById(auth.getId()).orElseThrow();
        java.time.LocalDate date = null;
        if (body != null && body.get("date") != null && !body.get("date").isBlank()) {
            date = java.time.LocalDate.parse(body.get("date"));
        }
        return ResponseEntity.ok(ApiResponse.success("Auto-generated report",
                employeeService.generateAutomaticDailyReport(date, employee)));
    }

    // ===== BALANCE MANAGEMENT =====

    @GetMapping("/clients")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getClientsWithAccounts() {
        List<User> clients = employeeService.getClients();
        List<Map<String, Object>> result = clients.stream()
                .filter(c -> c.getStatus() == User.UserStatus.ACTIVE)
                .map(c -> {
                    List<Map<String, Object>> accounts = bankAccountRepository.findByClientId(c.getId()).stream()
                            .filter(a -> a.getStatus() == BankAccount.AccountStatus.ACTIVE)
                            .map(a -> Map.<String, Object>of("id", a.getId(), "accountNumber", a.getAccountNumber(), "iban", a.getIban(), "balance", a.getBalance()))
                            .collect(Collectors.toList());
                    return Map.<String, Object>of("id", c.getId(),
                            "name", c.getFirstName() + " " + c.getLastName(),
                            "email", c.getEmail() != null ? c.getEmail() : "",
                            "accounts", accounts);
                })
                .filter(m -> !((List<?>) m.get("accounts")).isEmpty())
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success("Clients retrieved", result));
    }

    @PostMapping("/accounts/{id}/increase-balance")
    public ResponseEntity<ApiResponse<Void>> increaseBalance(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal UserDetailsImpl auth) {
        User employee = userRepository.findById(auth.getId()).orElseThrow();
        Object amountObj = request.get("amount");
        if (amountObj == null) {
            throw new com.amenbank.exception.BusinessException("Le montant est requis", "MISSING_AMOUNT");
        }
        BigDecimal amount;
        try {
            amount = new BigDecimal(amountObj.toString());
        } catch (NumberFormatException e) {
            throw new com.amenbank.exception.BusinessException("Montant invalide", "INVALID_AMOUNT");
        }
        employeeService.increaseBalance(id, amount, employee);
        return ResponseEntity.ok(ApiResponse.success("Balance increased"));
    }

}
