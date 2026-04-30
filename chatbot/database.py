import logging

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from config import settings

logger = logging.getLogger(__name__)

engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_pre_ping=True)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    """Create chatbot tables if they don't exist."""
    from models import Base
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Chatbot database tables verified/created.")
    except Exception as e:
        logger.error("Could not connect to database: %s", e)
        logger.error("Make sure MySQL/XAMPP is running on port 3306!")


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
