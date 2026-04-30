package com.amenbank.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CreateCardRequest {

    @NotNull(message = "Account ID is required")
    private Long accountId;
}
