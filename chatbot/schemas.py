from datetime import datetime
from pydantic import BaseModel, Field


# === Requests ===

class SendMessageRequest(BaseModel):
    conversation_id: int | None = None
    message: str = Field(..., min_length=1, max_length=2000)


# === Responses ===

class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    id: int
    title: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConversationDetailResponse(BaseModel):
    id: int
    title: str
    is_active: bool
    messages: list[MessageResponse]
    created_at: datetime
    updated_at: datetime


class ChatResponse(BaseModel):
    conversation_id: int
    message: MessageResponse
