"""Application configuration loaded from environment variables (.env)."""
import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Central settings object. Values are read from the environment / .env file."""

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://username:password@localhost:5432/student_finance",
    )
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
    )

    # Default model used for Groq AI calls.
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


settings = Settings()
