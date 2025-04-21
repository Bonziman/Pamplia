from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str  # Automatically maps to DATABASE_URL from .env

    class Config:
        env_file = ".env"

settings = Settings()  # 👈 This line makes the instance available for import
