package com.amenbank.notification;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BadgeRefreshEvent {
    @Builder.Default
    private String type = "badge:refresh";
}
