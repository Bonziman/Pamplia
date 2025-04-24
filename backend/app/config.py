from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str  # Automatically maps to DATABASE_URL from .env
    secret_key: str  # Add this line to load the secret key

    class Config:
        env_file = ".env"

settings = Settings()  #  This line makes the instance available for import
