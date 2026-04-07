package com.amenbank.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class ChatbotRequest {
    @NotBlank(message = "Message is required")
    private String message;
}
