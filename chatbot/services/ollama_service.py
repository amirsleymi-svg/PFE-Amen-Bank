import logging

import httpx

from config import settings

logger = logging.getLogger(__name__)

_FALLBACK_RESPONSE = (
    "Je suis temporairement indisponible. "
    "Veuillez reessayer dans quelques instants ou contacter le service client au +216 71 148 000."
)


async def generate(messages: list[dict[str, str]]) -> str:
    """
    Send messages to Ollama /api/chat and return the assistant response.
    messages format: [{"role": "system"|"user"|"assistant", "content": "..."}]
    """
    # FIX 2: Model selection with fallback
    PRIMARY_MODEL = "mistral"
    FALLBACK_MODEL = settings.OLLAMA_MODEL # existing llama3.2:1b
    
    async def _try_generate(model_name: str) -> str | None:
        payload = {
            "model": model_name,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": 0.1,
                "top_p": 0.9,
                "repeat_penalty": 1.25,
                "num_predict": 400,
                "num_ctx": 8192,
                "stop": ["\nQ:", "\nUser:", "INTERDIT"],
            },
        }
        try:
            async with httpx.AsyncClient(timeout=settings.OLLAMA_TIMEOUT) as client:
                response = await client.post(
                    f"{settings.OLLAMA_BASE_URL}/api/chat",
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
                return data.get("message", {}).get("content", "")
        except httpx.TimeoutException:
            logger.error("Ollama request timed out for model %s", model_name)
            return None
        except Exception as e:
            logger.warning("Ollama generation with model %s failed: %s", model_name, e)
            return None

    # Try Primary
    content = await _try_generate(PRIMARY_MODEL)
    if not content:
        # Fallback to existing
        content = await _try_generate(FALLBACK_MODEL)

    if not content:
        logger.error("All Ollama models failed.")
        return _FALLBACK_RESPONSE
        
    return content
