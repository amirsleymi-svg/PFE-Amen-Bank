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
    payload = {
        "model": settings.OLLAMA_MODEL,
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
            content = data.get("message", {}).get("content", "")
            if not content:
                logger.warning("Ollama returned empty content: %s", data)
                return _FALLBACK_RESPONSE
            return content

    except httpx.ConnectError:
        logger.error("Cannot connect to Ollama at %s", settings.OLLAMA_BASE_URL)
        return _FALLBACK_RESPONSE
    except httpx.TimeoutException:
        logger.error("Ollama request timed out after %ds", settings.OLLAMA_TIMEOUT)
        return "Ma reponse prend trop de temps. Veuillez reformuler votre question plus simplement."
    except httpx.HTTPStatusError as e:
        logger.error("Ollama HTTP error %d: %s", e.response.status_code, e.response.text)
        return _FALLBACK_RESPONSE
    except Exception as e:
        logger.error("Unexpected Ollama error: %s", e)
        return _FALLBACK_RESPONSE
