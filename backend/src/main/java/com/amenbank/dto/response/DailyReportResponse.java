package com.amenbank.dto.response;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DailyReportResponse {
    private Long id;
    private String employeeName;
    private LocalDate reportDate;
    private String title;
    private String content;
    private String status;
    private String reviewedByName;
    private String reviewComment;
    private LocalDateTime createdAt;
}
