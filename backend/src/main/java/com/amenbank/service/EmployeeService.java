package com.amenbank.service;

import com.amenbank.audit.AuditService;
import com.amenbank.dto.request.DailyReportRequest;
import com.amenbank.dto.response.DailyReportResponse;
import com.amenbank.entity.DailyReport;
import com.amenbank.entity.User;
import com.amenbank.exception.BusinessException;
import com.amenbank.repository.DailyReportRepository;
import com.amenbank.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final DailyReportRepository dailyReportRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    @Transactional
    public DailyReportResponse createDailyReport(DailyReportRequest request, User employee) {
        DailyReport report = DailyReport.builder()
                .employee(employee)
                .reportDate(request.getReportDate())
                .title(request.getTitle())
                .content(request.getContent())
                .status(DailyReport.ReportStatus.SUBMITTED)
                .build();
        dailyReportRepository.save(report);

        auditService.log(employee, "CREATE_DAILY_REPORT", "DailyReport", report.getId(),
                "Daily report for " + request.getReportDate());

        return mapToResponse(report);
    }

    public Page<DailyReportResponse> getMyReports(Long employeeId, Pageable pageable) {
        return dailyReportRepository.findByEmployeeIdOrderByReportDateDesc(employeeId, pageable)
                .map(this::mapToResponse);
    }

    @Transactional
    public void activateClient(Long clientId, User employee) {
        User client = userRepository.findById(clientId)
                .orElseThrow(() -> new BusinessException("Client not found", "USER_NOT_FOUND", HttpStatus.NOT_FOUND));
        if (!"CLIENT".equals(client.getRole().getName())) {
            throw new BusinessException("User is not a client", "NOT_CLIENT");
        }
        client.setStatus(User.UserStatus.ACTIVE);
        client.setFailedLoginAttempts(0);
        client.setLockedUntil(null);
        userRepository.save(client);
        auditService.log(employee, "EMPLOYEE_ACTIVATE_CLIENT", "User", clientId, "Employee activated client account");
    }

    @Transactional
    public void deactivateClient(Long clientId, User employee) {
        User client = userRepository.findById(clientId)
                .orElseThrow(() -> new BusinessException("Client not found", "USER_NOT_FOUND", HttpStatus.NOT_FOUND));
        if (!"CLIENT".equals(client.getRole().getName())) {
            throw new BusinessException("User is not a client", "NOT_CLIENT");
        }
        client.setStatus(User.UserStatus.DISABLED);
        userRepository.save(client);
        auditService.log(employee, "EMPLOYEE_DEACTIVATE_CLIENT", "User", clientId, "Employee deactivated client account");
    }

    private DailyReportResponse mapToResponse(DailyReport r) {
        return DailyReportResponse.builder()
                .id(r.getId())
                .employeeName(r.getEmployee().getFirstName() + " " + r.getEmployee().getLastName())
                .reportDate(r.getReportDate())
                .title(r.getTitle())
                .content(r.getContent())
                .status(r.getStatus().name())
                .reviewedByName(r.getReviewedBy() != null ? r.getReviewedBy().getFirstName() + " " + r.getReviewedBy().getLastName() : null)
                .reviewComment(r.getReviewComment())
                .createdAt(r.getCreatedAt())
                .build();
    }
}
