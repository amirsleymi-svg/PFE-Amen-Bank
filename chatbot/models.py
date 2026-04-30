from sqlalchemy import (
    BigInteger, Boolean, Column, DateTime, Enum, ForeignKey, String, Text,
    func,
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class ChatConversation(Base):
    __tablename__ = "chat_conversations"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    # FK to users.id is enforced at the DB level (created by Spring Boot schema).
    # Not declared as SQLAlchemy ForeignKey because we do not map the `users` table here.
    client_id = Column(BigInteger, nullable=False, index=True)
    title = Column(String(200), nullable=False, default="Nouvelle conversation")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    messages = relationship("ChatMessage", back_populates="conversation", cascade="all, delete-orphan", order_by="ChatMessage.created_at")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    conversation_id = Column(BigInteger, ForeignKey("chat_conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(Enum("user", "assistant", name="message_role"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    conversation = relationship("ChatConversation", back_populates="messages")
