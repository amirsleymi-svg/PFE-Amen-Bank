package com.amenbank.repository;

import com.amenbank.entity.DailyReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;

public interface DailyReportRepository extends JpaRepository<DailyReport, Long> {
    Page<DailyReport> findByEmployeeIdOrderByReportDateDesc(Long employeeId, Pageable pageable);
    Page<DailyReport> findByStatusOrderByReportDateDesc(DailyReport.ReportStatus status, Pageable pageable);
    Page<DailyReport> findByReportDateBetweenOrderByReportDateDesc(LocalDate from, LocalDate to, Pageable pageable);
    Page<DailyReport> findAllByOrderByReportDateDesc(Pageable pageable);
}
