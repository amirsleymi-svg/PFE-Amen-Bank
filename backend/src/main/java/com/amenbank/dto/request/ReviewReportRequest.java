package com.amenbank.dto.request;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class ReviewReportRequest {
    private String comment;
    private Integer rating;
}
