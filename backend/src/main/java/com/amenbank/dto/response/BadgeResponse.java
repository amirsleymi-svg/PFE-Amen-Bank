package com.amenbank.dto.response;

import lombok.*;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BadgeResponse {
    private Map<String, Long> counts;
}
