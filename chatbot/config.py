from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "mysql+aiomysql://root:@localhost:3306/amen_bank"

    # JWT - must match Spring Boot application.yml
    JWT_SECRET: str = "aW1wb3J0YW50LXNlY3JldC1rZXktZm9yLWFtZW4tYmFuay1hcHBsaWNhdGlvbi0yMDI2LXNlY3VyZS1rZXktbXVzdC1iZS1sb25n"

    # Ollama
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    # llama3.2:1b (~1.3 GB) fits on low-memory machines; switch to 3b if you have >=4GB free.
    OLLAMA_MODEL: str = "llama3.2:1b"
    OLLAMA_TIMEOUT: int = 120

    # CORS
    ALLOWED_ORIGINS: str = "https://localhost:4200,http://localhost:4200"

    # Chat
    MAX_HISTORY_MESSAGES: int = 10

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
