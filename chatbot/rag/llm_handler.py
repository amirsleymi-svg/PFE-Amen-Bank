import logging
import json
import requests
from typing import List, Dict, Any, Tuple
from rag.config import settings

logger = logging.getLogger("LLMHandler")

class LLMHandler:
    def __init__(self):
        self.url = f"{settings.ollama.base_url}/api/chat"
        self.system_prompt = (
            "Tu es l'assistant officiel d'Amen Bank. Réponds UNIQUEMENT depuis le contexte fourni.\n"
            "Si l'information est absente, dis exactement:\n"
            "'Je n'ai pas cette information, veuillez contacter Amen Bank directement.'\n"
            "Ne fais aucune supposition. Ne réponds jamais en dehors du contexte."
        )

    def _check_hallucination(self, answer: str, context_chunks: List[str]) -> bool:
        """
        Groundedness check: checks if key terms from the answer exist in context.
        Simple implementation using keyword overlap.
        """
        if not answer or not context_chunks:
            return False
            
        # Basic check: if the answer says "Je n'ai pas cette information", it's grounded in the instruction.
        if "Je n'ai pas cette information" in answer:
            return True

        # Check for significant words in answer that are not in context
        # (This is a simplified guard as requested)
        answer_words = set(answer.lower().split())
        context_words = set(" ".join(context_chunks).lower().split())
        
        # Stop words to ignore
        stop_words = {"le", "la", "les", "un", "une", "des", "du", "de", "et", "ou", "est", "sont"}
        significant_answer_words = {w for w in answer_words if len(w) > 3 and w not in stop_words}
        
        if not significant_answer_words:
            return True
            
        found_words = significant_answer_words.intersection(context_words)
        grounded_ratio = len(found_words) / len(significant_answer_words)
        
        return grounded_ratio > 0.4  # If 40% of key words are found in context

    def generate_answer(self, query: str, context_chunks: List[str]) -> Dict[str, Any]:
        """Call Ollama API to generate grounded answer."""
        context_text = "\n---\n".join(context_chunks)
        
        full_prompt = f"CONTEXTE:\n{context_text}\n\nQUESTION: {query}\n\nRÉPONSE:"
        
        payload = {
            "model": settings.ollama.model,
            "messages": [
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": full_prompt}
            ],
            "options": {
                "temperature": settings.ollama.temperature,
                "top_p": settings.ollama.top_p,
                "num_predict": settings.ollama.max_tokens
            },
            "stream": False
        }

        try:
            logger.info(f"Calling Ollama model: {settings.ollama.model}")
            response = requests.post(self.url, json=payload, timeout=60)
            response.raise_for_status()
            
            result = response.json()
            answer = result.get("message", {}).get("content", "").strip()
            
            grounded = self._check_hallucination(answer, context_chunks)
            confidence = 1.0 if grounded else 0.5
            
            if not grounded and "Je n'ai pas cette information" not in answer:
                logger.warning("Potential hallucination detected. Answer might not be grounded.")
            
            return {
                "answer": answer,
                "grounded": grounded,
                "confidence": confidence
            }
        except Exception as e:
            logger.error(f"Ollama API error: {e}")
            return {
                "answer": "Une erreur technique est survenue. Veuillez réessayer plus tard.",
                "grounded": False,
                "confidence": 0.0
            }
