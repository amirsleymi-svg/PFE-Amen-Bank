import logging

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from config import settings
from models import ChatConversation, ChatMessage
from schemas import (
    ChatResponse,
    ConversationDetailResponse,
    ConversationResponse,
    MessageResponse,
)
from services import client_context, faq_matcher, ollama_service

logger = logging.getLogger(__name__)


async def get_conversations(db: AsyncSession, client_id: int) -> list[ConversationResponse]:
    result = await db.execute(
        select(ChatConversation)
        .where(
            ChatConversation.client_id == client_id,
            ChatConversation.is_active == True,
        )
        .order_by(ChatConversation.updated_at.desc())
    )
    conversations = result.scalars().all()
    return [ConversationResponse.model_validate(c) for c in conversations]


async def get_conversation_detail(
    db: AsyncSession, conversation_id: int, client_id: int
) -> ConversationDetailResponse:
    result = await db.execute(
        select(ChatConversation)
        .options(selectinload(ChatConversation.messages))
        .where(
            ChatConversation.id == conversation_id,
            ChatConversation.client_id == client_id,
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise ValueError("Conversation introuvable")

    return ConversationDetailResponse(
        id=conv.id,
        title=conv.title,
        is_active=conv.is_active,
        messages=[MessageResponse.model_validate(m) for m in conv.messages],
        created_at=conv.created_at,
        updated_at=conv.updated_at,
    )


async def create_conversation(
    db: AsyncSession, client_id: int, title: str | None = None
) -> ConversationResponse:
    conv = ChatConversation(
        client_id=client_id,
        title=title or "Nouvelle conversation",
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return ConversationResponse.model_validate(conv)


async def delete_conversation(
    db: AsyncSession, conversation_id: int, client_id: int
) -> None:
    result = await db.execute(
        select(ChatConversation).where(
            ChatConversation.id == conversation_id,
            ChatConversation.client_id == client_id,
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise ValueError("Conversation introuvable")

    await db.delete(conv)
    await db.commit()


async def send_message(
    db: AsyncSession, client_id: int, conversation_id: int | None, user_message: str
) -> ChatResponse:
    # 1. Create or fetch conversation
    if conversation_id is None:
        title = user_message[:50] + ("..." if len(user_message) > 50 else "")
        conv = ChatConversation(client_id=client_id, title=title)
        db.add(conv)
        await db.commit()
        await db.refresh(conv)
        conversation_id = conv.id
    else:
        result = await db.execute(
            select(ChatConversation).where(
                ChatConversation.id == conversation_id,
                ChatConversation.client_id == client_id,
            )
        )
        conv = result.scalar_one_or_none()
        if not conv:
            raise ValueError("Conversation introuvable")

    # 2. Save user message
    user_msg = ChatMessage(
        conversation_id=conversation_id,
        role="user",
        content=user_message,
    )
    db.add(user_msg)
    await db.commit()
    await db.refresh(user_msg)

    # 3. Build context from real client data.
    client_data: dict = {}
    rag_context = ""
    system_prompt = ""
    try:
        client_data = await client_context.gather_client_context(db, client_id)
        rag_context = client_context.build_rag_context(client_data, user_message)
        system_prompt = client_context.build_system_prompt(client_data, rag_context)
    except Exception as e:
        logger.warning("Could not gather client context: %s", e)
        system_prompt = client_context.build_system_prompt({})

    # 4. Try deterministic answer first for high-quality answers on frequent intents.
    assistant_content = faq_matcher.try_answer(user_message, client_data)
    if assistant_content is None:
        # 5. Fallback to Ollama for open questions.
        history_result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.conversation_id == conversation_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(settings.MAX_HISTORY_MESSAGES)
        )
        history_msgs = list(reversed(history_result.scalars().all()))

        ollama_messages = [{"role": "system", "content": system_prompt}]
        for m in history_msgs:
            ollama_messages.append({"role": m.role, "content": m.content})

        # >>> RAG AMEN BANK — START
        try:
            from rag.rag_db_query import get_db_context
            from rag.rag_prompt_builder import build_prompt
            _db_context = await get_db_context(user_message, client_id)
            final_prompt = build_prompt(user_message, _db_context)
        except Exception:
            final_prompt = user_message  # silent fallback
        # >>> RAG AMEN BANK — END
        ollama_messages[-1]["content"] = final_prompt # Pass final_prompt to Ollama instead of user_message

        assistant_content = await ollama_service.generate(ollama_messages)

    # 6. Verify conversation still exists (client may have deleted it mid-flight)
    still_exists = await db.execute(
        select(ChatConversation.id).where(
            ChatConversation.id == conversation_id,
            ChatConversation.client_id == client_id,
        )
    )
    if still_exists.scalar_one_or_none() is None:
        return ChatResponse(
            conversation_id=conversation_id,
            message=MessageResponse(
                id=0,
                role="assistant",
                content=assistant_content,
                created_at=user_msg.created_at,
            ),
        )

    # 7. Save assistant response
    assistant_msg = ChatMessage(
        conversation_id=conversation_id,
        role="assistant",
        content=assistant_content,
    )
    db.add(assistant_msg)
    try:
        await db.commit()
        await db.refresh(assistant_msg)
    except IntegrityError:
        await db.rollback()
        return ChatResponse(
            conversation_id=conversation_id,
            message=MessageResponse(
                id=0,
                role="assistant",
                content=assistant_content,
                created_at=user_msg.created_at,
            ),
        )

    return ChatResponse(
        conversation_id=conversation_id,
        message=MessageResponse.model_validate(assistant_msg),
    )
