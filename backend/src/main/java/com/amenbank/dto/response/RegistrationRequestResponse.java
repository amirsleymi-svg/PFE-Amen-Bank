package com.amenbank.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RegistrationRequestResponse {
    private Long id;
    private String firstName;
    private String lastName;
    private String email;
    private String phone;
    private String status;
    private String reviewedByName;
    private String decisionComment;
    private LocalDateTime reviewedAt;
    private LocalDateTime createdAt;
}
