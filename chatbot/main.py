import logging
from contextlib import asynccontextmanager

import httpx
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from auth import ClientAuth, get_current_client
from config import settings
from database import get_db, init_db
from schemas import (
    ChatResponse,
    ConversationDetailResponse,
    ConversationResponse,
    SendMessageRequest,
)
from services import chat_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("amen-chatbot")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Amen Bank Chatbot...")
    logger.info("Ollama URL: %s | Model: %s", settings.OLLAMA_BASE_URL, settings.OLLAMA_MODEL)
    await init_db()

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            models = [m["name"] for m in resp.json().get("models", [])]
            if settings.OLLAMA_MODEL in models:
                logger.info("Ollama OK - model '%s' available", settings.OLLAMA_MODEL)
            else:
                logger.warning(
                    "Ollama running but model '%s' NOT found. Available: %s",
                    settings.OLLAMA_MODEL, models,
                )
    except Exception as e:
        logger.error("Cannot reach Ollama at %s: %s", settings.OLLAMA_BASE_URL, e)

    yield
    logger.info("Shutting down Amen Bank Chatbot...")


app = FastAPI(
    title="Amen Bank Chatbot",
    version="1.1.0",
    description="Assistant virtuel intelligent pour les clients d'Amen Bank",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/chatbot/health")
async def health():
    ollama_ok = False
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            resp = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            models = [m["name"] for m in resp.json().get("models", [])]
            ollama_ok = settings.OLLAMA_MODEL in models
    except Exception:
        pass
    return {
        "status": "ok",
        "service": "amen-bank-chatbot",
        "ollama": {
            "url": settings.OLLAMA_BASE_URL,
            "model": settings.OLLAMA_MODEL,
            "available": ollama_ok,
        },
    }


@app.get("/api/chatbot/conversations", response_model=list[ConversationResponse])
async def list_conversations(
    client: ClientAuth = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    return await chat_service.get_conversations(db, client.user_id)


@app.post("/api/chatbot/conversations", response_model=ConversationResponse)
async def create_conversation(
    client: ClientAuth = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    return await chat_service.create_conversation(db, client.user_id)


@app.get(
    "/api/chatbot/conversations/{conversation_id}",
    response_model=ConversationDetailResponse,
)
async def get_conversation(
    conversation_id: int,
    client: ClientAuth = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    try:
        return await chat_service.get_conversation_detail(
            db, conversation_id, client.user_id
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.delete("/api/chatbot/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: int,
    client: ClientAuth = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    try:
        await chat_service.delete_conversation(db, conversation_id, client.user_id)
        return {"detail": "Conversation supprimee"}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.post("/api/chatbot/chat", response_model=ChatResponse)
async def send_message(
    request: SendMessageRequest,
    client: ClientAuth = Depends(get_current_client),
    db: AsyncSession = Depends(get_db),
):
    try:
        logger.info(
            "Chat request from client %d, conv=%s, msg='%s%s'",
            client.user_id,
            request.conversation_id,
            request.message[:80],
            "..." if len(request.message) > 80 else "",
        )
        result = await chat_service.send_message(
            db, client.user_id, request.conversation_id, request.message
        )
        logger.info("Chat response sent for conv %d", result.conversation_id)
        return result
    except ValueError as e:
        logger.warning("Chat ValueError: %s", e)
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error("Chat error: %s", e, exc_info=True)
        # Expose a short, safe message so the client can understand what happened.
        err_name = type(e).__name__
        detail = f"{err_name}: {str(e)[:180]}" if str(e) else err_name
        raise HTTPException(status_code=500, detail=detail)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        ssl_certfile="ssl/localhost-cert.pem",
        ssl_keyfile="ssl/localhost-key.pem",
    )
