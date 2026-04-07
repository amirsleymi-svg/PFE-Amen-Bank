package com.amenbank.chatbot;

import com.amenbank.dto.request.ChatbotRequest;
import com.amenbank.dto.response.ChatbotResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class ChatbotService {

    private final WebClient webClient;
    private final String model;

    private static final String SYSTEM_PROMPT = """
        Tu es l'assistant virtuel d'Amen Bank, une banque tunisienne.
        Tu reponds en francais. Tu es poli, professionnel et concis.
        Tu peux aider les clients avec:
        - Les questions sur leurs comptes bancaires
        - Les virements (simples, groupes, permanents)
        - Les demandes de credit et simulations
        - La liaison de carte bancaire
        - Les problemes de connexion et securite
        - Les informations generales sur les services Amen Bank
        Si tu ne connais pas la reponse, oriente le client vers un conseiller.
        Ne donne jamais d'informations sensibles comme des mots de passe ou des numeros de compte.
        """;

    public ChatbotService(
            @Value("${app.chatbot.ollama-url}") String ollamaUrl,
            @Value("${app.chatbot.model}") String model) {
        this.webClient = WebClient.builder().baseUrl(ollamaUrl).build();
        this.model = model;
    }

    public ChatbotResponse chat(ChatbotRequest request) {
        try {
            Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                    Map.of("role", "system", "content", SYSTEM_PROMPT),
                    Map.of("role", "user", "content", request.getMessage())
                ),
                "stream", false
            );

            Map response = webClient.post()
                    .uri("/api/chat")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(60))
                    .block();

            if (response != null && response.containsKey("message")) {
                Map message = (Map) response.get("message");
                String content = (String) message.get("content");
                return ChatbotResponse.builder().reply(content).build();
            }

            return ChatbotResponse.builder()
                    .reply("Desole, je n'ai pas pu traiter votre demande. Veuillez reessayer.")
                    .build();

        } catch (Exception e) {
            log.error("Chatbot error: {}", e.getMessage());
            return ChatbotResponse.builder()
                    .reply("Le service d'assistance est temporairement indisponible. Veuillez reessayer plus tard.")
                    .build();
        }
    }

    public List<String> getSuggestions() {
        return List.of(
            "Comment consulter mon solde ?",
            "Comment effectuer un virement ?",
            "Comment simuler un credit ?",
            "Comment lier ma carte bancaire ?",
            "J'ai oublie mon mot de passe",
            "Comment contacter un conseiller ?"
        );
    }
}
