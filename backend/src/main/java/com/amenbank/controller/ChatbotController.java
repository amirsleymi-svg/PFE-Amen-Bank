package com.amenbank.controller;

import com.amenbank.chatbot.ChatbotService;
import com.amenbank.dto.request.ChatbotRequest;
import com.amenbank.dto.response.ApiResponse;
import com.amenbank.dto.response.ChatbotResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chatbot")
@RequiredArgsConstructor
public class ChatbotController {

    private final ChatbotService chatbotService;

    @PostMapping("/message")
    public ResponseEntity<ApiResponse<ChatbotResponse>> chat(@Valid @RequestBody ChatbotRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Response generated", chatbotService.chat(request)));
    }

    @GetMapping("/suggestions")
    public ResponseEntity<ApiResponse<List<String>>> getSuggestions() {
        return ResponseEntity.ok(ApiResponse.success("Suggestions retrieved", chatbotService.getSuggestions()));
    }
}
